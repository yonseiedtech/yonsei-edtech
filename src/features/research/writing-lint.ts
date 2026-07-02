/**
 * 글쓰기 자가 점검 엔진 (Writing Lint) — 부심 강의 작성 원칙의 기계화 (2026-06-12)
 *
 * 출처: 15주차 작성 5원칙(정확성·객관성·일관성·가독성) + 12주차(차이 vs 인과) + 11주차(효과크기).
 * AI 없이 규칙 기반 순수 함수 — 동일 입력은 항상 동일 결과, 테스트로 검증.
 *
 * 주의: 한국어 자연어 특성상 일부 규칙은 보수적으로 설계(놓침 < 오탐 회피 우선).
 * 모든 지적은 '제안'이며 최종 판단은 작성자의 몫.
 */

import type { WritingPaperChapterKey, WritingSection } from "@/types";

export type LintSeverity = "warn" | "info";

export interface LintIssue {
  chapter: WritingPaperChapterKey;
  /** 발생 섹션 제목 (장 단위 규칙이면 빈 문자열) */
  sectionHeading: string;
  severity: LintSeverity;
  /** 규칙 ID */
  rule: string;
  message: string;
  /** 해당 문구 발췌 (장 단위 규칙이면 빈 문자열) */
  excerpt: string;
}

export type LintSections = Partial<Record<WritingPaperChapterKey, WritingSection[]>>;

const CHAPTERS: WritingPaperChapterKey[] = ["intro", "background", "method", "results", "conclusion"];

export const LINT_CHAPTER_LABELS: Record<WritingPaperChapterKey, string> = {
  intro: "서론",
  background: "이론적 배경",
  method: "연구 방법",
  results: "연구 결과",
  conclusion: "결론",
};

/** 모호 정도부사 — 정확성 원칙 (구체적 수치 권장) */
const VAGUE_ADVERBS = /(매우|크게|상당히|다소|뚜렷이|뚜렷하게|현저히|굉장히|꽤|아주)\s/g;

/**
 * 1인칭/주관 표현 — 객관성 원칙.
 * (?<![가-힣]) 로 "하나는"의 '나는', "우리나라"류 오탐 차단.
 * "연구자는"(권장 표현)·"본 연구"는 매칭하지 않음.
 */
const FIRST_PERSON = /(?<![가-힣])(나는|내가|우리는|우리가|우리의|필자)(?![가-힣])/g;

/** 결과 장 인과 표현 — 12주차: 비교(차이)와 인과(효과)의 수위 구분 */
const CAUSAL_IN_RESULTS = /(영향을 미쳤|효과가 있었|효과를 미쳤)/g;

/** 방법·결과 장 현재형 행위 동사 종결 — 시제 원칙 (보수적: 행위 동사만) */
const PRESENT_TENSE_ACTION = /(실시한다|측정한다|분석한다|검증한다|수집한다|진행한다|투입한다)[.\s]/g;

/** 서론 연구 문제 의문문 추출 */
const RESEARCH_QUESTION = /[^.?!\n]{8,}\?/g;

const LONG_SENTENCE_THRESHOLD = 150;

// ── 번역투·시제/태 문체 점검 규칙 (2026-07-01, writing-tips 42패턴 근거) ──
// ★탐지 전용: 패턴 위치를 표시할 뿐 수정문을 대신 쓰지 않는다(HITL). 최종 판단은 작성자.
// ⚠ 과교정 경계: 패턴 ≠ 무조건 오류. 반복·밀도·발표체만 실제 문제. info 규칙은 정당 용법이면 유지.
const OVERCORRECTION_NOTE = " ※ 패턴이라도 다 고치면 오히려 어색할 수 있습니다 — 반복·밀도만 손보고 정당한 용법은 유지하세요.";

interface StyleRule {
  id: string;
  re: RegExp;
  severity: LintSeverity;
  /** 패턴 이름(표시용) */
  label: string;
  /** 방향 힌트(수정문 아님) */
  hint: string;
  /** 과교정 주의 대상(정당 용법이 흔함) */
  soft?: boolean;
  cap?: number;
}

