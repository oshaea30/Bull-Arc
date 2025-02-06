import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { createToken } from "../services/tokenService";
import { uploadMetadata } from "../services/uploadService";
import { createMetadata } from "../services/metadataService";
import { createLiquidityPool } from "../services/dexService";
import { createBullXPool } from "../services/bullXService";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import bs58 from "bs58";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function main() {
  // Connect to mainnet
  const connection = new Connection("https://api.mainnet-beta.solana.com", {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60000,
  });

  // Load wallet from private key
  let payer: Keypair;
  const privateKeyEnv = process.env.TEST_WALLET_PRIVATE_KEY;

  if (!privateKeyEnv) {
    console.log("Please set TEST_WALLET_PRIVATE_KEY in .env.local");
    process.exit(1);
  }

  try {
    let secretKey: Uint8Array;
    if (privateKeyEnv.startsWith("[") && privateKeyEnv.endsWith("]")) {
      // Handle JSON array format
      secretKey = new Uint8Array(JSON.parse(privateKeyEnv));
    } else {
      // Handle base58 format
      secretKey = bs58.decode(privateKeyEnv);
    }
    payer = Keypair.fromSecretKey(secretKey);
    console.log("Loaded wallet from private key");
  } catch (error) {
    console.error(
      "Invalid private key format. The private key should be either a JSON array or a base58 string."
    );
    process.exit(1);
  }

  console.log("Test wallet address:", payer.publicKey.toString());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Current balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < LAMPORTS_PER_SOL) {
    console.log(
      "Insufficient balance. Please ensure your wallet has at least 1 SOL"
    );
    console.log("You can get SOL from:");
    console.log("1. https://solfaucet.com");
    console.log("2. https://faucet.solana.com");
    process.exit(1);
  }

  // Token parameters
  const tokenParams = {
    name: "Test Token",
    symbol: "TEST",
    description: "A test token for development",
    decimals: 9,
    initialSupply: 1000000,
  };

  try {
    console.log("Creating token...");
    const { mint, ata } = await createToken(
      connection,
      payer.publicKey,
      async (tx) => {
        // Sign with the payer keypair
        tx.partialSign(payer);
        return tx;
      },
      tokenParams
    );

    console.log("Token created:", mint.toString());
    console.log("Token ATA:", ata.toString());

    // Upload metadata
    console.log("Uploading metadata...");
    const metadataUri = await uploadMetadata(
      {
        name: tokenParams.name,
        symbol: tokenParams.symbol,
        description: tokenParams.description,
        properties: {
          files: [],
          category: "token",
        },
      },
      {
        publicKey: payer.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.partialSign(payer);
          return tx;
        },
        signMessage: async (msg: Uint8Array) => {
          return payer.secretKey.slice(0, 64);
        },
        sendTransaction: async (tx: Transaction) => {
          tx.partialSign(payer);
          const rawTx = tx.serialize();
          const signature = await connection.sendRawTransaction(rawTx);
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash();
          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          });
          return signature;
        },
      },
      connection
    );

    console.log("Metadata URI:", metadataUri);

    // Create on-chain metadata
    console.log("Creating on-chain metadata...");
    const metadataSignature = await createMetadata(
      mint,
      {
        name: tokenParams.name,
        symbol: tokenParams.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        creators: [
          {
            address: payer.publicKey.toString(),
            verified: true,
            share: 100,
          },
        ],
      },
      payer.publicKey,
      payer,
      connection
    );

    console.log("Metadata created:", metadataSignature);

    // Create Raydium liquidity pool
    console.log("Creating Raydium liquidity pool...");
    const poolResult = await createLiquidityPool(
      connection,
      {
        publicKey: payer.publicKey,
        signTransaction: async (tx) => {
          tx.sign(payer);
          return tx;
        },
      },
      {
        tokenMint: mint,
        baseDecimals: tokenParams.decimals,
        startPrice: 0.000001,
        solAmount: 1,
        tokenAmount: tokenParams.initialSupply * 0.1, // Use 10% for liquidity
      }
    );

    console.log("Liquidity pool created:", poolResult.poolId.toString());

    // Create BullX pool
    console.log("Creating BullX pool...");
    const bullxResult = await createBullXPool(
      connection,
      {
        publicKey: payer.publicKey,
        signTransaction: async (tx) => {
          tx.sign(payer);
          return tx;
        },
      },
      {
        tokenMint: mint,
        initialPrice: 0.000001,
        liquidityAmount: tokenParams.initialSupply * 0.1,
      }
    );

    console.log("BullX pool created:", bullxResult.poolAddress.toString());
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
