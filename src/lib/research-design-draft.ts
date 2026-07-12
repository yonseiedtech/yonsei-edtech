// ── 연구방법 초안 조립 (순수 함수) ──
//
// 연구 설계(ResearchDesign) 작성 내용을 학위논문 "III. 연구방법" 아웃라인
// (1. 연구 대상 / 2. 연구 도구 / 3. 연구 절차(+프로그램 개발) / 4. 자료 수집·분석)의
// 마크다운 텍스트로 조립한다. I/O·fetch 없는 순수 함수라 단위 테스트가 쉽다.

import {
  ADDIE_STEPS,
  RESEARCH_DESIGN_APPROACH_LABELS,
  type ResearchDesign,
} from "@/types/research-design";

function clean(v?: string): string {
  return (v ?? "").trim();
}

function joinLines(lines: (string | undefined | false)[]): string {
  return lines.filter((l): l is string => !!l && l.length > 0).join("\n");
}

/**
 * 연구 설계 → "III. 연구방법" 마크다운 초안.
 * 비어 있는 항목은 안내용 플레이스홀더(_(작성 전)_)로 남겨 목차 골격을 보여준다.
 */
export function buildResearchMethodDraft(design: ResearchDesign | null | undefined): string {
  const d = design;
  const approachLabel =
    d && d.approach ? RESEARCH_DESIGN_APPROACH_LABELS[d.approach] : "";
  const methodName = clean(d?.methodName);

  const header = joinLines([
    "## III. 연구방법",
    approachLabel || methodName
      ? `> 접근: ${[approachLabel, methodName].filter(Boolean).join(" · ")}`
      : undefined,
  ]);

  // 1. 연구 대상
  const p = d?.participants;
  const participantLines = joinLines([
    "### 1. 연구 대상",
    clean(p?.population) && `- 모집단: ${clean(p?.population)}`,
    clean(p?.sampleSize) && `- 표본 크기: ${clean(p?.sampleSize)}`,
    clean(p?.samplingMethod) && `- 표집 방법: ${clean(p?.samplingMethod)}`,
    clean(p?.sizeRationale) && `- 표본 크기 산정 근거: ${clean(p?.sizeRationale)}`,
    clean(p?.protection) && `- 참여자 보호: ${clean(p?.protection)}`,
    !p ||
      (!clean(p.population) &&
        !clean(p.sampleSize) &&
        !clean(p.samplingMethod) &&
        !clean(p.sizeRationale) &&
        !clean(p.protection))
      ? "_(작성 전)_"
      : undefined,
  ]);

  // 2. 연구 도구
  const isQual = d?.approach === "qualitative";
  const instrumentItems = (d?.instruments ?? []).filter(
    (it) => clean(it.name) || clean(it.plan),
  );
  const instrumentLines = joinLines([
    "### 2. 연구 도구",
    ...instrumentItems.map((it) => {
      const label = clean(it.name) || "(도구명 미입력)";
      const plan = clean(it.plan);
      return plan ? `- ${label}: ${plan}` : `- ${label}`;
    }),
    isQual && clean(d?.qualInstruments)
      ? `- 질적 도구: ${clean(d?.qualInstruments)}`
      : undefined,
    instrumentItems.length === 0 && !(isQual && clean(d?.qualInstruments))
      ? clean(d?.qualInstruments)
        ? `- 질적 도구: ${clean(d?.qualInstruments)}`
        : "_(작성 전)_"
      : undefined,
  ]);

  // 3. 연구 절차 (+ 프로그램 개발)
  const steps = (d?.procedureSteps ?? []).filter(
    (s) => clean(s.step) || clean(s.detail),
  );
  const procedureCore = steps.map((s, i) => {
    const step = clean(s.step) || `단계 ${i + 1}`;
    const detail = clean(s.detail);
    return detail ? `${i + 1}. ${step} — ${detail}` : `${i + 1}. ${step}`;
  });

  const program = d?.programDesign;
  const programEnabled = !!program?.enabled;
  const addieLabels = ADDIE_STEPS.filter((s) =>
    (program?.addieChecked ?? []).includes(s.id),
  ).map((s) => s.label);
  const programLines = programEnabled
    ? joinLines([
        "#### 프로그램 개발 설계",
        clean(program?.overview) && `- 프로그램 개요: ${clean(program?.overview)}`,
        clean(program?.sessions) && `- 회기 구성: ${clean(program?.sessions)}`,
        addieLabels.length > 0 && `- ADDIE 단계: ${addieLabels.join(", ")}`,
      ])
    : "";

  const procedureLines = joinLines([
    "### 3. 연구 절차",
    ...procedureCore,
    procedureCore.length === 0 && !programLines ? "_(작성 전)_" : undefined,
    programLines || undefined,
  ]);

  // 4. 자료 수집·분석
  const statMethods = (d?.selectedStatMethods ?? [])
    .map((s) => clean(s))
    .filter((s) => s.length > 0);
  const analysisLines = joinLines([
    "### 4. 자료 수집·분석",
    clean(d?.dataCollection) && `- 자료 수집: ${clean(d?.dataCollection)}`,
    clean(d?.dataAnalysis) && `- 자료 분석: ${clean(d?.dataAnalysis)}`,
    statMethods.length > 0 && `- 통계 분석 방법: ${statMethods.join(", ")}`,
    !clean(d?.dataCollection) && !clean(d?.dataAnalysis) && statMethods.length === 0
      ? "_(작성 전)_"
      : undefined,
  ]);

  return [header, participantLines, instrumentLines, procedureLines, analysisLines].join(
    "\n\n",
  );
}
