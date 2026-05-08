"use client";

/**
 * OfficeOfEducationField — 17개 시·도교육청 select + "기타(직접 입력)" 조건부 텍스트 input
 *
 * datalist 의 dropdown 위치 (브라우저별 비표준 — 우측에 뜨거나 잘림) 문제 회피.
 * 표준 <select> 는 dropdown 이 항상 input 하단에 노출됨 → 일관된 UX.
 *
 * 사용 예:
 *   <OfficeOfEducationField value={value} onChange={onChange} />
 */

import { useEffect, useState } from "react";
import { Input } from "./input";
import { OFFICE_OF_EDUCATION_OPTIONS } from "@/types";

const OTHER_KEY = "__other__";

interface OfficeOfEducationFieldProps {
  value: string;
  onChange: (next: string) => void;
  /** select 의 disabled 상태 (저장 중 등) */
  disabled?: boolean;
  /** 컴팩트 표시 — 도움말 padding 줄임 */
  compact?: boolean;
}

export default function OfficeOfEducationField({
  value,
  onChange,
  disabled,
  compact = false,
}: OfficeOfEducationFieldProps) {
  // value 가 17개 목록에 있으면 select 가 그 옵션을 선택, 아니면 "기타" 모드
  const isPreset = OFFICE_OF_EDUCATION_OPTIONS.includes(value);
  const initialMode = !value
    ? ("" as const)
    : isPreset
      ? value
      : OTHER_KEY;

  const [selectValue, setSelectValue] = useState<string>(initialMode);

  // value 가 외부에서 바뀌면 selectValue 도 동기화 (마이그레이션 페이지 row 별 reset 등)
  useEffect(() => {
    if (!value) {
      setSelectValue("");
    } else if (OFFICE_OF_EDUCATION_OPTIONS.includes(value)) {
      setSelectValue(value);
    } else {
      setSelectValue(OTHER_KEY);
    }
  }, [value]);

  function handleSelectChange(next: string) {
    setSelectValue(next);
    if (next === "") {
      onChange("");
    } else if (next === OTHER_KEY) {
      // "기타" 선택 시 input 으로 입력 받음 — 기존 자유 입력값 유지
      if (OFFICE_OF_EDUCATION_OPTIONS.includes(value)) {
        // 기존이 preset 이었으면 빈 값으로 초기화 (사용자가 새로 입력)
        onChange("");
      }
      // 기존이 자유 입력이었으면 value 유지
    } else {
      onChange(next);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
      >
        <option value="">선택 안 함</option>
        {OFFICE_OF_EDUCATION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value={OTHER_KEY}>기타 (직접 입력)</option>
      </select>

      {selectValue === OTHER_KEY && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="예: ○○사립학교"
        />
      )}

      {!compact && (
        <p className="text-xs text-muted-foreground">
          17개 시·도교육청 중 선택, 사립·국립 등은 &ldquo;기타&rdquo; 후 직접 입력
        </p>
      )}
    </div>
  );
}
