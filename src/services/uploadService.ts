import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import axios from "axios";

// Environment-specific configuration
const ENV =
  process.env.NODE_ENV === "production" ? "production" : "development";

interface EnvConfig {
  pinataApiKey: string;
  pinataSecretKey: string;
  pinataGateway: string;
}

const CONFIGS: Record<string, EnvConfig> = {
  development: {
    pinataApiKey: process.env.VITE_PINATA_API_KEY || "",
    pinataSecretKey: process.env.VITE_PINATA_SECRET_KEY || "",
    pinataGateway: "https://gateway.pinata.cloud/ipfs",
  },
  production: {
    pinataApiKey: process.env.VITE_PINATA_API_KEY || "",
    pinataSecretKey: process.env.VITE_PINATA_SECRET_KEY || "",
    pinataGateway: "https://gateway.pinata.cloud/ipfs",
  },
};

const CONFIG: EnvConfig = CONFIGS[ENV];

// Update the image configuration for better compatibility
const IMAGE_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  minSize: 1024, // 1KB
  acceptedTypes: ["image/jpeg", "image/png", "image/gif"],
  maxDimensions: { width: 2000, height: 2000 },
  minDimensions: { width: 200, height: 200 },
  targetSize: 400,
  format: "image/png",
  quality: 0.9,
};

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  properties: {
    files: Array<{ uri: string; type: string }>;
    category: string;
    environment?: string;
  };
}

