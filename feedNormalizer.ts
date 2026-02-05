import { Author, Category, FeedData, FeedItem, FeedPayload } from './types';

type UnknownRecord = Record<string, unknown>;

const FEED_ITEM_ARRAY_KEYS = ['items', 'articles', 'entries', 'results', 'data', 'stories', 'posts', 'records'];
const AVERAGE_READING_SPEED_WPM = 200;
const DEFAULT_ITEM_TITLE = 'Untitled Story';
const DEFAULT_PUBLICATION_NAME = 'Unknown Publication';
const MAX_FEED_TRAVERSAL_DEPTH = 2;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map(coerceString).filter(Boolean).join('; ');
  }
  if (isRecord(value)) {
    return coerceString(
      value['name'] ??
        value['title'] ??
        value['text'] ??
        value['value'] ??
        value['url'] ??
        value['href'] ??
        value['link'] ??
        value['id'] ??
        value['slug']
    );
  }
  return '';
};

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    const text = coerceString(value);
    if (text) return text;
  }
  return '';
};

const coerceDate = (value: unknown): Date | null => {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const pickDateString = (...values: unknown[]): string => {
  for (const value of values) {
    const date = coerceDate(value);
    if (date) return date.toISOString();
  }
  return new Date().toISOString();
};

const formatLimitDate = (value: unknown, fallback?: unknown): string => {
  const date = coerceDate(value) ?? coerceDate(fallback) ?? new Date();
  return date.toISOString().split('T')[0];
};

const stripHtml = (value: string): string =>
  value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const createExcerpt = (value: string, length = 220): string => {
  if (!value) return '';
  if (value.length <= length) return value;
  return `${value.slice(0, length).trim()}...`;
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const toCategory = (value: unknown): Category | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const name = value.trim();
    return name ? { name, slug: slugify(name) } : null;
  }
  if (isRecord(value)) {
    const name = pickString(value['name'], value['title'], value['label'], value['slug'], value['id']);
    if (!name) return null;
    const slug = pickString(value['slug'], slugify(name));
    return { name, slug };
  }
  return null;
};

