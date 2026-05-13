"use client";

/**
 * 참석유형별 신청폼 빌더 (Sprint 70 — 대외 학술대회 전용).
 *
 * 탭 구조:
 *   [공통] [발표자] [자원봉사자] [참석자]
 *
 * - 공통 탭: 모든 신청자에게 표시되는 폼 (기존 applicationForm)
 * - 유형 탭: enabledParticipantTypes 로 활성화된 유형만 표시.
 *   각 유형 탭의 폼은 applicationFormByType[type] 에 저장됨.
 *   신청자가 해당 유형을 선택하면 공통 폼 다음에 추가로 렌더링됨.
 *
 * 디자인 시스템: rounded-xl 카드 + 헤어라인 border + tracking-tight 헤딩.
 */

import { useState } from "react";
import FormBuilder from "./FormBuilder";
import type { FormField } from "@/types";
import {
  EXTERNAL_PARTICIPANT_TYPE_LABELS,
  type ExternalParticipantType,
} from "@/types/academic";

interface Props {
  /** 공통 폼 (모든 참석유형 공통 적용) */
  commonForm: FormField[];
  onCommonChange: (fields: FormField[]) => void;
  /** 활성화된 참석유형 (빈 배열 또는 undefined 시 3 유형 모두 활성) */
  enabledTypes?: ExternalParticipantType[];
  /** 유형별 폼 */
  byType: Partial<Record<ExternalParticipantType, FormField[]>>;
  onByTypeChange: (next: Partial<Record<ExternalParticipantType, FormField[]>>) => void;
}

type TabKey = "common" | ExternalParticipantType;

const ALL_TYPES: ExternalParticipantType[] = ["speaker", "volunteer", "attendee"];

export default function FormBuilderByType({
  commonForm,
  onCommonChange,
  enabledTypes,
  byType,
  onByTypeChange,
}: Props) {
  const activeTypes =
    enabledTypes && enabledTypes.length > 0 ? enabledTypes : ALL_TYPES;
  const [tab, setTab] = useState<TabKey>("common");

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "common", label: "공통", count: commonForm.length },
    ...activeTypes.map((t) => ({
      key: t as TabKey,
      label: EXTERNAL_PARTICIPANT_TYPE_LABELS[t],
      count: (byType[t] ?? []).length,
    })),
  ];

  function setTypeFields(t: ExternalParticipantType, fields: FormField[]) {
    const next = { ...byType };
    if (fields.length === 0) {
      delete next[t];
    } else {
      next[t] = fields;
    }
    onByTypeChange(next);
  }

  return (
    <div className="space-y-3">
      {/* 안내 */}
      <p className="rounded-lg border border-dashed bg-muted/10 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">참석유형별 신청폼</strong>: 공통 탭은 모든 신청자에게,
        유형 탭(발표자·자원봉사자·참석자)은 신청자가 해당 유형을 선택했을 때만 추가로 표시됩니다.
        활동 정보의 <em>활성 참석유형</em> 설정에 따라 표시 탭이 달라집니다.
      </p>

      {/* 탭 헤더 */}
      <div
        role="tablist"
        aria-label="참석유형별 신청폼 탭"
        className="flex flex-wrap items-center gap-1 border-b"
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {tab === "common" && (
          <FormBuilder value={commonForm} onChange={onCommonChange} />
        )}
        {activeTypes.map((t) =>
          tab === t ? (
            <FormBuilder
              key={t}
              value={byType[t] ?? []}
              onChange={(fields) => setTypeFields(t, fields)}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