async function verifyImage(file: File): Promise<boolean> {
  // Verify file size
  if (file.size > IMAGE_CONFIG.maxSize || file.size < IMAGE_CONFIG.minSize) {
    throw new Error(
      `Image size must be between ${IMAGE_CONFIG.minSize / 1024}KB and ${
        IMAGE_CONFIG.maxSize / 1024 / 1024
      }MB`
    );
  }

  // Verify file type
  if (!IMAGE_CONFIG.acceptedTypes.includes(file.type)) {
    throw new Error(
      `Image type must be one of: ${IMAGE_CONFIG.acceptedTypes.join(", ")}`
    );
  }

  // Verify dimensions
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (
        img.width > IMAGE_CONFIG.maxDimensions.width ||
        img.height > IMAGE_CONFIG.maxDimensions.height
      ) {
        reject(
          new Error(
            `Image dimensions must not exceed ${IMAGE_CONFIG.maxDimensions.width}x${IMAGE_CONFIG.maxDimensions.height}`
          )
        );
      }
      if (
        img.width < IMAGE_CONFIG.minDimensions.width ||
        img.height < IMAGE_CONFIG.minDimensions.height
      ) {
        reject(
          new Error(
            `Image dimensions must be at least ${IMAGE_CONFIG.minDimensions.width}x${IMAGE_CONFIG.minDimensions.height}`
          )
        );
      }
      resolve(true);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

async function optimizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Calculate dimensions while maintaining aspect ratio
      const targetSize = IMAGE_CONFIG.targetSize;
      const scale = Math.min(targetSize / img.width, targetSize / img.height);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      canvas.width = targetSize;
      canvas.height = targetSize;

      // Fill with transparent background
      ctx.clearRect(0, 0, targetSize, targetSize);

      // Center the image
      const offsetX = (targetSize - width) / 2;
      const offsetY = (targetSize - height) / 2;

      // Draw image with smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, offsetX, offsetY, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        },
        IMAGE_CONFIG.format,
        IMAGE_CONFIG.quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadTokenImage(
  file: File,
  wallet: WalletContextState,
  connection: Connection
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.log("Starting image upload process...");

    // Verify the image
    await verifyImage(file);
    console.log("Image verification passed");

    // Optimize the image
    const optimizedImageBlob = await optimizeImage(file);
    console.log("Image optimized successfully");

    // Prepare form data for Pinata
    const formData = new FormData();
    formData.append(
      "file",
      new File([optimizedImageBlob], file.name, { type: IMAGE_CONFIG.format })
    );

    // Add metadata
    const metadata = JSON.stringify({
      name: `${wallet.publicKey.toString()}-${Date.now()}`,
      keyvalues: {
        wallet: wallet.publicKey.toString(),
        timestamp: Date.now().toString(),
        environment: ENV,
      },
    });
    formData.append("pinataMetadata", metadata);

    // Upload to Pinata with retry logic
    let ipfsHash = "";
    let retryCount = 0;
    const MAX_RETRIES = 3;

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(
          `Uploading to IPFS (attempt ${retryCount + 1}/${MAX_RETRIES})...`
        );

        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            headers: {
              "Content-Type": `multipart/form-data;`,
              pinata_api_key: CONFIG.pinataApiKey,
              pinata_secret_api_key: CONFIG.pinataSecretKey,
            },
            maxBodyLength: Infinity,
          }
        );

        ipfsHash = response.data.IpfsHash;
        console.log("Upload successful. IPFS hash:", ipfsHash);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === MAX_RETRIES) throw error;
        console.log(
          `Upload attempt ${retryCount} failed, retrying in 2 seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Construct the final URI using the Pinata gateway
    const imageUri = `${CONFIG.pinataGateway}/${ipfsHash}`;
    console.log("Final image URI:", imageUri);

    // Store metadata for development
    if (ENV !== "production") {
      const storageKey = `token_image_${ipfsHash}`;
      const imageMetadata = {
        uri: imageUri,
        ipfsHash,
        environment: ENV,
        timestamp: new Date().toISOString(),
        sizes: {
          original: imageUri,
          thumbnail: `${imageUri}?w=96&h=96&fit=cover&format=png`,
          small: `${imageUri}?w=200&h=200&fit=cover&format=png`,
          medium: `${imageUri}?w=400&h=400&fit=cover&format=png`,
        },
      };
      localStorage.setItem(storageKey, JSON.stringify(imageMetadata));
    }

    return imageUri;
  } catch (error) {
    console.error("Failed to upload image:", error);
    throw error;
  }
}

export async function uploadMetadata(
  metadata: TokenMetadata,
  wallet: WalletContextState,
  connection: Connection
): Promise<string> {
  try {
    if (!wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    // Create environment-specific Metaplex instance with wallet identity
    const metaplex = Metaplex.make(connection)
      .use(walletAdapterIdentity(wallet))
      .use(
        bundlrStorage({
          address: CONFIG.bundlrNetwork,
          providerUrl: CONFIG.rpcEndpoint,
          timeout: 60000,
        })
      );

    // Add environment info to metadata
    metadata.properties.environment = ENV;

    // Normalize Arweave URLs for consistency
    if (metadata.image.startsWith("https://")) {
      metadata.image = metadata.image.replace(
        /^https:\/\/[^/]+/,
        CONFIG.arweaveGateway
      );
      if (metadata.properties.files?.[0]?.uri) {
        metadata.properties.files[0].uri = metadata.image;
      }
    }

    const filename = `${wallet.publicKey.toString()}-${Date.now()}-${ENV}-metadata.json`;
    const metaplexFile = toMetaplexFile(
      Buffer.from(JSON.stringify(metadata, null, 2)),
      filename
    );

    console.log(`Uploading metadata to Arweave (${ENV})...`);
    const uri = await metaplex.storage().upload(metaplexFile);
    console.log("Metadata uploaded successfully:", uri);

    // Store metadata info in development for debugging
    if (ENV !== "production") {
      const uploadInfo = {
        uri,
        environment: ENV,
        timestamp: new Date().toISOString(),
        txId: uri.split("/").pop(),
      };
      localStorage.setItem(
        `token_metadata_${uploadInfo.txId}`,
        JSON.stringify(uploadInfo)
      );
    }

    return uri;
  } catch (error) {
    console.error(`Failed to upload metadata (${ENV}):`, error);
    throw error;
  }
}

// For backward compatibility
export const uploadToArweave = uploadTokenImage;
