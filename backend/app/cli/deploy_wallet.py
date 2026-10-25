"""Loopback-only Sepolia deployment page. Signing stays in MetaMask."""
import json
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from web3 import Web3


def deployment_bytecode():
    root = Path(__file__).parents[3] / 'blockchain'
    artifact = json.loads((root / 'out/TitleLockRegistry.sol/TitleLockRegistry.json').read_text())
    for name, source in json.loads(artifact['rawMetadata'])['sources'].items():
        if Web3.to_hex(Web3.keccak((root / name).read_bytes())) != source['keccak256']:
            raise RuntimeError('Contract sources changed; rebuild before deploying')
    return '0x' + artifact['bytecode']['object'].removeprefix('0x')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--admin',help='Reviewed administrator address for a new deployment')
    parser.add_argument('--transactions',help='JSON file of reviewed unsigned Sepolia transactions')
    parser.add_argument('--bytecode-file',help='Compiled creation bytecode for a reviewed replacement deployment')
    parser.add_argument('--replace',action='store_true',help='Allow a new deployment when an older Sepolia record exists')
    args=parser.parse_args()
    if args.transactions:
        transactions=json.loads(Path(args.transactions).read_text())
        for item in transactions:
            if item['transaction']['chainId']!='0xaa36a7':
                parser.error('Only Sepolia transactions are supported')
        page=Path(__file__).with_name('wallet_transactions.html').read_text().replace('__TRANSACTIONS__',json.dumps(transactions).replace('<','\\u003c'))
    else:
        if (Path(__file__).parents[3]/'blockchain/deployments/sepolia.json').exists() and not args.replace:
            parser.error('Sepolia is already deployed; pass --replace only for a reviewed contract upgrade')
        if not args.admin or not Web3.is_address(args.admin):
            parser.error('New deployment requires a valid --admin wallet address')
        if args.bytecode_file:
            bytecode=Path(args.bytecode_file).read_text().strip()
            if not bytecode or any(character not in '0123456789abcdefABCDEF' for character in bytecode.removeprefix('0x')):
                parser.error('Bytecode file is not hexadecimal')
            bytecode='0x'+bytecode.removeprefix('0x')
        else:
            bytecode=deployment_bytecode()
        page = Path(__file__).with_name('deploy_wallet.html').read_text().replace('__BYTECODE__', json.dumps(bytecode)).replace('__ADMIN__',json.dumps(Web3.to_checksum_address(args.admin)))
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.headers.get('Host') != '127.0.0.1:8766' or self.path != '/':
                self.send_error(404)
                return
            body = page.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'")
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        def log_message(self, *args):
            pass
    print('Sepolia deployment page: http://127.0.0.1:8766/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8766), Handler).serve_forever()


if __name__ == '__main__':
    main()
