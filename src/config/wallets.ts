import { WalletName } from '@solana/wallet-adapter-base';

export interface WalletOption {
  name: string;
  adapter: WalletName;
  recommended?: boolean;
  installUrl: string;
  detectObject?: string;
  iconUrl?: string;
  isBurner?: boolean;
}

export const walletOptions: WalletOption[] = [
  {
    name: 'Phantom',
    adapter: 'Phantom' as WalletName,
    recommended: true,
    installUrl: 'https://phantom.app/download',
    detectObject: 'solana',
    iconUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/phantom.svg'
  },
  {
    name: 'Solflare',
    adapter: 'Solflare' as WalletName,
    recommended: true,
    installUrl: 'https://solflare.com',
    detectObject: 'solflare',
    iconUrl: 'https://raw.githubusercontent.com/solana-labs/wallet-adapter/master/packages/wallets/icons/solflare.svg'
  },
  {
    name: 'Burner Wallet',
    adapter: 'Burner' as WalletName,
    recommended: false,
    installUrl: '',
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iI2ZmNjI0ZCIgcng9IjE2Ii8+PHBhdGggZD0iTTEyIDE4bDQtOCA0IDhtLTQtM3Y3IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
    isBurner: true
  }
];

export function detectWallet(name: string): boolean {
  const option = walletOptions.find(opt => opt.name === name);
  if (!option?.detectObject) return false;

  if (name === 'Phantom') {
    return !!(window as any).solana?.isPhantom;
  }

  if (name === 'Solflare') {
    return !!(window as any).solflare?.isSolflare;
  }

  if (name === 'Burner') {
    return !!localStorage.getItem('burnerWallet');
  }

  return !!(window as any)[option.detectObject];
}