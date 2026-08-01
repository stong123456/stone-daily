export interface AdminOverview {
  generatedAt: string;
  accounts: { total: number; active7d: number; syncRevisions: number };
  productData: { watchlistItems: number; alerts: number; pauseRecords: number };
  walletAuth: { challenges24h: number; completed24h: number };
}
