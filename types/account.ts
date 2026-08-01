import type { CalmRecord, MarketAlert, UIMode } from "@/types/market";

export interface StoneSyncPayload {
  product: "Stone Daily";
  version: 1;
  updatedAt: string;
  mode: UIMode;
  language: "zh" | "en";
  watchlistIds: string[];
  records: CalmRecord[];
  alerts: MarketAlert[];
}

export interface AccountSyncSnapshot {
  walletAddress: `0x${string}`;
  isAdmin: boolean;
  payload: StoneSyncPayload;
  revision: number;
  updatedAt: string;
}
