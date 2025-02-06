import {
  BaseMessageSignerWalletAdapter,
  WalletConnectionError,
  WalletDisconnectionError,
  WalletName,
  WalletNotConnectedError,
  WalletReadyState,
} from '@solana/wallet-adapter-base';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

export class BurnerWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = 'Burner' as WalletName<'Burner'>;
  url = 'https://solana.com';
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiPjxyZWN0IHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgZmlsbD0iI2ZmNjI0ZCIgcng9IjE2Ii8+PHBhdGggZD0iTTEyIDE4bDQtOCA0IDhtLTQtM3Y3IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==';

  private _keypair: Keypair | null = null;
  private _connecting: boolean = false;
  private _connected: boolean = false;
  private _disconnectTimer: NodeJS.Timeout | null = null;
  private readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    super();
    this._readyState = typeof window === 'undefined' ? WalletReadyState.Unsupported : WalletReadyState.Installed;
    
    // Load wallet on initialization
    if (typeof window !== 'undefined') {
      this.loadBurnerWallet();
      
      // Add visibility change listener to handle tab focus/blur
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.loadBurnerWallet();
        }
      });
    }
  }

  private loadBurnerWallet() {
    try {
      const walletData = localStorage.getItem('burnerWallet');
      if (walletData) {
        const { secretKey, createdAt } = JSON.parse(walletData);
        const creationTime = new Date(createdAt).getTime();
        const now = Date.now();

        // Check if wallet has expired
        if (now - creationTime > this.EXPIRY_TIME) {
          this.clearWallet();
          return;
        }

        this._keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        this.setupDisconnectTimer(creationTime);
        
        // Reconnect if was previously connected
        if (this._connected) {
          this.connect().catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to load burner wallet:', error);
      this.clearWallet();
    }
  }

  private setupDisconnectTimer(creationTime: number) {
    const timeLeft = this.EXPIRY_TIME - (Date.now() - creationTime);
    if (timeLeft <= 0) {
      this.clearWallet();
      return;
    }

    if (this._disconnectTimer) {
      clearTimeout(this._disconnectTimer);
    }

    this._disconnectTimer = setTimeout(() => {
      this.clearWallet();
    }, timeLeft);
  }

  private clearWallet() {
    this._keypair = null;
    this._connected = false;
    localStorage.removeItem('burnerWallet');
    if (this._disconnectTimer) {
      clearTimeout(this._disconnectTimer);
      this._disconnectTimer = null;
    }
    this.emit('disconnect');
  }

  get publicKey(): PublicKey | null {
    return this._keypair?.publicKey || null;
  }

  get connected(): boolean {
    return this._connected;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  async connect(): Promise<void> {
    try {
      if (this._connecting || this._connected) return;
      
      this._connecting = true;

      if (!this._keypair) {
        throw new WalletConnectionError('No burner wallet found');
      }

      this._connected = true;
      this.emit('connect', this._keypair.publicKey);
    } catch (error: any) {
      throw new WalletConnectionError(error?.message, error);
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.clearWallet();
    } catch (error: any) {
      throw new WalletDisconnectionError(error?.message, error);
    }
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    try {
      if (!this._connected || !this._keypair) throw new WalletNotConnectedError();

      transaction.partialSign(this._keypair);
      return transaction;
    } catch (error: any) {
      throw new WalletNotConnectedError(error?.message, error);
    }
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return Promise.all(transactions.map((transaction) => this.signTransaction(transaction)));
  }

  getTimeRemaining(): number {
    const walletData = localStorage.getItem('burnerWallet');
    if (!walletData) return 0;

    const { createdAt } = JSON.parse(walletData);
    const creationTime = new Date(createdAt).getTime();
    const timeLeft = this.EXPIRY_TIME - (Date.now() - creationTime);
    return Math.max(0, timeLeft);
  }
}