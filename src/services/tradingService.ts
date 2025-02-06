import { CryptoData } from "../types";

// In-memory storage for user balances and positions
const userBalances: { [key: string]: { [symbol: string]: number } } = {};
const userPositions: { [key: string]: { [symbol: string]: number } } = {};

export const tradingService = {
  // Initialize user account with some demo funds
  initializeAccount(userId: string) {
    if (!userBalances[userId]) {
      userBalances[userId] = { USD: 100000 }; // Start with $100,000 USD
      userPositions[userId] = {};
    }
  },

  // Get user's balance for a specific currency
  getBalance(userId: string, currency: string = "USD"): number {
    return userBalances[userId]?.[currency] || 0;
  },

  // Get user's position for a specific crypto
  getPosition(userId: string, symbol: string): number {
    return userPositions[userId]?.[symbol] || 0;
  },

  // Execute a trade
  executeTrade(
    userId: string,
    crypto: CryptoData,
    amount: number,
    isBuy: boolean
  ): { success: boolean; message: string } {
    const totalCost = amount * crypto.current_price;

    if (!userBalances[userId]) {
      return {
        success: false,
        message: "User account not initialized",
      };
    }

    if (isBuy) {
      // Check if user has enough USD
      if (userBalances[userId].USD < totalCost) {
        return {
          success: false,
          message: "Insufficient funds",
        };
      }

      // Execute buy
      userBalances[userId].USD -= totalCost;
      userPositions[userId][crypto.symbol] =
        (userPositions[userId][crypto.symbol] || 0) + amount;

      return {
        success: true,
        message: `Successfully bought ${amount} ${crypto.symbol}`,
      };
    } else {
      // Check if user has enough crypto
      if (
        !userPositions[userId][crypto.symbol] ||
        userPositions[userId][crypto.symbol] < amount
      ) {
        return {
          success: false,
          message: "Insufficient crypto balance",
        };
      }

      // Execute sell
      userBalances[userId].USD += totalCost;
      userPositions[userId][crypto.symbol] -= amount;

      return {
        success: true,
        message: `Successfully sold ${amount} ${crypto.symbol}`,
      };
    }
  },

  // Get user's portfolio summary
  getPortfolioSummary(userId: string): {
    totalBalance: number;
    positions: { symbol: string; amount: number }[];
  } {
    const positions = Object.entries(userPositions[userId] || {})
      .map(([symbol, amount]) => ({ symbol, amount }))
      .filter((position) => position.amount > 0);

    return {
      totalBalance: userBalances[userId]?.USD || 0,
      positions,
    };
  },
};
