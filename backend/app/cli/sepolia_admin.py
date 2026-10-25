"""Prepare administrator-signed Sepolia anchors; record confirmed initial anchors."""
import argparse
import json
from pathlib import Path
from web3 import Web3
from ..config import Settings
from ..auth.repository import AuthRepository
from ..chain.service import Registry, ownership_state, state_hash, hexhash
from ..migrations import run_migrations


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file',default='.env.sepolia')
    sub=parser.add_subparsers(dest='command',required=True)
    prepare=sub.add_parser('prepare')
    prepare.add_argument('--registrar',required=True)
    prepare.add_argument('--parcel',required=True)
    prepare.add_argument('--admin',required=True)
    prepare.add_argument('--output',required=True)
    confirm=sub.add_parser('confirm-anchor')
    confirm.add_argument('transaction_hash')
    confirm.add_argument('--parcel',required=True)
    confirm.add_argument('--evidence',required=True)
    confirm.add_argument('--replace-retired-baseline',action='store_true')
    args=parser.parse_args()
    settings=Settings(_env_file=args.env_file)
    if settings.chain_id!=11155111 or not settings.database_url:
        parser.error('A separate Sepolia database and deployed registry are required')
    run_migrations(settings.database_url)
    chain=Registry(settings)
    repo=AuthRepository(settings.database_url)
    with repo.connect() as conn:
        conn.execute('SELECT ulpin FROM parcels WHERE ulpin=%s FOR UPDATE',(args.parcel,))
        state=ownership_state(conn,args.parcel)
        if not state['owners'] or sum(owner[1] for owner in state['owners'])!=10000:
            parser.error('Reviewed full ownership shares are required')
        digest=state_hash(state)
        if args.command=='prepare':
            admin=Web3.to_checksum_address(args.admin)
            if not chain.contract.functions.hasRole(bytes(32),admin).call():
                parser.error('Selected wallet is not the registry administrator')
            registrar=conn.execute("SELECT a.user_id FROM auth_accounts a JOIN users u ON u.id=a.user_id WHERE a.username=%s AND a.role='REGISTRAR' AND a.officer_verified_at IS NOT NULL AND u.account_status='ACTIVE'",(args.registrar.strip().lower(),)).fetchone()
            if not registrar:
                parser.error('Reviewed registrar required')
            transactions=[]
            def add(label,data):
                transactions.append({'label':label,'transaction':{'from':admin,'to':chain.address,'chainId':hex(settings.chain_id),'value':'0x0','data':data}})
            existing, owners=chain.state(args.parcel)
            if existing=='0x'+'00'*32:
                # The contract retains an address array for legacy compatibility.  The
                # administrator address is a technical placeholder, not an owner's wallet.
                add('Anchor reviewed property '+args.parcel,chain.contract.encode_abi('anchor',args=[hexhash(args.parcel),digest,[admin]]))
            elif existing!=digest:
                parser.error('Existing anchor differs; refusing to overwrite it')
            Path(args.output).write_text(json.dumps(transactions,indent=2)+'\n')
            print('Prepared public unsigned transactions:',len(transactions))
            return
        if not 5<=len(args.evidence.strip())<=500:
            parser.error('Review evidence reference required')
        receipt=chain.w3.eth.get_transaction_receipt(args.transaction_hash)
        tx=chain.w3.eth.get_transaction(args.transaction_hash)
        anchors=[]
        for log in receipt.logs:
            if log['address'].lower()==chain.address.lower() and log['topics'] and Web3.to_hex(log['topics'][0])==hexhash('PropertyAnchored(bytes32,bytes32)'):
                anchors.append(chain.contract.events.PropertyAnchored().process_log(log)['args'])
        anchored=len(anchors)==1 and Web3.to_hex(anchors[0]['parcelId'])==hexhash(args.parcel) and Web3.to_hex(anchors[0]['stateHash'])==digest
        admin=chain.contract.functions.hasRole(bytes(32),tx['from']).call(block_identifier=receipt.blockNumber)
        if receipt.status!=1 or not anchored or not admin:
            parser.error('Transaction lacks the exact registry anchor event from an authorized administrator')
        if chain.w3.eth.block_number-receipt.blockNumber+1<settings.chain_confirmations or chain.w3.eth.get_block(receipt.blockNumber).hash!=receipt.blockHash:
            parser.error('Anchor needs canonical confirmations')
        existing,_owners=chain.state(args.parcel)
        if existing!=digest:
            parser.error('Confirmed ownership differs from the reviewed database')
        baseline=conn.execute('SELECT chain_id,contract_address,state_hash,tx_hash FROM chain_baselines WHERE parcel_id=%s',(args.parcel,)).fetchone()
        if baseline and (baseline['chain_id']!=settings.chain_id or baseline['contract_address'].lower()!=chain.address.lower() or baseline['state_hash']!=digest or baseline['tx_hash'].lower()!=args.transaction_hash.lower()):
            if not args.replace_retired_baseline or baseline['chain_id']!=settings.chain_id or baseline['contract_address'].lower()==chain.address.lower():
                parser.error('A different baseline is already recorded; manual review required')
            conn.execute('''INSERT INTO chain_baseline_revisions
                (parcel_id,chain_id,contract_address,state_hash,tx_hash,evidence_reference,replacement_contract_address,replacement_tx_hash)
                SELECT parcel_id,chain_id,contract_address,state_hash,tx_hash,evidence_reference,%s,%s
                FROM chain_baselines WHERE parcel_id=%s''',(chain.address,args.transaction_hash,args.parcel))
            conn.execute('''UPDATE chain_baselines SET chain_id=%s,contract_address=%s,state_hash=%s,tx_hash=%s,evidence_reference=%s,created_at=now()
                WHERE parcel_id=%s''',(settings.chain_id,chain.address,digest,args.transaction_hash,args.evidence.strip(),args.parcel))
        elif not baseline:
            conn.execute('''INSERT INTO chain_baselines(parcel_id,chain_id,contract_address,state_hash,tx_hash,evidence_reference)
                VALUES (%s,%s,%s,%s,%s,%s)''',
                (args.parcel,settings.chain_id,chain.address,digest,args.transaction_hash,args.evidence.strip()))
    print('Confirmed initial anchor recorded:',args.parcel)


if __name__=='__main__':
    main()
