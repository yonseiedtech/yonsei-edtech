// ── 진단 문항 유형별 "정답 텍스트" 도출 헬퍼 ──
//
// 오답 암기카드(flashcard)의 뒷면(정답)·앞면(문제 본문) 구성에 사용한다.
// 채점(gradeQuestion)과 독립 — 여기서는 사람이 읽을 정답 문자열만 만든다.
// 러너(DiagnosisRunner)의 유형별 본문 분기와 동일한 규칙을 따른다.

import { questionType, type DiagnosticQuestion } from "@/types";

/**
 * 문항의 화면 표시 본문(질문) — 암기카드 앞면 후보.
 *  - term     : prompt (정의 서술)
 *  - ox       : statement (참/거짓 진술)
 *  - 그 외    : question
 * passage 는 본문 앞에 지문이 붙으므로 호출부에서 frontHint 로 별도 전달한다.
 */
export function questionFrontText(q: DiagnosticQuestion): string {
  switch (questionType(q)) {
    case "term":
      return q.prompt ?? q.question ?? "";
    case "ox":
      return q.statement ?? q.question ?? "";
    default:
      return q.question ?? "";
  }
}

/**
 * 문항의 정답 텍스트 — 암기카드 뒷면(정답 부분).
 *  - mcq·compare·scenario·passage·diagram : options[answerIndex]
 *  - ox                                    : "참 (O)" / "거짓 (X)"
 *  - term                                  : answer (동의어 있으면 괄호 병기)
 *  - ordering                              : items 를 정답 순서로 "1. … → 2. …" 나열
 *  - matching                              : leftItems[i] ↔ rightItems[correctMap[i]] 매핑 나열
 * 필요한 필드가 없으면 빈 문자열 폴백(카드 저장은 가능하되 정답 비어 있을 수 있음).
 */
export function answerText(q: DiagnosticQuestion): string {
  switch (questionType(q)) {
    case "ox":
      return q.answerBool ? "참 (O)" : "거짓 (X)";
    case "term": {
      const base = q.answer ?? "";
      const synonyms = (q.acceptedAnswers ?? []).filter(
        (a) => a && a !== q.answer,
      );
      return synonyms.length > 0 ? `${base} (${synonyms.join(" / ")})` : base;
    }
    case "ordering": {
      const items = q.items ?? [];
      if (items.length === 0) return "";
      return items.map((it, i) => `${i + 1}. ${it}`).join("\n");
    }
    case "matching": {
      const left = q.leftItems ?? [];
      const right = q.rightItems ?? [];
      const map = q.correctMap ?? [];
      if (left.length === 0 || map.length === 0) return "";
      return left
        .map((l, i) => {
          const r = right[map[i]] ?? "?";
          return `${l} ↔ ${r}`;
        })
        .join("\n");
    }
    case "compare":
    case "scenario":
    case "passage":
    case "diagram":
    case "mcq":
    default: {
      const idx = q.answerIndex;
      if (typeof idx !== "number") return "";
      return q.options?.[idx] ?? "";
    }
  }
}

/**
 * 암기카드 뒷면 전체(정답 + 해설). 정답 라벨을 붙이고, 해설이 있으면 줄바꿈 후 덧붙인다.
 */
export function backText(q: DiagnosticQuestion): string {
  const ans = answerText(q);
  const parts: string[] = [];
  if (ans) parts.push(`정답: ${ans}`);
  if (q.explanation) parts.push(q.explanation);
  return parts.join("\n\n");
}
