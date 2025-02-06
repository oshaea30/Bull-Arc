import { useConnection } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PriceService } from "../services/priceService";
import {
  TokenMetadataParams,
  createTokenWithMetadata,
  addLiquidityPool,
  TokenError,
  createBasicToken,
  addMetadata,
  calculateTradingFee,
  calculateLiquidityFee,
  TokenMetadata,
} from "../services/tokenService";
import { createBullXPool } from "../services/bullXService";
import { uploadMetadata } from "../services/uploadService";
import { uploadTokenImage } from "../services/uploadService";
import { useState, useEffect, useCallback } from "react";
import { tokenStorageService } from "../services/tokenStorageService";
import { Tooltip } from "../components/Tooltip";
import { toast } from "react-hot-toast";

interface CreatedCoin {
  name: string;
  symbol: string;
  address: string;
  mint: string;
  createdAt: string;
  progress: number;
  holders: number;
  volume: number;
  currentPrice: number;
  poolId: string;
  bullxPoolAddress?: string;
}

const DEFAULTS = {
  INITIAL_SUPPLY: "1000000",
  INITIAL_PRICE: "0.000001",
  TOKEN_AMOUNT: "1000000",
  DECIMALS: "9",
  SOL_AMOUNT: "1",
};

interface FormData {
  name: string;
  symbol: string;
  description: string;
  decimals: string;
  initialSupply: string;
  initialPrice: string;
  tokenAmount: string;
  solAmount: string;
  bullxEnabled: boolean;
  buyTaxEnabled: boolean;
  sellTaxEnabled: boolean;
  reflectionEnabled: boolean;
  image: File | null;
}

interface FormErrors {
  name?: string;
  symbol?: string;
  description?: string;
  initialSupply?: string;
  initialPrice?: string;
  tokenAmount?: string;
  decimals?: string;
  solAmount?: string;
  bullxEnabled?: string;
  submit?: string;
  image?: string;
}

interface TokenCreationParams {
  name: string;
  symbol: string;
  description: string;
  decimals: number;
  initialSupply: number;
  metadataUri: string;
  imageUri: string;
  buyTaxEnabled: boolean;
  sellTaxEnabled: boolean;
  reflectionEnabled: boolean;
  createBullXPool: boolean;
  liquidityAmount: number;
  solAmount: number;
}

interface TokenCreationResult {
  mint: PublicKey;
  ata: PublicKey;
  poolId: PublicKey;
  bullxPoolAddress?: PublicKey;
}

