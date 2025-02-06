import {
  FC,
  ReactNode,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletError, WalletName } from "@solana/wallet-adapter-base";
import { clusterApiUrl, Commitment } from "@solana/web3.js";
import { BurnerWalletAdapter } from "./BurnerWalletAdapter";
import { toast } from "react-hot-toast";
import "@solana/wallet-adapter-react-ui/styles.css";

interface Props {
  children: ReactNode;
}

const RECONNECT_DELAY = 1500; // 1.5 seconds
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_RESET_DELAY = 60000; // 1 minute

export const WalletContextProvider: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastConnectedWallet, setLastConnectedWallet] =
    useState<WalletName | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BurnerWalletAdapter(),
    ],
    []
  );

  // Reset reconnect attempts after a delay
  useEffect(() => {
    if (reconnectAttempts > 0) {
      const timer = setTimeout(() => {
        setReconnectAttempts(0);
        setLastConnectedWallet(null);
        setIsReconnecting(false);
      }, RECONNECT_RESET_DELAY);

      return () => clearTimeout(timer);
    }
  }, [reconnectAttempts]);

  const attemptReconnect = useCallback(
    async (wallet: any) => {
      if (!wallet || isReconnecting) return;

      setIsReconnecting(true);
      try {
        await wallet.connect();
        setReconnectAttempts(0);
        setLastConnectedWallet(wallet.name);
        toast.success("Wallet reconnected successfully");
      } catch (error) {
        console.warn("Reconnection attempt failed:", error);
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            attemptReconnect(wallet);
          }, RECONNECT_DELAY);
        } else {
          toast.error("Failed to reconnect wallet after multiple attempts");
          setReconnectAttempts(0);
          setLastConnectedWallet(null);
        }
      } finally {
        setIsReconnecting(false);
      }
    },
    [reconnectAttempts, isReconnecting]
  );

  const onError = useCallback(
    async (error: WalletError) => {
      console.error("Wallet error:", error);

      if (error.name === "WalletDisconnectedError") {
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && lastConnectedWallet) {
          const wallet = wallets.find((w) => w.name === lastConnectedWallet);
          if (wallet) {
            toast.loading("Attempting to reconnect wallet...", {
              duration: RECONNECT_DELAY,
            });
            await attemptReconnect(wallet);
            return;
          }
        }
      }

      // Handle other wallet errors
      if (error.name === "WalletConnectionError") {
        toast.error("Failed to connect to wallet. Please try again.");
      } else if (error.name === "WalletNotFoundError") {
        toast.error("Wallet not found. Please install the wallet extension.");
      } else if (error.name === "WalletNotInstalledError") {
        toast.error("Please install a Solana wallet extension.");
      } else if (!error.name.includes("User rejected")) {
        // Don't show error for user rejections
        toast.error(
          error.message || "An error occurred with the wallet connection"
        );
      }
    },
    [reconnectAttempts, lastConnectedWallet, wallets, attemptReconnect]
  );

  const onConnect = useCallback(() => {
    const activeWallet = wallets.find((w) => w.connected);
    if (activeWallet) {
      setLastConnectedWallet(activeWallet.name);
      setReconnectAttempts(0);
    }
  }, [wallets]);

  const commitment: Commitment = "confirmed";

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment }}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
