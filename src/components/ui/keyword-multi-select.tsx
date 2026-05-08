"use client";

/**
 * KeywordMultiSelect — 키워드 다중 선택 + 사용자 추가
 *
 * 사용 예:
 *   <KeywordMultiSelect
 *     value={researchInterests}
 *     onChange={setResearchInterests}
 *     suggestions={EDU_TECH_KEYWORDS}
 *     placeholder="원하는 키워드가 없으면 추가하세요"
 *   />
 *
 * - suggestions 클릭 → 선택/해제 토글
 * - 선택 chip 우측 X 클릭 → 제거
 * - 직접 입력 → Enter 또는 추가 버튼 → value 에 push
 */

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface KeywordMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** 추천 키워드 (clickable chip 으로 표시) */
  suggestions: readonly string[];
  /** input placeholder */
  placeholder?: string;
  /** 최대 선택 개수 (기본 무제한) */
  max?: number;
}

export default function KeywordMultiSelect({
  value,
  onChange,
  suggestions,
  placeholder = "키워드 추가",
  max,
}: KeywordMultiSelectProps) {
  const [draft, setDraft] = useState("");

  const selectedSet = new Set(value);

  function add(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    if (selectedSet.has(trimmed)) return;
    if (max && value.length >= max) return;
    onChange([...value, trimmed]);
  }

  function remove(keyword: string) {
    onChange(value.filter((k) => k !== keyword));
  }

  function toggle(keyword: string) {
    if (selectedSet.has(keyword)) {
      remove(keyword);
    } else {
      add(keyword);
    }
  }

  function handleAddDraft() {
    if (!draft.trim()) return;
    add(draft);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDraft();
    }
  }

  return (
    <div className="space-y-3">
      {/* 선택된 키워드 (chip + X) */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {k}
              <button
                type="button"
                onClick={() => remove(k)}
                aria-label={`${k} 제거`}
                className="rounded-full p-0.5 hover:bg-primary/20"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 추천 키워드 (clickable chips) */}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => {
          const active = selectedSet.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* 직접 추가 */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={40}
        />
        <button
          type="button"
          onClick={handleAddDraft}
          disabled={!draft.trim() || (!!max && value.length >= max)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
        >
          <Plus size={14} /> 추가
        </button>
      </div>

      {max && (
        <p className="text-[11px] text-muted-foreground">
          {value.length} / {max} 선택
        </p>
      )}
    </div>
  );
}

/** 교육공학 분야 추천 키워드 — Sprint 67 회원가입 신규 */
export const EDU_TECH_KEYWORDS: readonly string[] = [
  "학습과학",
  "인지과학",
  "메타인지",
  "에듀테크",
  "AI 교육",
  "ChatGPT 활용",
  "교수설계",
  "교육공학",
  "학습분석(LA)",
  "교육 데이터마이닝",
  "게임 학습",
  "AR/VR/XR 교육",
  "협력학습",
  "PBL",
  "플립러닝",
  "자기조절학습",
  "학습동기",
  "적응형 학습",
  "개인화 학습",
  "모바일 러닝",
  "마이크로 러닝",
  "K-12 교육",
  "고등교육",
  "평생교육",
  "교사 전문성 개발",
  "평가",
  "디지털 교과서",
  "HRD",
  "디지털 리터러시",
  "STEAM·메이커",
] as const;
