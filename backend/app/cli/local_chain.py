"""Local-only Anvil administration. Never supports a paid/public chain.

Run from backend: .venv/bin/python -m app.cli.local_chain deploy
Then: authorize-registrar USERNAME; fund ADDRESS; anchor ULPIN --evidence REFERENCE
"""
import argparse
import json
from pathlib import Path

from web3 import Web3

from ..auth.repository import AuthRepository
from ..config import get_settings
from ..chain.service import ownership_state,state_hash,linked_wallet,hexhash


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--demo',action='store_true',help='Use the isolated local demo database')
    commands=parser.add_subparsers(dest='command',required=True)
    commands.add_parser('deploy')
    authorize=commands.add_parser('authorize-registrar');authorize.add_argument('username')
    fund=commands.add_parser('fund');fund.add_argument('address')
    anchor=commands.add_parser('anchor');anchor.add_argument('parcel_id');anchor.add_argument('--evidence',required=True)
    args=parser.parse_args();settings=get_settings()
    if args.demo:
        from psycopg.conninfo import make_conninfo
        schema=Path('/private/tmp/titlelock_demo_schema').read_text().strip()
        settings=settings.model_copy(update={'database_url':make_conninfo(settings.database_url.rsplit('/',1)[0]+'/titlelock_auth_test',options=f'-c search_path={schema}')})
    w3=Web3(Web3.HTTPProvider(settings.chain_rpc_url,request_kwargs={'timeout':5}))
    if settings.chain_id!=31337 or w3.eth.chain_id!=31337:
        parser.error('Only local chain 31337 is supported')
    admin=w3.eth.accounts[0]  # Anvil's unlocked local-only development account.
    if args.command=='deploy':
        artifact=json.loads((Path(__file__).parents[3]/'blockchain/out/TitleLockRegistry.sol/TitleLockRegistry.json').read_text())
        factory=w3.eth.contract(abi=artifact['abi'],bytecode=artifact['bytecode']['object'])
        receipt=w3.eth.wait_for_transaction_receipt(factory.constructor().transact({'from':admin}))
        if receipt.status!=1: raise RuntimeError('Deployment reverted')
        print('CHAIN_CONTRACT_ADDRESS='+receipt.contractAddress)
        return
    contract=w3.eth.contract(address=Web3.to_checksum_address(settings.chain_contract_address),abi=json.loads((Path(__file__).parents[1]/'chain/registry_abi.json').read_text()))
    if args.command=='fund':
        tx=w3.eth.send_transaction({'from':admin,'to':Web3.to_checksum_address(args.address),'value':Web3.to_wei(10,'ether')})
    else:
        with AuthRepository(settings.database_url).connect() as conn:
            if args.command=='authorize-registrar':
                row=conn.execute("SELECT user_id FROM auth_accounts WHERE username=%s AND role='REGISTRAR' AND officer_verified_at IS NOT NULL",(args.username,)).fetchone()
                if not row: parser.error('Registrar unavailable')
                address=linked_wallet(conn,str(row['user_id']))
                tx=contract.functions.grantRole(contract.functions.REGISTRAR_ROLE().call(),address).transact({'from':admin})
            else:
                if len(args.evidence.strip())<5: parser.error('An identity/ownership review reference is required')
                conn.execute('SELECT ulpin FROM parcels WHERE ulpin=%s FOR UPDATE',(args.parcel_id,))
                state=ownership_state(conn,args.parcel_id)
                if not state['owners'] or sum(o[1] for o in state['owners'])!=10000:
                    parser.error('Full ownership shares are required')
                wallets=[linked_wallet(conn,o[0]) for o in state['owners']]
                digest=state_hash(state)
                existing,_=contract.functions.stateOf(hexhash(args.parcel_id)).call()
                if Web3.to_hex(existing)!='0x'+'00'*32:
                    parser.error('Already anchored; an existing baseline cannot be overwritten')
                tx=contract.functions.anchor(hexhash(args.parcel_id),digest,wallets).transact({'from':admin})
                receipt=w3.eth.wait_for_transaction_receipt(tx)
                if receipt.status!=1: raise RuntimeError('Anchor reverted')
                conn.execute('''INSERT INTO chain_baselines(parcel_id,chain_id,contract_address,state_hash,tx_hash,evidence_reference)
                    VALUES (%s,31337,%s,%s,%s,%s)''',(args.parcel_id,contract.address,digest,Web3.to_hex(tx),args.evidence))
                print('Verified baseline anchored:',Web3.to_hex(tx));return
    receipt=w3.eth.wait_for_transaction_receipt(tx)
    if receipt.status!=1: raise RuntimeError('Local transaction reverted')
    print('Local transaction confirmed:',Web3.to_hex(tx))


if __name__=='__main__': main()
