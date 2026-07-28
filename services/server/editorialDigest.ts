import { buildDailyHotspots } from "@/services/editorialRanking";
import {
  containsHan,
  extractShareHeadline,
  isShareableMarketStory,
} from "@/services/editorialSharing";
import type {
  EditorialDigest,
  EditorialDigestItem,
  EditorialFeedItem,
} from "@/types/market";

type TranslationResponse = {
  responseData?: { translatedText?: string };
  responseStatus?: number;
};

const SUCCESS_CACHE_MS = 24 * 60 * 60 * 1_000;
const FAILURE_CACHE_MS = 5 * 60 * 1_000;
const DIGEST_CACHE_MS = 30 * 60 * 1_000;
const SHARE_DIGEST_LIMIT = 6;
const SHARE_DIGEST_CANDIDATE_LIMIT = 10;
const translationCache = new Map<string, { value: string | null; expiresAt: number }>();
let digestCache: { value: { zh: EditorialDigest; en: EditorialDigest }; expiresAt: number } | null = null;

function decodeTranslationEntities(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function matchesTargetLanguage(value: string, language: "zh" | "en") {
  return language === "zh" ? containsHan(value) : !containsHan(value);
}

async function translateHeadline(value: string, language: "zh" | "en") {
  const headline = extractShareHeadline(value);
  if (matchesTargetLanguage(headline, language)) return headline;

  const key = `${language}:${headline}`;
  const cached = translationCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) translationCache.delete(key);

  const sourceLanguage = containsHan(headline) ? "zh-CN" : "en";
  const targetLanguage = language === "zh" ? "zh-CN" : "en";
  const search = new URLSearchParams({ q: headline.slice(0, 420), langpair: `${sourceLanguage}|${targetLanguage}` });
  const contactEmail = process.env.TRANSLATION_CONTACT_EMAIL?.trim();
  if (contactEmail) search.set("de", contactEmail);

  try {
    const response = await fetch(`https://api.mymemory.translated.net/get?${search.toString()}`, {
      headers: { "User-Agent": "StoneDaily/1.0 (+https://stonedaily.xyz)" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`translation ${response.status}`);
    const payload = await response.json() as TranslationResponse;
    const translated = decodeTranslationEntities(payload.responseData?.translatedText ?? "").replace(/\s+/g, " ").trim();
    const result = payload.responseStatus === 200 && translated && matchesTargetLanguage(translated, language)
      ? translated
      : null;
    translationCache.set(key, {
      value: result,
      expiresAt: Date.now() + (result ? SUCCESS_CACHE_MS : FAILURE_CACHE_MS),
    });
    return result;
  } catch {
    translationCache.set(key, { value: null, expiresAt: Date.now() + FAILURE_CACHE_MS });
    return null;
  }
}

function titleBigrams(value: string) {
  const compact = value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
  const grams = new Set<string>();
  for (let index = 0; index < compact.length - 1; index += 1) grams.add(compact.slice(index, index + 2));
  return grams;
}

function titleSimilarity(left: string, right: string) {
  const leftGrams = titleBigrams(left);
  const rightGrams = titleBigrams(right);
  if (leftGrams.size === 0 || rightGrams.size === 0) return 0;
  let overlap = 0;
  leftGrams.forEach((gram) => {
    if (rightGrams.has(gram)) overlap += 1;
  });
  return overlap / Math.min(leftGrams.size, rightGrams.size);
}

function mergeDigestItem(target: EditorialDigestItem, incoming: EditorialDigestItem) {
  const sources = new Map(target.sources.map((source) => [source.name, source]));
  incoming.sources.forEach((source) => {
    if (!sources.has(source.name)) sources.set(source.name, source);
  });
  target.sources = [...sources.values()];
  target.relatedAssets = [...new Set([...target.relatedAssets, ...incoming.relatedAssets])].slice(0, 5);
}

async function buildLocalizedDigest(items: EditorialFeedItem[], language: "zh" | "en"): Promise<EditorialDigest> {
  const candidates = buildDailyHotspots(items.filter(isShareableMarketStory), SHARE_DIGEST_CANDIDATE_LIMIT, language);
  const localized = await Promise.all(candidates.map(async (item): Promise<EditorialDigestItem | null> => {
    const title = await translateHeadline(item.title, language);
    if (!title) return null;
    return {
      id: item.id,
      category: item.category === "币股" ? "币股" : "币圈",
      title,
      relatedAssets: item.relatedAssets,
      sources: item.sources,
      publishedAt: item.publishedAt,
    };
  }));

  const deduped: EditorialDigestItem[] = [];
  localized.forEach((item) => {
    if (!item) return;
    const match = deduped.find((existing) => {
      if (existing.category !== item.category) return false;
      const sharedAsset = item.relatedAssets.some((asset) => existing.relatedAssets.includes(asset));
      return titleSimilarity(existing.title, item.title) >= (sharedAsset ? 0.28 : 0.5);
    });
    if (match) {
      mergeDigestItem(match, item);
      return;
    }
    deduped.push(item);
  });

  const selected = deduped.slice(0, SHARE_DIGEST_LIMIT);
  const translatedCount = selected.filter((item) => {
    const source = candidates.find((candidate) => candidate.id === item.id);
    return source ? !matchesTargetLanguage(source.title, language) : false;
  }).length;

  return {
    language,
    items: selected,
    translatedCount,
    mode: translatedCount > 0 ? "translated" : "native-only",
  };
}

export async function buildEditorialDigests(items: EditorialFeedItem[]) {
  if (digestCache && digestCache.expiresAt > Date.now()) return digestCache.value;
  const [zh, en] = await Promise.all([
    buildLocalizedDigest(items, "zh"),
    buildLocalizedDigest(items, "en"),
  ]);
  const value = { zh, en };
  if (zh.items.length > 0 || en.items.length > 0) {
    digestCache = { value, expiresAt: Date.now() + DIGEST_CACHE_MS };
  }
  return value;
}