const STYLE_RULES: StyleRule[] = [
  // 번역투 — 명확한 어법 문제(warn)
  { id: "trans-double-passive", re: /되어지/g, severity: "warn", label: "이중피동 '~되어지다'", hint: "'-되-'와 '-어지-'가 겹친 이중피동입니다. 한 번의 피동으로 충분합니다." },
  { id: "trans-passive-jin", re: /(?:보여|불려|여겨|말해|쓰여|다뤄)(?:진|지[다는고며었질])/g, severity: "warn", label: "부자연스러운 피동 '~여/어지다'", hint: "능동 또는 자연스러운 서술로 쓸 수 있는지 검토하세요." },
  { id: "trans-by", re: /[가-힣]에\s*의(?:해|하여)/g, severity: "warn", label: "피동 '~에 의해'(by)", hint: "행위 주체를 주어로 올려 능동으로 재배치할 수 있는지 보세요." },
  { id: "trans-japanese-isseo", re: /에\s*있어서/g, severity: "warn", label: "'~에 있어서'(일본어투 ~において)", hint: "'~에서/~의 경우/~에 관해'로 바꾸면 자연스럽습니다." },
  { id: "trans-saryo", re: /사료(?:된다|되었다|됨)/g, severity: "warn", label: "'~로 사료된다'", hint: "'~로 보인다/판단된다' 등 명확한 동사로." },
  // 번역투 — 흔해서 과교정 주의(info)
  { id: "trans-exist", re: /존재(?:한다|하는|했다|하며)/g, severity: "info", label: "'존재한다'(there is)", hint: "대개 '있다'로 충분합니다.", soft: true },
  { id: "trans-one-of", re: /중\s*하나(?:이다|다|의|인|가)/g, severity: "info", label: "'~중 하나'(one of)", hint: "복수 강조가 꼭 필요하지 않으면 단순하게 단정하세요.", soft: true },
  { id: "trans-due-to", re: /(?:으로|로)\s*인(?:한|하여|해)/g, severity: "info", label: "'~로 인한/인하여'(due to)", hint: "'~로/~ 때문에'로 간결하게.", soft: true, cap: 4 },
  { id: "trans-fact-that", re: /라는\s*사실/g, severity: "info", label: "'~라는 사실'(the fact that)", hint: "대개 '라는 사실'은 빼도 뜻이 그대로입니다.", soft: true },
  { id: "trans-through", re: /(?:을|를)\s*통(?:해|하여)/g, severity: "info", label: "'~을 통해'(through) 남용", hint: "맥락별로 '~로/~에서/~을 거쳐'로 구체화할 수 있습니다.", soft: true, cap: 3 },
  { id: "trans-about", re: /에\s*대(?:한|하여|해)/g, severity: "info", label: "'~에 대한/대하여'(about) 남용", hint: "목적격 조사(을/를)로 바로 받으면 간결합니다.", soft: true, cap: 3 },
  { id: "trans-japanese-case", re: /의\s*경우/g, severity: "info", label: "'~의 경우'(일본어투) 남용", hint: "빼거나 조사로 바꿔도 되는 자리가 많습니다.", soft: true, cap: 3 },
  { id: "trans-progressive", re: /[가-힣]고\s*있(?:다|었다|으며|는|던)/g, severity: "info", label: "진행형 '~고 있다'(-ing) 남용", hint: "실제 진행 상태가 아니면 단순시제(~한다/했다)가 자연스럽습니다.", soft: true, cap: 3 },
  // 시제·태 — 발표체 헤지, 명사형 종결
  { id: "voice-hedge", re: /(?:볼|설명할|확인할|말할|생각할|이해할)\s*수\s*있다/g, severity: "info", label: "발표체 헤지 '~ㄹ 수 있다'", hint: "사실·정의·결과는 단정하세요. 능력·가능 용법이면 유지합니다.", soft: true, cap: 4 },
  { id: "voice-noun-ending", re: /[가-힣](?:함|임)\.(?=\s|$)/g, severity: "info", label: "명사형 종결 '~함/~임'", hint: "학술 본문은 서술형 '~이다/~한다'로 맺습니다(개조식 지양).", soft: true },
];

