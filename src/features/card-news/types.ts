export type CardKind = "cover" | "intro" | "feature" | "cta";

export interface CardSpec {
  id: string;
  kind: CardKind;
  title?: string;
  subtitle?: string;
  english?: string;
  body?: string;
  bullets?: string[];
  badge?: string;
  screenshot?: string;
  page?: string;
}

export interface CardNewsSeries {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  category?: string;
  cards: CardSpec[];
}
