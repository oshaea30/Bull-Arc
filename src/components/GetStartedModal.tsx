import React from 'react';
import { X, Wallet } from 'lucide-react';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOptions: () => void;
}

export function GetStartedModal({ isOpen, onClose, onViewOptions }: GetStartedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#14151A] text-white rounded-xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-300"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-center mb-8">
          Connect a wallet to get started
        </h2>

        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 
                        flex items-center justify-center">
            <Wallet className="w-12 h-12" />
          </div>
        </div>

        <button
          onClick={onViewOptions}
          className="w-full py-3 px-4 bg-[#6E56CF] hover:bg-[#7C66D5] rounded-lg font-medium
                   transition-colors duration-200 mb-4"
        >
          View Wallet Options
        </button>

        <button
          onClick={onViewOptions}
          className="w-full text-center text-gray-400 hover:text-white transition-colors duration-200"
        >
          Already have a wallet? Connect ▼
        </button>
      </div>
    </div>
  );
}