/**
 * Phase 4-A (지식 SSOT): 규칙 id → 아카이브 writing-tips 카드 제목 부분문자열.
 * StyleCheckPanel 이 발행된 카드 목록에서 title.includes(힌트) 로 정확한 카드를
 * 찾아 딥링크한다 (규칙=탐지 엔진, 카드=설명·예문의 정본).
 */
export const STYLE_RULE_TIP_HINTS: Record<string, string> = {
  "trans-double-passive": "이중 피동",
  "trans-passive-jin": "부자연스러운 피동",
  "trans-by": "에 의해",
  "trans-japanese-isseo": "에 있어서",
  "trans-saryo": "사료된다",
  "trans-exist": "존재한다",
  "trans-one-of": "중 하나",
  "trans-due-to": "로 인한",
  "trans-fact-that": "라는 사실",
  "trans-through": "을 통해",
  "trans-about": "에 대하여",
  "trans-japanese-case": "의 경우",
  "trans-progressive": "고 있다",
  "voice-hedge": "발표체 헤지",
  "voice-noun-ending": "명사형 종결",
};

/** 어절 끝 조사 제거 — 표기 변형 비교용 (보수적 목록) */
function stripParticle(w: string): string {
  return w.replace(/(이|가|은|는|을|를|의|와|과|도|만|에서|에게|으로|에|로)$/, "");
}

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function excerptAround(text: string, index: number, matchLen: number, radius = 18): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + matchLen + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function collectMatches(
  text: string,
  re: RegExp,
  make: (excerpt: string, matched: string) => Omit<LintIssue, "sectionHeading" | "chapter">,
  chapter: WritingPaperChapterKey,
  sectionHeading: string,
  out: LintIssue[],
  /** 동일 규칙 과다 지적 방지 — 섹션당 최대 건수 */
  cap = 5,
) {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(text)) !== null && count < cap) {
    out.push({ chapter, sectionHeading, ...make(excerptAround(text, m.index, m[0].length), m[0]) });
    count += 1;
  }
}

