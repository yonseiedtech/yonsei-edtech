import type { AlumniThesis } from "@/types";
import { yearFrom } from "./shared";

/** 제목 토큰화: 어절 단위 + 짧은 조사/접속사 제외 */
const TOKEN_STOPWORDS = new Set([
  // 조사/어미
  "을", "를", "이", "가", "은", "는", "의", "에", "과", "와",
  "에서", "으로", "로", "도", "에게", "한", "할", "한다", "하는",
  "에는", "에도", "있는", "위한", "통한", "관한",
  "대한", "대해", "관련", "대상", "관련된", "위해",
  "및", "그리고", "또는", "혹은", "등", "등의",
  // 메타 단어
  "연구", "분석", "조사", "고찰", "탐색", "검증", "비교", "사례",
  "방안", "효과", "영향", "관계", "차이",
  // 단위/꾸밈
  "중심으로", "중심", "기반", "기반의", "통해", "있어서", "통한",
]);

const PUNCT_RE = /[「」『』<>()\[\]·,.\-_/'"\d:;%~!?’‘“”\-—–]/g;

export function tokenizeTitle(title: string): string[] {
  return title
    .replace(PUNCT_RE, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !TOKEN_STOPWORDS.has(w));
}

export function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) {
    out.push(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

export interface NgramItem {
  ngram: string;
  count: number;
  byYear: Record<number, number>;
}

/** Top N-gram with year distribution */
export function topNgrams(
  theses: AlumniThesis[],
  n: 2 | 3,
  topN: number = 30,
): NgramItem[] {
  const counts = new Map<string, number>();
  const yearMap = new Map<string, Record<number, number>>();
  theses.forEach((t) => {
    const y = yearFrom(t);
    if (y == null) return;
    const tokens = tokenizeTitle(t.title ?? "");
    const grams = ngrams(tokens, n);
    grams.forEach((g) => {
      counts.set(g, (counts.get(g) ?? 0) + 1);
      const yr = yearMap.get(g) ?? {};
      yr[y] = (yr[y] ?? 0) + 1;
      yearMap.set(g, yr);
    });
  });
  return Array.from(counts.entries())
    .map(([ngram, count]) => ({ ngram, count, byYear: yearMap.get(ngram) ?? {} }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/** 4축 분류 사전 */
export const TYPE_DICTS = {
  quantQual: {
    quant: ["효과", "영향", "차이", "관계", "예측", "변인", "상관", "검증", "평가"],
    qual: ["사례", "경험", "인식", "의미", "현상", "내러티브", "이해", "탐색"],
  },
  devAnalyze: {
    dev: ["개발", "설계", "구축", "구현", "제작", "제안"],
    analyze: ["분석", "비교", "검증", "고찰", "조사"],
  },
} as const;

/** 응용 맥락 (한 논문이 여러 맥락에 속할 수 있음) */
export const CONTEXT_DICT = {
  "초·중등": ["초등", "중등", "고등", "중학", "고교", "초교", "중학교", "고등학교", "초등학교"],
  "대학·대학원": ["대학", "대학생", "대학원", "전공"],
  "성인·평생": ["성인", "평생교육", "직장", "근로자", "기업", "재직"],
  "유아·영재": ["유아", "영재", "어린이"],
  "특수·기타": ["특수", "장애", "이주", "북한이탈"],
} as const;

/** 연구 대상자 (한 논문이 여러 대상에 속할 수 있음) */
export const AUDIENCE_DICT = {
  "학생": ["학생", "학습자", "수험생", "재학생"],
  "교사": ["교사", "교원", "강사", "튜터", "예비교사", "교수자", "교사들"],
  "학부모": ["학부모", "부모"],
  "성인학습자": ["성인", "직장인", "근로자", "재직자"],
  "유아·아동": ["유아", "아동", "어린이"],
  "관리자": ["관리자", "운영자", "행정", "경영진"],
} as const;

interface ClassifyResult {
  quant: boolean;
  qual: boolean;
  dev: boolean;
  analyze: boolean;
  contexts: string[]; // matched context labels
  audiences: string[]; // matched audience labels
}

export function classifyTitle(title: string): ClassifyResult {
  const text = title;
  const has = (words: readonly string[]) => words.some((w) => text.includes(w));
  const contexts: string[] = [];
  for (const [label, words] of Object.entries(CONTEXT_DICT)) {
    if (has(words)) contexts.push(label);
  }
  const audiences: string[] = [];
  for (const [label, words] of Object.entries(AUDIENCE_DICT)) {
    if (has(words)) audiences.push(label);
  }
  return {
    quant: has(TYPE_DICTS.quantQual.quant),
    qual: has(TYPE_DICTS.quantQual.qual),
    dev: has(TYPE_DICTS.devAnalyze.dev),
    analyze: has(TYPE_DICTS.devAnalyze.analyze),
    contexts,
    audiences,
  };
}

export function eraOf(year: number): string {
  if (year < 2000) return "이전";
  if (year <= 2004) return "2000–04";
  if (year <= 2009) return "2005–09";
  if (year <= 2014) return "2010–14";
  if (year <= 2019) return "2015–19";
  return "2020–";
}

export const ERA_ORDER = ["2000–04", "2005–09", "2010–14", "2015–19", "2020–"] as const;
