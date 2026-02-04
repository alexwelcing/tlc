export interface Author {
  name: string;
  profileUrl: string | null;
}

export interface Category {
  name: string;
  slug: string;
}

export interface FeedItem {
  id: string;
  originalId?: string; // Preserves the original ID from the JSON
  url: string;
  title: string;
  publication: string;
  byline: string | null;
  authors: Author[];
  publishedAt: string;
  updatedAt: string;
  summary: string;
  bodyHtml: string | null;
  image: string | null;
  primaryCategory: Category | null;
  categories: Category[];
  region: string | null;
  wordcount: number;
  readtime: number;
  source?: string; // Tracks the filename or feed ID
}

export interface FeedData {
  feedId: string;
  fetchedAt: string;
  limitDate: string;
  items: FeedItem[];
  totalItems: number;
}

export type ViewMode = 'feed' | 'analytics' | 'table';

export type FeedPayload = FeedData | FeedData[];

export interface EmbeddedFeedConfig {
  feedUrl?: string;
  feedData?: FeedPayload;
  sourceLabel?: string;
}

declare global {
  interface Window {
    legalChronicleConfig?: EmbeddedFeedConfig;
    legalChronicle?: {
      loadFeed?: (payload: FeedPayload, sourceLabel?: string) => void;
    };
  }
}
