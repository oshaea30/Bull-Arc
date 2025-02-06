import React, { useState } from 'react';
import { useTokenCreation } from '../hooks/useTokenCreation';
import { TokenMetadata } from '../services/tokenService';
import { AlertCircle, Check, Info } from 'lucide-react';

export function CreateToken() {
  const { create, isCreating, error } = useTokenCreation();
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<TokenMetadata>({
    name: '',
    symbol: '',
    description: '',
    initialSupply: 1000000,
    decimals: 9
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await create(formData);
    if (result) {
      console.log('Token created:', result);
      setSuccess(true);
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        description: '',
        initialSupply: 1000000,
        decimals: 9
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold dark:text-white">Create Token</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create your own token on Solana devnet
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900 rounded-lg">
        <div className="flex gap-3">
          <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-1" size={20} />
          <div className="space-y-1">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Important Information
            </p>
            <ul className="text-sm text-blue-600 dark:text-blue-400 list-disc list-inside">
              <li>This will create a token on Solana's devnet</li>
              <li>You need devnet SOL to create a token</li>
              <li>Initial supply will be minted to your wallet</li>
            </ul>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900 rounded-lg">
          <div className="flex gap-3">
            <AlertCircle className="text-red-600 dark:text-red-500 shrink-0 mt-1" size={20} />
            <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900 rounded-lg">
          <div className="flex gap-3">
            <Check className="text-green-600 dark:text-green-500 shrink-0 mt-1" size={20} />
            <div>
              <p className="text-sm text-green-600 dark:text-green-500 font-medium">
                Token created successfully!
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Your token has been created on the Solana devnet.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Token Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={e => {
              setSuccess(false);
              setFormData(prev => ({ ...prev, name: e.target.value }));
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="My Token"
            required
            minLength={2}
            maxLength={32}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Symbol
          </label>
          <input
            type="text"
            value={formData.symbol}
            onChange={e => {
              setSuccess(false);
              setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }));
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="TKN"
            required
            minLength={2}
            maxLength={10}
            pattern="[A-Z0-9]+"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            2-10 characters, uppercase letters and numbers only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => {
              setSuccess(false);
              setFormData(prev => ({ ...prev, description: e.target.value }));
            }}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Describe your token..."
            required
            minLength={10}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Initial Supply
          </label>
          <input
            type="number"
            value={formData.initialSupply}
            onChange={e => {
              setSuccess(false);
              setFormData(prev => ({ ...prev, initialSupply: parseInt(e.target.value) }));
            }}
            min="1"
            max="1000000000000"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The total number of tokens to create initially
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Decimals
          </label>
          <select
            value={formData.decimals}
            onChange={e => {
              setSuccess(false);
              setFormData(prev => ({ ...prev, decimals: parseInt(e.target.value) }));
            }}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-white
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          >
            <option value="9">9 (Default)</option>
            <option value="6">6 (Stablecoin)</option>
            <option value="0">0 (Whole numbers only)</option>
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Number of decimal places. Most tokens use 9, stablecoins use 6
          </p>
        </div>

        <button
          type="submit"
          disabled={isCreating}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md
                   shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Token...
            </div>
          ) : (
            'Create Token'
          )}
        </button>
      </form>
    </div>
  );
}