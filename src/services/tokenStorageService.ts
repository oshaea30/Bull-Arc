import { PublicKey } from "@solana/web3.js";
import { StoredToken } from "../types/token";
import { supabase } from "../lib/supabaseClient";

class TokenStorageService {
  private readonly STORAGE_KEY = "stored_tokens";

  saveToken(token: StoredToken): void {
    try {
      const tokens = this.getTokens();
      const existingIndex = tokens.findIndex((t) => t.mint === token.mint);

      if (existingIndex >= 0) {
        // Merge existing data with new data to preserve optional fields
        tokens[existingIndex] = {
          ...tokens[existingIndex],
          ...token,
        };
      } else {
        tokens.push(token);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error("Failed to save token:", error);
    }
  }

  getTokens(): StoredToken[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to get tokens:", error);
      return [];
    }
  }

  getTokenByMint(mint: string): Promise<StoredToken | null> {
    try {
      const tokens = this.getTokens();
      const token = tokens.find((t) => t.mint === mint);
      return Promise.resolve(token || null);
    } catch (error) {
      console.error("Failed to get token by mint:", error);
      return Promise.resolve(null);
    }
  }

  removeToken(mint: string): void {
    try {
      const tokens = this.getTokens().filter((t) => t.mint !== mint);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error("Failed to remove token:", error);
    }
  }

  clearTokens(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear tokens:", error);
    }
  }

  async getRecentTokens(limit: number): Promise<StoredToken[]> {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent tokens:", error);
      return [];
    }

    return data || [];
  }

  async getTopGainers(limit: number): Promise<StoredToken[]> {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .order("price_change_24h", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching top gainers:", error);
      return [];
    }

    return data || [];
  }

  async getMostActive(limit: number): Promise<StoredToken[]> {
    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .order("volume_24h", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching most active tokens:", error);
      return [];
    }

    return data || [];
  }
}

export const tokenStorageService = new TokenStorageService();
