"use client";

/**
 * 설계 조건 미니 폼 — 집단 수·사전검사·무선할당·사전 동질성 4개 선택 (2026-07-13, M1)
 *
 * ResearchDesignEditor 의 자료분석 섹션과 StatMethodGuideDialog 가 공유한다.
 * StatMethodGuideDialog 를 lazy 로드하면서도 이 폼은 즉시 필요하므로 별도 파일로 분리.
 * (StatMethodGuideDialog 는 하위호환을 위해 이 심볼을 re-export)
 */

import { cn } from "@/lib/utils";
import type { DesignConditions } from "@/types/research-design";

export function DesignConditionForm({
  value,
  onChange,
}: {
  value: DesignConditions;
  onChange: (next: DesignConditions) => void;
}) {
  const twoPlus = value.groupCount === "2" || value.groupCount === "3plus";
  const selectClass =
    "w-full rounded-md border bg-background px-2.5 py-1.5 text-xs disabled:opacity-50";

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <label className="text-[11px] font-medium text-muted-foreground">
        비교 집단 수
        <select
          value={value.groupCount ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              groupCount: (e.target.value || undefined) as DesignConditions["groupCount"],
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="1">단일집단</option>
          <option value="2">2집단</option>
          <option value="3plus">3집단 이상</option>
        </select>
      </label>

      <label className="text-[11px] font-medium text-muted-foreground">
        사전검사
        <select
          value={
            value.hasPretest === undefined ? "" : value.hasPretest ? "yes" : "no"
          }
          onChange={(e) =>
            onChange({
              ...value,
              hasPretest:
                e.target.value === "" ? undefined : e.target.value === "yes",
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="yes">있음 (사전-사후)</option>
          <option value="no">없음 (사후만)</option>
        </select>
      </label>

      <label
        className={cn(
          "text-[11px] font-medium text-muted-foreground",
          !twoPlus && "opacity-50",
        )}
      >
        무선할당
        <select
          value={
            value.randomAssignment === undefined
              ? ""
              : value.randomAssignment
                ? "yes"
                : "no"
          }
          disabled={!twoPlus}
          onChange={(e) =>
            onChange({
              ...value,
              randomAssignment:
                e.target.value === "" ? undefined : e.target.value === "yes",
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="yes">예 (실험)</option>
          <option value="no">아니오 (준실험)</option>
        </select>
      </label>

      <label
        className={cn(
          "text-[11px] font-medium text-muted-foreground",
          !(twoPlus && value.hasPretest) && "opacity-50",
        )}
      >
        사전 동질성
        <select
          value={value.pretestEquivalence ?? ""}
          disabled={!(twoPlus && value.hasPretest)}
          onChange={(e) =>
            onChange({
              ...value,
              pretestEquivalence: (e.target.value ||
                undefined) as DesignConditions["pretestEquivalence"],
            })
          }
          className={cn(selectClass, "mt-1")}
        >
          <option value="">— 선택 —</option>
          <option value="equivalent">동질 확보</option>
          <option value="different">차이 존재</option>
          <option value="unknown">불확실</option>
        </select>
      </label>
    </div>
  );
}
