import { buildDailyHotspots } from "@/services/editorialRanking";
import {
  areSameEditorialEvent,
  containsHan,
  getShareDigestCategory,
  isRigorousDigestHeadlineSource,
  isShareableMarketStory,
} from "@/services/editorialSharing";
import type {
  EditorialDigest,
  EditorialDigestItem,
  EditorialFeedItem,
} from "@/types/market";

const DIGEST_CACHE_MS = 30 * 60 * 1_000;
const SHARE_DIGEST_LIMIT = 6;
const SHARE_DIGEST_CANDIDATE_LIMIT = 16;
let digestCache: { value: { zh: EditorialDigest; en: EditorialDigest }; expiresAt: number } | null = null;

function sourceLanguage(value: string): "zh" | "en" {
  return containsHan(value) ? "zh" : "en";
}

function mergeDigestItem(target: EditorialDigestItem, incoming: EditorialDigestItem) {
  const sources = new Map(target.sources.map((source) => [source.name, source]));
  incoming.sources.forEach((source) => {
    if (!sources.has(source.name)) sources.set(source.name, source);
  });
  target.sources = [...sources.values()];
  target.relatedAssets = [...new Set([...target.relatedAssets, ...incoming.relatedAssets])].slice(0, 5);
}

function buildNativeDigest(items: EditorialFeedItem[], language: "zh" | "en"): EditorialDigest {
  const candidates = buildDailyHotspots(
    items.filter((item) => sourceLanguage(item.title) === language
      && isShareableMarketStory(item)
      && isRigorousDigestHeadlineSource(item.title)),
    SHARE_DIGEST_CANDIDATE_LIMIT,
    language,
  );

  const nativeItems = candidates.map((item): EditorialDigestItem => ({
    id: item.id,
    category: getShareDigestCategory(item.title),
    title: item.title,
    originalLanguage: language,
    relatedAssets: item.relatedAssets,
    sources: item.sources,
    publishedAt: item.publishedAt,
  }));

  const deduped: EditorialDigestItem[] = [];
  nativeItems.forEach((item) => {
    const match = deduped.find((existing) => existing.category === item.category
      && areSameEditorialEvent(existing.title, item.title));
    if (match) {
      mergeDigestItem(match, item);
      return;
    }
    deduped.push(item);
  });

  return {
    language,
    items: deduped.slice(0, SHARE_DIGEST_LIMIT),
    mode: "native-only",
  };
}

export async function buildEditorialDigests(items: EditorialFeedItem[]) {
  if (digestCache && digestCache.expiresAt > Date.now()) return digestCache.value;
  const value = {
    zh: buildNativeDigest(items, "zh"),
    en: buildNativeDigest(items, "en"),
  };
  if (value.zh.items.length > 0 || value.en.items.length > 0) {
    digestCache = { value, expiresAt: Date.now() + DIGEST_CACHE_MS };
  }
  return value;
}