export function lintThesis(sections: LintSections): LintIssue[] {
  const issues: LintIssue[] = [];

  // ── 일관성: 동일 표현의 띄어쓰기 변형 혼용 (전 장 통합) ──
  // 2어절 이상 한글 연쇄를 무공백 키로 그룹화 — 서로 다른 표기가 각 2회 이상이면 지적.
  const variantMap = new Map<string, Map<string, number>>();

  for (const ch of CHAPTERS) {
    for (const sec of sections[ch] ?? []) {
      for (const p of sec.paragraphs ?? []) {
        const text = (p.text ?? "").trim();
        if (!text) continue;

        // 어절 단위 — 조사 스트립 후 인접 2어절(공백 표기)과 단일 어절(붙임 표기)을 동일 키로 집계
        const words = text
          .split(/\s+/)
          .map((w) => w.replace(/[^가-힣]/g, ""))
          .filter((w) => w.length >= 2);
        const addVariant = (key: string, label: string) => {
          if (key.length < 6 || key.length > 16) return;
          const variants = variantMap.get(key) ?? new Map<string, number>();
          variants.set(label, (variants.get(label) ?? 0) + 1);
          variantMap.set(key, variants);
        };
        for (let wi = 0; wi < words.length; wi++) {
          const solo = stripParticle(words[wi]);
          if (solo) addVariant(solo, solo);
          if (wi + 1 < words.length) {
            const b = stripParticle(words[wi + 1]);
            if (b) addVariant(words[wi] + b, `${words[wi]} ${b}`);
          }
        }
      }
    }
  }
  for (const [, variants] of variantMap) {
    const significant = [...variants.entries()].filter(([, n]) => n >= 2);
    if (significant.length >= 2) {
      issues.push({
        chapter: "intro",
        sectionHeading: "",
        severity: "warn",
        rule: "spacing-variant",
        message: `동일 표현의 표기가 혼용되고 있습니다 — 처음 명명한 표기로 통일하세요 (일관성 원칙): ${significant
          .map(([v, n]) => `"${v}"(${n}회)`)
          .join(" / ")}`,
        excerpt: "",
      });
    }
  }

  // ── 장·섹션 단위 규칙 ──
  for (const ch of CHAPTERS) {
    const secs = sections[ch] ?? [];
    let chapterFullText = "";

    for (const sec of secs) {
      const heading = sec.heading?.trim() ?? "";
      for (const p of sec.paragraphs ?? []) {
        const text = (p.text ?? "").trim();
        if (!text) continue;
        chapterFullText += text + "\n";

        collectMatches(
          text,
          VAGUE_ADVERBS,
          (excerpt, matched) => ({
            severity: "warn",
            rule: "vague-adverb",
            message: `모호한 정도 표현 "${matched.trim()}" — 구체적 수치나 비교 기준으로 바꾸세요 (정확성 원칙).`,
            excerpt,
          }),
          ch,
          heading,
          issues,
        );

        collectMatches(
          text,
          FIRST_PERSON,
          (excerpt, matched) => ({
            severity: "warn",
            rule: "first-person",
            message: `1인칭 표현 "${matched}" — "연구자는" 또는 무주어 문장으로 바꾸세요 (객관성 원칙).`,
            excerpt,
          }),
          ch,
          heading,
          issues,
        );

        // ── 번역투·시제/태 문체 규칙 (전 장 적용, 탐지 전용) ──
        for (const r of STYLE_RULES) {
          collectMatches(
            text,
            r.re,
            (excerpt, matched) => ({
              severity: r.severity,
              rule: r.id,
              message: `문체 점검 — ${r.label}: "${matched.trim()}". ${r.hint}${r.soft ? OVERCORRECTION_NOTE : ""}`,
              excerpt,
            }),
            ch,
            heading,
            issues,
            r.cap ?? 4,
          );
        }

        // 주술 호응: "목적은 ~" 문장이 "~데 있다/것이다"로 받는지 (서론 한정)
        if (ch === "intro") {
          for (const sentence of sentencesOf(text)) {
            if (/목적은/.test(sentence) && !/(데\s*있다|것이다)/.test(sentence)) {
              issues.push({
                chapter: ch,
                sectionHeading: heading,
                severity: "warn",
                rule: "subject-predicate",
                message: `"본 연구의 목적은 ~"으로 시작한 문장은 "~하는 데 있다"로 받아야 주술 호응이 맞습니다.`,
                excerpt: sentence.slice(0, 60) + (sentence.length > 60 ? "…" : ""),
              });
            }
          }
        }

        if (ch === "method" || ch === "results") {
          collectMatches(
            text,
            PRESENT_TENSE_ACTION,
            (excerpt, matched) => ({
              severity: "info",
              rule: "tense",
              message: `행위 동사의 현재형 "${matched.trim()}" — 방법·결과 장은 과거시제(~하였다)가 원칙입니다 (정의·일반 진술은 예외).`,
              excerpt,
            }),
            ch,
            heading,
            issues,
            3,
          );
        }

        if (ch === "results") {
          collectMatches(
            text,
            CAUSAL_IN_RESULTS,
            (excerpt, matched) => ({
              severity: "info",
              rule: "causal-in-results",
              message: `인과 표현 "${matched}" — 결과 장은 "차이가 있었다(비교)" 수위로 기술하고, 인과 해석은 설계 근거와 함께 논의에서 다루세요.`,
              excerpt,
            }),
            ch,
            heading,
            issues,
            3,
          );
        }

        // 가독성: 과도하게 긴 문장
        for (const sentence of sentencesOf(text)) {
          if (sentence.length > LONG_SENTENCE_THRESHOLD) {
            issues.push({
              chapter: ch,
              sectionHeading: heading,
              severity: "info",
              rule: "long-sentence",
              message: `${sentence.length}자 문장 — 둘로 나누면 읽기 쉬워집니다 (가독성 원칙).`,
              excerpt: sentence.slice(0, 50) + "…",
            });
            break; // 섹션당 1건만
          }
        }
      }
    }

    // 장 단위: 결과 장에 p값은 있는데 효과크기가 없음
    if (ch === "results" && /p\s*[<=.]/.test(chapterFullText)) {
      if (!/(효과크기|Cohen|η²|eta|d\s*=)/i.test(chapterFullText)) {
        issues.push({
          chapter: ch,
          sectionHeading: "",
          severity: "info",
          rule: "effect-size-missing",
          message: "p값은 보고됐지만 효과크기(Cohen's d, η²)가 보이지 않습니다 — p값과 함께 효과크기를 보고하는 것이 APA 권장입니다.",
          excerpt: "",
        });
      }
    }
  }

  return issues;
}

