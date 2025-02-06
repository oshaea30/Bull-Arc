import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletIconProps {
  className?: string;
  size?: number;
}

export function WalletIcon({ className = '', size = 16 }: WalletIconProps) {
  return (
    <div className={`rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center ${className}`}>
      <Wallet className="text-white" size={size} />
    </div>
  );
}