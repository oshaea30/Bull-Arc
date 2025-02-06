import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  description?: string;
  image?: string;
}

export async function createMetadata(
  mint: PublicKey,
  metadata: TokenMetadata,
  updateAuthority: PublicKey,
  payer: PublicKey,
  connection: Connection,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  try {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
        mint.toBuffer(),
      ],
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
    );

    const data: DataV2 = {
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    };

    const instruction = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint,
        mintAuthority: payer,
        payer: payer,
        updateAuthority,
      },
      {
        createMetadataAccountArgsV3: {
          data,
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    const transaction = new Transaction().add(instruction);
    transaction.feePayer = payer;
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    const signedTx = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(signature);

    return signature;
  } catch (error) {
    console.error("Error creating metadata:", error);
    throw error;
  }
}