export type StyleCategory = "translationese" | "tense-voice";

export const STYLE_CATEGORY_LABELS: Record<StyleCategory, string> = {
  translationese: "번역투",
  "tense-voice": "시제·태",
};

/** 규칙 ID → 문체 카테고리 (번역투/시제·태). 문체 규칙이 아니면 null. */
export function styleCategoryOf(rule: string): StyleCategory | null {
  if (rule.startsWith("trans-")) return "translationese";
  if (rule.startsWith("voice-") || rule === "tense") return "tense-voice";
  return null;
}

/** 번역투·시제/태 문체 점검 결과만 추출 (탭 전용 뷰용) */
export function styleIssues(sections: LintSections): LintIssue[] {
  return lintThesis(sections).filter((i) => styleCategoryOf(i.rule) !== null);
}

/** 서론에서 의문문(연구 문제 후보) 추출 — 결과 장 대조용 정보 제공 */
export function extractResearchQuestions(sections: LintSections): string[] {
  const out: string[] = [];
  for (const sec of sections.intro ?? []) {
    for (const p of sec.paragraphs ?? []) {
      RESEARCH_QUESTION.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = RESEARCH_QUESTION.exec(p.text ?? "")) !== null) {
        const q = m[0].trim();
        if (q.length >= 10) out.push(q);
      }
    }
  }
  return out;
}

// ── 연구 문제 ↔ 결과 장 커버리지 (2026-06-12, 사이클 30-C) ──
// 키워드 겹침 휴리스틱 — "다룸 후보/미발견" 정보 제공이며 판정이 아니다.

/** 의문문 상투어 — 변인명 등 실질 토큰만 비교하기 위한 불용어 */
const QUESTION_STOPWORDS = new Set([
  "차이", "효과", "영향", "관계", "어떠한", "어떠", "있는", "있을", "미치는", "따라", "간에",
  "연구", "문제", "첫째", "둘째", "셋째", "넷째", "그리고", "또한", "이는", "대한", "위한",
]);

export interface QuestionCoverage {
  question: string;
  /** 결과 장에서 핵심 토큰이 충분히 발견됐는지 (후보 판정) */
  covered: boolean;
  /** 결과 장에서 발견된 핵심 토큰 */
  matched: string[];
}

export function questionCoverage(sections: LintSections): QuestionCoverage[] {
  const questions = extractResearchQuestions(sections);
  if (questions.length === 0) return [];
  const resultsText = (sections.results ?? [])
    .flatMap((sec) => sec.paragraphs ?? [])
    .map((par) => par.text ?? "")
    .join("\n");

  return questions.map((q) => {
    const tokens = [
      ...new Set(
        q
          .split(/\s+/)
          .map((w) => stripParticle(w.replace(/[^가-힣]/g, "")))
          .filter((w) => w.length >= 2 && !QUESTION_STOPWORDS.has(w)),
      ),
    ];
    const matched = tokens.filter((t) => resultsText.includes(t));
    const covered = tokens.length > 0 && matched.length >= Math.min(2, tokens.length);
    return { question: q, covered, matched };
  });
}
