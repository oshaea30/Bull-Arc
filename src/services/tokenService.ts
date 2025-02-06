import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createMintToInstruction,
} from "@solana/spl-token";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import { createLiquidityPool } from "./dexService";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { uploadMetadata } from "./uploadService";
import { createMetadata } from "./metadataService";

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  initialSupply: number;
  image?: string;
  buyTaxEnabled?: boolean;
  sellTaxEnabled?: boolean;
  reflectionEnabled?: boolean;
}

// Fee constants
const TRADING_FEE_PERCENT = 0.5;
const LIQUIDITY_FEE_PERCENT = 1.0;
const BUY_TAX_PERCENT = 2.0;
const SELL_TAX_PERCENT = 2.0;
const REFLECTION_FEE_PERCENT = 2.0;

// Error class for token operations
export class TokenError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "TokenError";
  }
}

// Fee calculation helpers
export function calculateTradingFee(amount: number): number {
  return amount * (TRADING_FEE_PERCENT / 100);
}

export function calculateLiquidityFee(amount: number): number {
  return amount * (LIQUIDITY_FEE_PERCENT / 100);
}

export function calculateBuyTax(amount: number): number {
  return amount * (BUY_TAX_PERCENT / 100);
}

export function calculateSellTax(amount: number): number {
  return amount * (SELL_TAX_PERCENT / 100);
}

export function calculateReflectionFee(amount: number): number {
  return amount * (REFLECTION_FEE_PERCENT / 100);
}

export function calculateTotalBuyFees(
  amount: number,
  metadata: TokenMetadata
): number {
  let total = calculateTradingFee(amount) + calculateLiquidityFee(amount);
  if (metadata.buyTaxEnabled) {
    total += calculateBuyTax(amount);
  }
  if (metadata.reflectionEnabled) {
    total += calculateReflectionFee(amount);
  }
  return total;
}

export function calculateTotalSellFees(
  amount: number,
  metadata: TokenMetadata
): number {
  let total = calculateTradingFee(amount) + calculateLiquidityFee(amount);
  if (metadata.sellTaxEnabled) {
    total += calculateSellTax(amount);
  }
  if (metadata.reflectionEnabled) {
    total += calculateReflectionFee(amount);
  }
  return total;
}

export async function createBasicToken(
  connection: Connection,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  metadata: TokenMetadata
): Promise<{ mint: PublicKey; ata: PublicKey }> {
  try {
    const mint = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const ata = await getAssociatedTokenAddress(mint.publicKey, payer);

    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        metadata.decimals,
        payer,
        payer,
        TOKEN_PROGRAM_ID
      ),
      createAssociatedTokenAccountInstruction(
        payer,
        ata,
        payer,
        mint.publicKey
      ),
      createMintToInstruction(
        mint.publicKey,
        ata,
        payer,
        metadata.initialSupply * Math.pow(10, metadata.decimals)
      )
    );

    transaction.feePayer = payer;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    transaction.sign(mint);
    const signedTx = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature);

    return { mint: mint.publicKey, ata };
  } catch (error) {
    console.error("Error creating token:", error);
    throw new TokenError(
      error instanceof Error ? error.message : "Failed to create token",
      "TOKEN_CREATION_FAILED"
    );
  }
}

export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number> {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return Number(balance.value.amount);
  } catch (error) {
    throw new TokenError(
      "Failed to fetch token balance",
      "BALANCE_FETCH_ERROR"
    );
  }
}

export async function getOwnedTokenAccounts(
  connection: Connection,
  owner: PublicKey
): Promise<
  Array<{
    mint: PublicKey;
    tokenAccount: PublicKey;
    balance: number;
    decimals: number;
  }>
> {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    return accounts.value.map((account) => {
      const parsedInfo = account.account.data.parsed.info;
      return {
        mint: new PublicKey(parsedInfo.mint),
        tokenAccount: account.pubkey,
        balance: Number(parsedInfo.tokenAmount.amount),
        decimals: parsedInfo.tokenAmount.decimals,
      };
    });
  } catch (error) {
    throw new TokenError("Failed to fetch owned tokens", "TOKEN_FETCH_ERROR");
  }
}

export async function addMetadata(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  metadata: TokenMetadata
): Promise<void> {
  try {
    const metadataUri = await uploadMetadata(
      {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description || "",
        image: metadata.image || "",
        properties: {
          files: metadata.image
            ? [{ uri: metadata.image, type: "image/png" }]
            : [],
          category: "token",
        },
      },
      {
        publicKey: payer,
        signTransaction,
      } as WalletContextState,
      connection
    );

    await createMetadata(
      mint,
      {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadataUri,
        description: metadata.description,
        image: metadata.image,
      },
      payer,
      payer,
      connection,
      signTransaction
    );
  } catch (error) {
    console.error("Error adding metadata:", error);
    throw new TokenError(
      error instanceof Error ? error.message : "Failed to add metadata",
      "METADATA_CREATION_FAILED"
    );
  }
}

export async function addLiquidityPool(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  solAmount: number,
  tokenAmount: number
): Promise<void> {
  try {
    await createLiquidityPool(
      connection,
      { publicKey: payer, signTransaction },
      {
        tokenMint: mint,
        baseDecimals: 9, // SOL decimals
        startPrice: 0.000001,
        solAmount,
        tokenAmount,
      }
    );
  } catch (error) {
    console.error("Failed to add liquidity pool:", error);
    throw new TokenError(
      "Failed to create liquidity pool",
      "LIQUIDITY_POOL_ERROR"
    );
  }
}

export async function enableTrading(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>
): Promise<string> {
  // Implementation for enabling trading later
  throw new Error("Not implemented yet");
}

export interface TokenMetadataParams {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  initialSupply: number;
  imageUri: string;
}

export async function createTokenWithMetadata(
  params: TokenMetadataParams,
  wallet: WalletContextState,
  connection: Connection
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new TokenError("Wallet not connected", "WALLET_NOT_CONNECTED");
  }

  try {
    const result = await createBasicToken(
      connection,
      wallet.publicKey,
      wallet.signTransaction,
      {
        name: params.name,
        symbol: params.symbol,
        decimals: params.decimals,
        initialSupply: Number(params.initialSupply),
        image: params.imageUri,
      }
    );

    if (result.mint) {
      await addMetadata(
        connection,
        result.mint,
        wallet.publicKey,
        wallet.signTransaction,
        {
          name: params.name,
          symbol: params.symbol,
          description: params.description,
          decimals: params.decimals,
          initialSupply: Number(params.initialSupply),
          image: params.imageUri,
        }
      );
    }

    return result;
  } catch (error) {
    console.error("Error creating token with metadata:", error);
    throw error;
  }
}
