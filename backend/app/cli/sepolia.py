"""Verify a wallet-signed Sepolia deployment and print its backend configuration."""
import argparse
import json
from pathlib import Path

from web3 import Web3

from ..config import Settings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', default='.env.sepolia')
    parser.add_argument('transaction_hash')
    args = parser.parse_args()
    settings = Settings(_env_file=args.env_file)
    if settings.chain_id != 11155111:
        parser.error('Set CHAIN_ID=11155111, HTTPS CHAIN_RPC_URL, and CHAIN_CONFIRMATIONS>=3 first')
    w3 = Web3(Web3.HTTPProvider(settings.chain_rpc_url, request_kwargs={'timeout': 20}))
    if w3.eth.chain_id != settings.chain_id:
        parser.error('RPC is not Sepolia')
    receipt = w3.eth.get_transaction_receipt(args.transaction_hash)
    transaction = w3.eth.get_transaction(args.transaction_hash)
    artifact = json.loads((Path(__file__).parents[3] / 'blockchain/out/TitleLockRegistry.sol/TitleLockRegistry.json').read_text())
    expected = artifact['bytecode']['object'].removeprefix('0x').lower()
    if receipt.status != 1 or transaction['to'] is not None or transaction['input'].hex().removeprefix('0x').lower() != expected:
        parser.error('Transaction is not a successful deployment of the current compiled TitleLock contract')
    if w3.eth.block_number - receipt.blockNumber + 1 < settings.chain_confirmations:
        parser.error('Deployment needs more confirmations; retry shortly')
    block = w3.eth.get_block(receipt.blockNumber)
    if block.hash != receipt.blockHash or not w3.eth.get_code(receipt.contractAddress):
        parser.error('Deployment is not on the canonical chain')
    contract = w3.eth.contract(address=receipt.contractAddress, abi=artifact['abi'])
    if not contract.functions.hasRole(bytes(32), transaction['from']).call():
        parser.error('Deployment sender does not hold the admin role')
    print(f'CHAIN_CONTRACT_ADDRESS={receipt.contractAddress}')
    print(f'CHAIN_DEPLOYMENT_BLOCK={receipt.blockNumber}')
    print(f'Deployment admin: {transaction["from"]}')
    print('Verified deployment only. Registrar authorization and reviewed property anchors are separate steps.')


if __name__ == '__main__':
    main()
