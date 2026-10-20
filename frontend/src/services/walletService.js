import { activityApi } from './saleService';

export function metamask() {
  const injected = window.ethereum;
  const provider = injected?.providers?.find((item) => item.isMetaMask) || injected;
  if (!provider?.isMetaMask) throw new Error('Install or unlock MetaMask, then retry in this browser.');
  return provider;
}

export async function localAccount() {
  const provider = metamask();
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const network = await activityApi('/api/health');
  if (![31337, 11155111].includes(network.chain_id)) throw new Error('Unsupported test network.');
  const chainId = `0x${network.chain_id.toString(16)}`;
  const chain = await provider.request({ method: 'eth_chainId' });
  if (chain !== chainId) {
    try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
    catch (failure) {
      if (failure.code !== 4902 || network.chain_id !== 31337) throw failure;
      await provider.request({ method: 'wallet_addEthereumChain', params: [{ chainId, chainName: 'TitleLock Local Test', rpcUrls: ['http://127.0.0.1:8545'], nativeCurrency: { name: 'Test Ether', symbol: 'ETH', decimals: 18 } }] });
    }
  }
  if (await provider.request({ method: 'eth_chainId' }) !== chainId) throw new Error('Select the configured TitleLock test network.');
  return { provider, address: accounts[0] };
}

export async function linkWallet() {
  const { provider, address } = await localAccount();
  const typed = await activityApi('/api/chain/wallet/challenge', { address });
  const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [address, JSON.stringify(typed)] });
  return activityApi('/api/chain/wallet/verify', { signature });
}

export async function signSale(saleId) {
  const { provider, address } = await localAccount();
  const linked = await activityApi('/api/chain/wallet');
  if (linked.address?.toLowerCase() !== address.toLowerCase()) throw new Error('Select the wallet linked to this TitleLock account.');
  const typed = await activityApi(`/api/chain/sales/${saleId}/signing-data`);
  const signature = await provider.request({ method: 'eth_signTypedData_v4', params: [address, JSON.stringify(typed)] });
  return activityApi(`/api/chain/sales/${saleId}/signature`, { signature });
}

export async function sendLocalTransfer(transaction) {
  const { provider, address } = await localAccount();
  const chainId = await provider.request({ method: 'eth_chainId' });
  if (transaction.chainId.toLowerCase() !== chainId.toLowerCase()) throw new Error('Transaction network mismatch.');
  if (transaction.from.toLowerCase() !== address.toLowerCase()) throw new Error('Select the assigned registrar wallet.');
  return provider.request({ method: 'eth_sendTransaction', params: [transaction] });
}