const normalizeCategories = (values: unknown[]): Category[] => {
  const collected: unknown[] = [];
  values.forEach(value => {
    if (!value) return;
    if (Array.isArray(value)) {
      collected.push(...value);
    } else {
      collected.push(value);
    }
  });

  const categories = collected.map(toCategory).filter(Boolean) as Category[];
  const seen = new Set<string>();
  return categories.filter(category => {
    const key = category.slug || category.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeAuthors = (value: unknown): Author[] => {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  const authors = entries
    .map(entry => {
      if (typeof entry === 'string') {
        const name = entry.replace(/^by\s+/i, '').trim();
        return name ? { name, profileUrl: null } : null;
      }
      if (isRecord(entry)) {
        const name = pickString(
          entry['name'],
          entry['fullName'],
          entry['full_name'],
          entry['byline'],
          entry['author'],
          entry['title']
        );
        if (!name) return null;
        const profileUrl = pickString(entry['profileUrl'], entry['profile_url'], entry['url'], entry['href'], entry['link']);
        return { name: name.replace(/^by\s+/i, '').trim(), profileUrl: profileUrl || null };
      }
      return null;
    })
    .filter(Boolean) as Author[];

  const seen = new Set<string>();
  return authors.filter(author => {
    const key = author.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const countWords = (value: string): number => {
  const cleaned = stripHtml(value);
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
};

const pickNumber = (...values: unknown[]): number => {
  for (const value of values) {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0;
};

const extractImage = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const resolved = extractImage(entry);
      if (resolved) return resolved;
    }
    return '';
  }
  if (isRecord(value)) {
    return (
      coerceString(value['url']) ||
      coerceString(value['src']) ||
      coerceString(value['href']) ||
      coerceString(value['link']) ||
      coerceString(value['image']) ||
      coerceString(value['thumbnail']) ||
      coerceString(value['content'])
    );
  }
  return '';
};

const normalizeFeedItem = (
  raw: unknown,
  context: { feedId: string; defaultPublication: string; defaultUrl: string; fetchedAt: string },
  index: number
): FeedItem => {
  const item = isRecord(raw) ? raw : { value: raw };
  const title =
    pickString(item['title'], item['headline'], item['name'], item['subject'], item['summary'], item['description']) ||
    DEFAULT_ITEM_TITLE;
  const url =
    pickString(item['url'], item['link'], item['href'], item['permalink'], item['webUrl'], item['uri'], context.defaultUrl) || '';
  const publication = pickString(
    item['publication'],
    item['source'],
    item['publisher'],
    item['site'],
    item['siteName'],
    context.defaultPublication,
    context.feedId,
    DEFAULT_PUBLICATION_NAME
  );

  const bylineText = pickString(item['byline'], item['author'], item['creator'], item['authors']);
  let authors = normalizeAuthors(item['authors'] ?? item['author'] ?? item['creator'] ?? item['contributors'] ?? item['byline']);
  if (authors.length === 0 && bylineText) {
    const cleaned = bylineText.replace(/^by\s+/i, '').trim();
    if (cleaned) authors = [{ name: cleaned, profileUrl: null }];
  }

  const publishedAt = pickDateString(
    item['publishedAt'],
    item['pubDate'],
    item['published'],
    item['date'],
    item['createdAt'],
    item['created_at'],
    item['updatedAt'],
    item['updated_at'],
    context.fetchedAt
  );
  const updatedAt = pickDateString(item['updatedAt'], item['updated_at'], item['modified'], item['updated'], publishedAt);

  let summary = pickString(
    item['summary'],
    item['description'],
    item['excerpt'],
    item['abstract'],
    item['lead'],
    item['contentSnippet'],
    item['teaser'],
    item['subheadline']
  );
  summary = summary ? stripHtml(summary) : '';

  const bodyHtml =
    pickString(item['bodyHtml'], item['content_html'], item['contentHtml'], item['content'], item['body'], item['html']) || '';
  if (!summary && bodyHtml) summary = createExcerpt(stripHtml(bodyHtml));

  const image =
    extractImage(item['image']) ||
    extractImage(item['imageUrl']) ||
    extractImage(item['image_url']) ||
    extractImage(item['thumbnail']) ||
    extractImage(item['thumbnailUrl']) ||
    extractImage(item['urlToImage']) ||
    extractImage(item['media']) ||
    extractImage(item['enclosure']) ||
    extractImage(item['enclosures']) ||
    '';

  const categories = normalizeCategories([
    item['categories'],
    item['category'],
    item['section'],
    item['sectionName'],
    item['tags'],
    item['topics'],
    item['keywords']
  ]);
  const primaryCategory =
    toCategory(item['primaryCategory'] ?? item['primary_category'] ?? item['section'] ?? item['category']) ??
    categories[0] ??
    null;

  const region = pickString(item['region'], item['location'], item['country'], item['locale']) || null;
  let wordcount = pickNumber(item['wordcount'], item['wordCount'], item['word_count'], item['words']);
  if (!wordcount) {
    wordcount = summary ? countWords(summary) : bodyHtml ? countWords(bodyHtml) : 0;
  }
  let readtime = pickNumber(item['readtime'], item['readTime'], item['read_time']);
  if (!readtime) {
    readtime = wordcount ? Math.max(1, Math.round(wordcount / AVERAGE_READING_SPEED_WPM)) : 0;
  }

  const id =
    pickString(item['id'], item['guid'], item['uuid'], item['slug'], item['url'], item['link'], item['uri']) ||
    `${context.feedId}-${index + 1}`;

  return {
    id,
    url,
    title,
    publication,
    byline: bylineText ? bylineText.replace(/^by\s+/i, '').trim() : null,
    authors,
    publishedAt,
    updatedAt,
    summary,
    bodyHtml: bodyHtml || null,
    image: image || null,
    primaryCategory,
    categories,
    region,
    wordcount,
    readtime
  };
};

const looksLikeFeed = (value: unknown): boolean =>
  isRecord(value) &&
  (Array.isArray(value['items']) || typeof value['feedId'] === 'string' || typeof value['totalItems'] === 'number');

const findItems = (payload: unknown): { items: unknown[]; meta: UnknownRecord } => {
  if (Array.isArray(payload)) return { items: payload, meta: {} };
  if (!isRecord(payload)) return { items: [], meta: {} };

  for (const key of FEED_ITEM_ARRAY_KEYS) {
    if (Array.isArray(payload[key])) {
      return { items: payload[key] as unknown[], meta: payload };
    }
  }

  const candidates: { items: unknown[]; meta: UnknownRecord }[] = [];
  const walk = (value: unknown, depth: number, meta: UnknownRecord) => {
    if (!isRecord(value) || depth > MAX_FEED_TRAVERSAL_DEPTH) return;
    Object.values(value).forEach(child => {
      if (Array.isArray(child) && child.some(item => isRecord(item))) {
        candidates.push({ items: child, meta });
      } else if (isRecord(child)) {
        walk(child, depth + 1, meta);
      }
    });
  };
  walk(payload, 0, payload);
  const best = candidates.sort((a, b) => b.items.length - a.items.length)[0];
  return best ?? { items: [], meta: payload };
};

const normalizeFeedData = (payload: unknown, sourceLabel: string, index: number): FeedData => {
  const { items, meta } = findItems(payload);
  const feedInfo = isRecord(payload) ? payload : meta;

  const fallbackId = `${sourceLabel}${index > 0 ? `-${index + 1}` : ''}`;
  const feedId = pickString(
    feedInfo['feedId'],
    feedInfo['id'],
    feedInfo['slug'],
    feedInfo['name'],
    feedInfo['title'],
    feedInfo['source'],
    fallbackId
  );
  const fetchedAt = pickDateString(
    feedInfo['fetchedAt'],
    feedInfo['fetched_at'],
    feedInfo['updatedAt'],
    feedInfo['updated_at'],
    feedInfo['lastUpdated'],
    new Date()
  );
  const limitDate = formatLimitDate(feedInfo['limitDate'], fetchedAt);
  const defaultPublication = pickString(
    feedInfo['publication'],
    feedInfo['source'],
    feedInfo['publisher'],
    feedInfo['name'],
    feedInfo['title'],
    sourceLabel,
    feedId
  );
  const defaultUrl = pickString(feedInfo['url'], feedInfo['link'], feedInfo['homepage']);

  const normalizedItems = items.map((item, itemIndex) =>
    normalizeFeedItem(item, { feedId, defaultPublication, defaultUrl, fetchedAt }, itemIndex)
  );

  return {
    feedId,
    fetchedAt,
    limitDate,
    totalItems: typeof feedInfo['totalItems'] === 'number' ? (feedInfo['totalItems'] as number) : normalizedItems.length,
    items: normalizedItems
  };
};

export const normalizeFeedPayload = (payload: FeedPayload | unknown, sourceLabel = 'feed'): FeedData[] => {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return [];
    if (payload.every(looksLikeFeed)) {
      return payload.map((feed, index) => normalizeFeedData(feed, sourceLabel, index));
    }
    return [normalizeFeedData({ items: payload }, sourceLabel, 0)];
  }
  return [normalizeFeedData(payload, sourceLabel, 0)];
};