export function CreateCoin() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<string>("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [createdCoin, setCreatedCoin] = useState<CreatedCoin | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [transactionInProgress, setTransactionInProgress] = useState(false);
  const [step, setStep] = useState<
    "basic" | "metadata" | "liquidity" | "complete"
  >("basic");
  const [createdMint, setCreatedMint] = useState<PublicKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    symbol: "",
    description: "",
    initialSupply: DEFAULTS.INITIAL_SUPPLY,
    initialPrice: DEFAULTS.INITIAL_PRICE,
    tokenAmount: DEFAULTS.TOKEN_AMOUNT,
    decimals: DEFAULTS.DECIMALS,
    solAmount: DEFAULTS.SOL_AMOUNT,
    bullxEnabled: false,
    buyTaxEnabled: false,
    sellTaxEnabled: false,
    reflectionEnabled: false,
    image: null,
  });

  // Add image preview URL state
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Update the common input class styles
  const inputClassName = `block w-full rounded-lg border ${
    errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
  } px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100`;

  // Update the textarea class styles
  const textareaClassName = `block w-full rounded-lg border ${
    errors.description
      ? "border-red-500"
      : "border-gray-300 dark:border-gray-600"
  } px-4 py-3 text-base shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100`;

  // Rate limit configuration
  const RATE_LIMIT_DELAY = 60000; // 1 minute between submissions
  const MAX_RETRIES = 3;
  const [retryCount, setRetryCount] = useState(0);

  // Add wallet connection monitoring
  useEffect(() => {
    if (wallet.publicKey) {
      setIsWalletReady(true);
      // Clear any previous wallet-related errors
      setErrors((prev) => ({
        ...prev,
        submit: undefined,
      }));
    } else {
      setIsWalletReady(false);
    }
  }, [wallet.publicKey]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation - prevent XSS and ensure proper length
    const sanitizedName = formData.name.trim().replace(/[<>]/g, "");
    if (!sanitizedName) {
      newErrors.name = "Name is required";
    } else if (sanitizedName.length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(sanitizedName)) {
      newErrors.name =
        "Name can only contain letters, numbers, spaces, hyphens, and underscores";
    }

    // Symbol validation - strict format for trading compatibility
    const sanitizedSymbol = formData.symbol.trim().toUpperCase();
    if (!sanitizedSymbol) {
      newErrors.symbol = "Symbol is required";
    } else if (!/^[A-Z0-9]{2,10}$/.test(sanitizedSymbol)) {
      newErrors.symbol = "Symbol must be 2-10 uppercase letters/numbers";
    }

    // Description validation - prevent XSS and check length
    const sanitizedDescription = formData.description
      .trim()
      .replace(/[<>]/g, "");
    if (sanitizedDescription.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    // Advanced options validation with strict number checks
    if (showAdvanced) {
      // Initial supply validation
      const supply = parseFloat(formData.initialSupply);
      if (isNaN(supply) || supply <= 0 || supply > 1000000000000) {
        newErrors.initialSupply =
          "Initial supply must be between 1 and 1 trillion";
      }

      // Initial price validation
      const price = parseFloat(formData.initialPrice);
      if (isNaN(price) || price < 0.000001 || price > 1000) {
        newErrors.initialPrice =
          "Initial price must be between 0.000001 and 1000 SOL";
      }

      // Token amount validation
      const tokenAmount = parseFloat(formData.tokenAmount);
      if (isNaN(tokenAmount) || tokenAmount <= 0 || tokenAmount > supply) {
        newErrors.tokenAmount =
          "Token amount must be positive and less than initial supply";
      }

      // Decimals validation
      const decimals = parseInt(formData.decimals);
      if (isNaN(decimals) || decimals < 0 || decimals > 9) {
        newErrors.decimals = "Decimals must be between 0 and 9";
      }

      // SOL amount validation
      const solAmount = parseFloat(formData.solAmount);
      if (isNaN(solAmount) || solAmount < 0.1 || solAmount > 100000) {
        newErrors.solAmount = "SOL amount must be between 0.1 and 100,000";
      }

      // Cross-field validation
      if (tokenAmount > supply) {
        newErrors.tokenAmount = "Liquidity amount cannot exceed initial supply";
      }

      // Ensure sufficient SOL balance with buffer
      if (wallet.publicKey) {
        const requiredSOL = solAmount + 0.2; // Base amount + buffer for fees
        connection.getBalance(wallet.publicKey).then((balance) => {
          if (balance < requiredSOL * LAMPORTS_PER_SOL) {
            newErrors.solAmount = `Insufficient SOL balance. Need ${requiredSOL} SOL`;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add secure image handling function
  const validateAndProcessImage = async (file: File): Promise<boolean> => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Please upload a valid JPG, PNG, or GIF file",
      }));
      return false;
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        image: "Image must be less than 5MB",
      }));
      return false;
    }

    // Validate image dimensions
    try {
      const dimensions = await new Promise<{ width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        }
      );

      // Check dimensions (max 2000x2000)
      if (dimensions.width > 2000 || dimensions.height > 2000) {
        setErrors((prev) => ({
          ...prev,
          image: "Image dimensions must be 2000x2000 pixels or less",
        }));
        return false;
      }

      // Validate aspect ratio (should be close to square)
      const aspectRatio = dimensions.width / dimensions.height;
      if (aspectRatio < 0.75 || aspectRatio > 1.33) {
        setErrors((prev) => ({
          ...prev,
          image: "Image should be approximately square (1:1 aspect ratio)",
        }));
        return false;
      }
    } catch (error) {
      console.error("Error validating image:", error);
      setErrors((prev) => ({
        ...prev,
        image: "Failed to validate image. Please try another file.",
      }));
      return false;
    }

    return true;
  };

  // Update image handling function
  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image must be less than 5MB",
        }));
        return;
      }

      // Validate file type
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          image: "Only JPEG, PNG and GIF images are allowed",
        }));
        return;
      }

      // Clear any previous errors
      setErrors((prev) => ({ ...prev, image: undefined }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setFormData((prev) => ({ ...prev, image: file }));
    },
    []
  );

  // Add cleanup for image preview URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleCreateBasicToken = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload image first if provided
      let imageUri = "";
      if (formData.image) {
        try {
          setStatus("Uploading image...");
          imageUri = await uploadTokenImage(formData.image, wallet, connection);
          console.log("Image uploaded successfully:", imageUri);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      setStatus("Creating token...");
      const result = await createBasicToken(
        connection,
        wallet.publicKey,
        wallet.signTransaction,
        {
          name: formData.name,
          symbol: formData.symbol,
          decimals: parseInt(formData.decimals),
          initialSupply: parseFloat(formData.initialSupply),
          image: imageUri, // Add image URI to token metadata
        }
      );

      setCreatedMint(result.mint);

      // Create metadata immediately after token creation
      if (result.mint) {
        setStatus("Adding metadata...");
        await addMetadata(
          connection,
          result.mint,
          wallet.publicKey,
          wallet.signTransaction,
          {
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description,
            decimals: parseInt(formData.decimals),
            initialSupply: parseFloat(formData.initialSupply),
            image: imageUri, // Add image URI to metadata
          }
        );
      }

      setStep("metadata");
      toast.success("Token created successfully with metadata!");
    } catch (err) {
      console.error("Error creating token:", err);
      setError(err instanceof Error ? err.message : "Failed to create token");
      toast.error("Failed to create token");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const handleAddMetadata = async () => {
    if (!createdMint || !wallet.publicKey || !wallet.signTransaction) return;
    setIsLoading(true);
    setError(null);

    try {
      // Upload image if it hasn't been uploaded yet
      let imageUri = "";
      if (formData.image) {
        try {
          setStatus("Uploading image...");
          imageUri = await uploadTokenImage(formData.image, wallet, connection);
          console.log("Image uploaded successfully:", imageUri);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      setStatus("Adding metadata...");
      await addMetadata(
        connection,
        createdMint,
        wallet.publicKey,
        wallet.signTransaction,
        {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          decimals: parseInt(formData.decimals),
          initialSupply: parseFloat(formData.initialSupply),
          image: imageUri, // Add image URI to metadata
        }
      );

      setStep("liquidity");
      toast.success("Metadata added successfully!");
    } catch (err) {
      console.error("Error adding metadata:", err);
      setError(err instanceof Error ? err.message : "Failed to add metadata");
      toast.error("Failed to add metadata");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const handleAddLiquidity = async () => {
    if (!createdMint || !wallet.publicKey || !wallet.signTransaction) return;
    setIsLoading(true);
    setError(null);

    try {
      await addLiquidityPool(
        connection,
        createdMint,
        wallet.publicKey,
        wallet.signTransaction,
        parseFloat(formData.solAmount),
        parseFloat(formData.tokenAmount)
      );

      setStep("complete");
      toast.success("Liquidity pool added successfully!");
    } catch (err) {
      console.error("Error adding liquidity:", err);
      setError(err instanceof Error ? err.message : "Failed to add liquidity");
      toast.error("Failed to add liquidity");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateToken = async () => {
    try {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);
      setErrors({});

      // Upload image first if provided
      let imageUri = "";
      if (formData.image) {
        imageUri = await uploadTokenImage(formData.image, wallet, connection);
      }

      // Create token with metadata
      const result = await createTokenWithMetadata(
        {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          decimals: parseInt(formData.decimals),
          initialSupply: parseFloat(formData.initialSupply),
          imageUri,
        },
        wallet,
        connection
      );

      // Add liquidity pool if enabled
      if (formData.bullxEnabled) {
        await addLiquidityPool(
          connection,
          result.mint,
          wallet.publicKey,
          wallet.signTransaction,
          parseFloat(formData.solAmount),
          parseFloat(formData.tokenAmount)
        );
      }

      toast.success("Token created successfully!");
    } catch (error) {
      console.error("Error creating token:", error);
      setErrors((prev) => ({
        ...prev,
        submit:
          error instanceof TokenError
            ? error.message
            : "Failed to create token",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const renderStepContent = () => {
    switch (step) {
      case "basic":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Token Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white 
                         focus:border-blue-500 focus:ring-blue-500"
                placeholder="My Token"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white 
                         focus:border-blue-500 focus:ring-blue-500"
                placeholder="TKN"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white 
                         focus:border-blue-500 focus:ring-blue-500"
                rows={3}
                placeholder="Describe your token..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Token Image
              </label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="flex-shrink-0 h-24 w-24 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                    id="token-image"
                  />
                  <label
                    htmlFor="token-image"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                             shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 
                             bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 
                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                             cursor-pointer"
                  >
                    Upload Image
                  </label>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG or GIF. Max 5MB. Square image recommended.
                  </p>
                  {errors.image && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                      {errors.image}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Initial Supply
              </label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white 
                         focus:border-blue-500 focus:ring-blue-500"
                placeholder="1000000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Decimals
              </label>
              <input
                type="number"
                name="decimals"
                value={formData.decimals}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white 
                         focus:border-blue-500 focus:ring-blue-500"
                placeholder="9"
                min="0"
                max="9"
                required
              />
            </div>

            {/* Display validation errors if any */}
            {Object.keys(errors).length > 0 &&
              Object.values(errors).filter(Boolean).length > 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                    {Object.entries(errors).map(
                      ([field, error]) => error && <li key={field}>{error}</li>
                    )}
                  </ul>
                </div>
              )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleCreateBasicToken}
                disabled={isLoading || !isWalletReady}
                className={`px-6 py-3 rounded-lg font-medium text-white 
                          ${
                            isLoading || !isWalletReady
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700"
                          } transition-colors duration-200`}
              >
                {!isWalletReady ? (
                  "Connect Wallet to Continue"
                ) : isLoading ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating Token...
                  </div>
                ) : (
                  "Create Token"
                )}
              </button>
            </div>
          </div>
        );

      case "metadata":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Add Metadata (Optional)</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddMetadata}
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? "Adding..." : "Add Metadata"}
              </button>
              <button
                onClick={() => setStep("liquidity")}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Skip
              </button>
            </div>
          </div>
        );

      case "liquidity":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Add Liquidity (Optional)</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                SOL Amount
              </label>
              <input
                type="text"
                name="solAmount"
                value={formData.solAmount}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Token Amount
              </label>
              <input
                type="text"
                name="tokenAmount"
                value={formData.tokenAmount}
                onChange={handleFormChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleAddLiquidity}
                disabled={isLoading}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? "Adding..." : "Add Liquidity"}
              </button>
              <button
                onClick={() => setStep("complete")}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Skip
              </button>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Token Created Successfully!
            </h2>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                Your token has been created with address:{" "}
                <span className="font-mono">{createdMint?.toString()}</span>
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href={`/portfolio?token=${createdMint?.toString()}`}
                className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
              >
                View Token in Portfolio
              </a>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      {renderStepContent()}
    </div>
  );
}
