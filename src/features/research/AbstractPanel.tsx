"use client";

/**
 * 초록 작성 패널 (사이클 70)
 *
 * 논문 작성 에디터의 "초록" 탭. 5장 본문과 별개의 요약 아티팩트를 작성한다.
 * 도움말과 실시간 단락 구성 체크는 졸업생 학위논문 초록 80편의 실제 분석
 * (scripts/analyze-alumni-abstracts.ts, 2026-06-13)에서 도출했다:
 *   분량 중앙값 1,454자·13문장 · 키워드 4개 · 구조 포함률 방법89/목적80/결과70/배경41/시사점34%
 *   → 5요소 완비는 8%뿐이라, 배경·시사점까지 갖추면 차별화된다.
 */

import { useMemo, useState } from "react";
import { Lightbulb, Check, Circle, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  keywords: string[];
  readOnly?: boolean;
  onChange: (next: string) => void;
  onKeywordsChange: (next: string[]) => void;
}

// 졸업생 초록 분석에서 도출한 권고치 (참고용)
const REC = { medianChars: 1454, lowChars: 1000, highChars: 1800, sentences: 13, keywords: 4 };

/** 5단 구조 요소 — 분석 스크립트와 동일 패턴 (실시간 포함 여부 체크) */
const ELEMENTS: { key: string; label: string; hint: string; rate: number; re: RegExp }[] = [
  {
    key: "background",
    label: "연구 배경·필요성",
    hint: "왜 지금 이 연구가 필요한가 — 현상·문제를 1~2문장으로",
    rate: 41,
    re: /필요성|중요성|대두|증가하|확산|문제로|주목받|요구된다|급변|배경/,
  },
  {
    key: "purpose",
    label: "연구 목적·문제",
    hint: "무엇을 밝히려 했는가 — '본 연구는 ~을 검증/탐색하였다'",
    rate: 80,
    re: /목적은|목적으로|목적이|규명하|밝히는\s*것|알아보|검증하(고자|는|기)|탐색하(고자|는)|확인하(고자|기)|본\s*연구는/,
  },
  {
    key: "method",
    label: "연구 방법·대상",
    hint: "누구를 대상으로 어떻게 — 대상·표집·측정·분석 방법",
    rate: 89,
    re: /대상으로|참여자|표본|설문|면담|실험|분석을\s*실시|분석하였|자료를\s*수집|측정하|척도를/,
  },
  {
    key: "results",
    label: "연구 결과",
    hint: "무엇이 밝혀졌는가 — 핵심 결과를 수치·방향과 함께",
    rate: 70,
    re: /결과는|나타났다|유의한|유의하게|밝혀졌다|확인되었|차이가\s*있|효과가\s*있|관계가\s*있|드러났다/,
  },
  {
    key: "implication",
    label: "결론·시사점·제언",
    hint: "그래서 무엇을 의미하는가 — 교육적 시사점·제언으로 마무리",
    rate: 34,
    re: /시사점|제언|함의|기여|의의|제안한다|논의하였|결론적으로|향후|제공한다/,
  },
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[다음됨함임략))])\.\s+|(?<=[가-힣])\.\s+(?=[가-힣A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

/** 문형 템플릿 — 졸업생 초록 분석의 표준형 기반 (빈칸 ___ 채우기) */
const ELEMENT_TEMPLATES: { key: string; label: string; template: string }[] = [
  { key: "background", label: "배경", template: "최근 ___이 확산되면서 ___의 중요성이 커지고 있다." },
  { key: "purpose", label: "목적", template: "본 연구는 ___이 ___에 미치는 영향을 검증하는 것을 목적으로 한다." },
  { key: "method", label: "방법", template: "이를 위해 ___을 대상으로 ___을 실시하고 ___으로 분석하였다." },
  { key: "results", label: "결과", template: "그 결과, ___은 ___에 유의한 영향을 미치는 것으로 나타났다." },
  { key: "implication", label: "시사점", template: "이러한 결과는 ___에 대한 시사점을 제공한다." },
];

// 너무 긴 문장 임계(자) · 이중피동 패턴 (사이클 72 문장 점검)
const LONG_SENTENCE = 90;
const DOUBLE_PASSIVE = /보여진|되어진|쓰여진|모여진|이루어진다|놓여진/g;

export default function AbstractPanel({ value, keywords, readOnly, onChange, onKeywordsChange }: Props) {
  const [helpOpen, setHelpOpen] = useState(true);
  const [kwInput, setKwInput] = useState("");

  const chars = value.trim().length;
  const sentenceList = useMemo(() => (value.trim() ? splitSentences(value) : []), [value]);
  const sentenceCount = sentenceList.length;
  const longCount = useMemo(() => sentenceList.filter((s) => s.length > LONG_SENTENCE).length, [sentenceList]);
  const doublePassiveCount = useMemo(() => (value.match(DOUBLE_PASSIVE) ?? []).length, [value]);
  const present = useMemo(
    () => new Set(ELEMENTS.filter((e) => e.re.test(value)).map((e) => e.key)),
    [value],
  );
  const presentCount = present.size;

  /** 문형 템플릿을 현재 본문 끝에 이어 붙임 (한 단락 흐름 유지) */
  function insertTemplate(t: string) {
    if (readOnly) return;
    const base = value.trimEnd();
    onChange(base ? `${base} ${t}` : t);
  }

  const charTone =
    chars === 0
      ? "text-muted-foreground"
      : chars < REC.lowChars
        ? "text-amber-600"
        : chars > REC.highChars
          ? "text-amber-600"
          : "text-emerald-600";

  function addKeyword(raw: string) {
    const k = raw.trim().replace(/,$/, "").trim();
    if (!k || keywords.includes(k) || keywords.length >= 6) {
      setKwInput("");
      return;
    }
    onKeywordsChange([...keywords, k]);
    setKwInput("");
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">초록 (Abstract)</h4>
        <span className={cn("text-[11px] tabular-nums", charTone)}>
          {chars.toLocaleString()}자 · {sentenceCount}문장
        </span>
      </div>

      {/* 실시간 문장 점검 — 긴 문장·이중피동 (사이클 72) */}
      {(longCount > 0 || doublePassiveCount > 0) && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {longCount > 0 && (
            <span>⚠ 긴 문장 {longCount}개({LONG_SENTENCE}자 초과) — 한 문장 한 메시지로 끊어보세요</span>
          )}
          {doublePassiveCount > 0 && (
            <span>⚠ 이중피동 {doublePassiveCount}곳(보여진다 등) — 능동으로 다듬어보세요</span>
          )}
        </p>
      )}

      {/* 데이터 기반 도움말 — 졸업생 초록 80편 분석 */}
      <div className="rounded-xl border border-primary/30 bg-primary/[0.04]">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Lightbulb size={13} />
            우리 전공 졸업생 초록 80편은 이렇게 썼어요
          </span>
          <ChevronDown size={14} className={cn("text-primary transition-transform", helpOpen && "rotate-180")} />
        </button>
        {helpOpen && (
          <div className="space-y-2.5 border-t border-primary/15 px-3.5 py-3 text-xs leading-relaxed text-foreground/85">
            <p>
              <span className="font-semibold">적정 분량</span>은 약{" "}
              <span className="font-semibold text-primary">{REC.lowChars.toLocaleString()}~{REC.highChars.toLocaleString()}자</span>
              (중앙값 {REC.medianChars.toLocaleString()}자), <span className="font-semibold text-primary">{REC.sentences}문장</span> 내외,
              키워드 <span className="font-semibold text-primary">{REC.keywords}개</span>가 표준입니다.
            </p>
            <p>
              <span className="font-semibold">5단 구성</span>으로 한 단락씩 쌓으면 완결성이 높아집니다 —
              배경 → 목적 → 방법 → 결과 → 시사점. 도입은 <span className="font-medium">목적·방법</span>을 앞세우고,
              마무리는 <span className="font-medium">시사점</span>으로 닫는 것이 관례입니다.
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              💡 졸업생 초록은 방법(89%)·목적(80%)·결과(70%)는 잘 담지만 <span className="font-semibold">배경(41%)과
              시사점(34%)</span>은 자주 빠집니다. 5요소를 모두 갖춘 초록은 8%뿐 — 이 둘까지 챙기면 차별화됩니다.
            </p>

            {/* 문장 단위 특징 — 졸업생 초록 1,030문장 분석 (사이클 71) */}
            <div className="mt-1 space-y-1.5 rounded-lg border bg-background/60 p-2.5">
              <p className="font-semibold text-foreground/85">✍️ 문장 쓰기 (1,030문장 분석)</p>
              <ul className="ml-0.5 space-y-1 text-[11px]">
                <li>· <span className="font-medium">한 문장 한 메시지</span> — 졸업생 초록 문장은 중앙값 76자로 긴 편이에요. 60자 내외로 끊으면 읽기 쉽습니다.</li>
                <li>· <span className="font-medium">시제 일관</span> — 방법·결과는 과거형(분석하였다·나타났다), 배경·목적·시사점은 현재형(이다·한다). 졸업생도 과거 49%·현재 48%로 장에 따라 갈립니다.</li>
                <li>· <span className="font-medium">결과 문장 표준형</span> — &ldquo;~로 나타났다&rdquo;, &ldquo;유의한 차이가 있었다&rdquo;가 가장 많이 쓰입니다.</li>
                <li>· <span className="font-medium">능동 우선</span> — 이중피동(보여진다·되어진다)과 과도한 피동은 피하세요.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 실시간 단락 구성 체크 */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
          단락 구성 체크 <span className="font-normal">({presentCount}/5 요소 감지됨)</span>
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ELEMENTS.map((e) => {
            const ok = present.has(e.key);
            return (
              <div
                key={e.key}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors",
                  ok
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-dashed bg-muted/30",
                )}
                title={e.hint}
              >
                {ok ? (
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={13} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                )}
                <span className="min-w-0">
                  <span className={cn("font-medium", ok ? "text-emerald-800 dark:text-emerald-200" : "text-foreground/70")}>
                    {e.label}
                  </span>
                  <span className="ml-1 text-muted-foreground">· 졸업생 {e.rate}%</span>
                  {!ok && <span className="mt-0.5 block text-[10px] text-muted-foreground">{e.hint}</span>}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          ※ 키워드 매칭 기반 자동 감지 — 참고용입니다. 표현이 달라 감지가 안 될 수 있어요.
        </p>
      </div>

      {/* 문형 템플릿 — 클릭하면 본문 끝에 빈칸 문장 삽입 (사이클 72) */}
      {!readOnly && (
        <div>
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            문형 넣기 <span className="font-normal">— 클릭하면 빈칸(___) 문장이 추가돼요</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ELEMENT_TEMPLATES.map((t) => {
              const done = present.has(t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => insertTemplate(t.template)}
                  title={t.template}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-primary/50 hover:text-primary",
                    done ? "text-muted-foreground" : "text-foreground/80",
                  )}
                >
                  <span className="font-semibold text-primary">+</span>
                  {t.label}
                  {done && <Check size={11} className="text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 본문 */}
      <div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          rows={14}
          placeholder="본 연구는 …을 목적으로 한다. 이를 위해 …을 대상으로 …을 분석하였다. 그 결과 …로 나타났다. 이는 …에 시사점을 제공한다."
          className="w-full resize-y rounded-xl border bg-background p-3.5 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
        />
      </div>

      {/* 키워드 */}
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
          키워드 <span className="font-normal">({keywords.length}/6 · 권장 {REC.keywords}개)</span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {keywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-xs"
            >
              {k}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onKeywordsChange(keywords.filter((x) => x !== k))}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`${k} 삭제`}
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}
          {!readOnly && keywords.length < 6 && (
            <input
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addKeyword(kwInput);
                }
              }}
              onBlur={() => kwInput.trim() && addKeyword(kwInput)}
              placeholder="키워드 입력 후 Enter"
              className="min-w-[140px] flex-1 rounded-full border bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          )}
        </div>
      </div>
    </section>
  );
}
