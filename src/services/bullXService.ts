import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { BULLX_PROGRAM_ID } from "../config";

// BullX program ID
const PROGRAM_ID = new PublicKey(BULLX_PROGRAM_ID);

// Fee collection wallet - Replace with your wallet address
export const FEE_COLLECTOR_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_FEE_COLLECTOR_WALLET ||
    "3YKuG7pCQTwcHS4Ti1DZrTL83FWK7Y19KhoKHuxUiHEi" // Default fallback address
);

// Instruction types
enum BullXInstruction {
  InitializePool = 0,
}

export interface BullXPoolConfig {
  tokenMint: PublicKey;
  initialPrice: number;
  liquidityAmount: number;
}

export interface BullXPoolParams {
  tokenMint: PublicKey;
  initialPrice: number;
  liquidityAmount: number;
}

export class BullXError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "BullXError";
  }
}

export async function createBullXPool(
  connection: Connection,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  },
  params: BullXPoolParams
): Promise<{ success: boolean; poolAddress: PublicKey }> {
  try {
    const { tokenMint, initialPrice, liquidityAmount } = params;

    // Get the pool address (PDA)
    const [poolAddress] = await PublicKey.findProgramAddress(
      [Buffer.from("pool"), tokenMint.toBuffer(), wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );

    // Get the token accounts
    const tokenATA = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Create the pool initialization instruction
    const createPoolIx = createInitializePoolInstruction(
      poolAddress,
      tokenMint,
      wallet.publicKey,
      tokenATA,
      initialPrice,
      liquidityAmount
    );

    // Create and sign transaction
    const transaction = new Transaction().add(createPoolIx);
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    transaction.feePayer = wallet.publicKey;

    const signedTx = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature);
    if (confirmation.value.err) {
      throw new BullXError(
        "Failed to create BullX pool",
        "POOL_CREATION_FAILED"
      );
    }

    return {
      success: true,
      poolAddress,
    };
  } catch (error) {
    console.error("BullX pool creation error:", error);
    throw new Error("Failed to create BullX pool");
  }
}

function createInitializePoolInstruction(
  poolAddress: PublicKey,
  tokenMint: PublicKey,
  authority: PublicKey,
  tokenAccount: PublicKey,
  initialPrice: number,
  liquidityAmount: number
): TransactionInstruction {
  const keys = [
    { pubkey: poolAddress, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: tokenAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  // Create instruction data buffer
  const dataLayout = {
    instruction: BullXInstruction.InitializePool,
    initialPrice: initialPrice * LAMPORTS_PER_SOL, // Convert to lamports
    liquidityAmount: Math.floor(liquidityAmount), // Convert to integer
  };

  const data = Buffer.alloc(17); // 1 byte for instruction + 8 bytes for price + 8 bytes for amount
  data.writeUInt8(dataLayout.instruction, 0);
  data.writeBigUInt64LE(BigInt(dataLayout.initialPrice), 1);
  data.writeBigUInt64LE(BigInt(dataLayout.liquidityAmount), 9);

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });
}
