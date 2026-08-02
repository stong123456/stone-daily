export interface AdminAnalyticsPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

export interface AdminAnalyticsBreakdown {
  label: string;
  value: number;
  share: number;
}

export interface AdminAnalyticsOverview {
  available: boolean;
  rangeDays: number;
  today: { visitors: number; pageViews: number; events: number };
  period: { visitors: number; pageViews: number; events: number };
  previousPeriod: { visitors: number; pageViews: number; events: number };
  trend: AdminAnalyticsPoint[];
  topPages: Array<{ path: string; views: number; visitors: number }>;
  sources: AdminAnalyticsBreakdown[];
  devices: AdminAnalyticsBreakdown[];
  browsers: AdminAnalyticsBreakdown[];
  features: Array<{ name: string; count: number }>;
  hourly: Array<{ hour: string; visitors: number; pageViews: number }>;
  retentionDays: number;
}

export interface AdminOverview {
  generatedAt: string;
  accounts: { total: number; active7d: number; syncRevisions: number };
  productData: { watchlistItems: number; alerts: number; pauseRecords: number };
  walletAuth: { challenges24h: number; completed24h: number };
  analytics: AdminAnalyticsOverview;
}
