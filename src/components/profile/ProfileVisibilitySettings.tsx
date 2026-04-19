"use client";

import type { SectionKey, SectionVisibility } from "@/types";
import { SECTION_LABELS, SECTION_VISIBILITY_LABELS } from "@/types";

interface Props {
  value?: Partial<Record<SectionKey, SectionVisibility>>;
  onChange: (next: Partial<Record<SectionKey, SectionVisibility>>) => void;
  disabled?: boolean;
}

const SECTIONS: SectionKey[] = [
  "email",
  "phone",
  "socials",
  "bio",
  "researchInterests",
  "academicActivities",
  "researchActivities",
  "graduateInfo",
  "courses",
];

const LEVELS: SectionVisibility[] = ["members", "staff", "shared", "private"];

export default function ProfileVisibilitySettings({ value, onChange, disabled }: Props) {
  function setLevel(key: SectionKey, level: SectionVisibility) {
    onChange({ ...(value ?? {}), [key]: level });
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-white p-5">
      <div>
        <h3 className="text-sm font-semibold">프로필 섹션별 공개 범위</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          각 섹션을 누가 볼 수 있는지 결정합니다. 미설정 시 기본값은 <strong>회원만 공개</strong>입니다.
          비로그인 외부인은 운영진 페이지를 제외하고 일반 회원 페이지를 볼 수 없습니다.
        </p>
      </div>
      <ul className="space-y-2">
        {SECTIONS.map((key) => {
          const current: SectionVisibility = (value?.[key] ?? "members") as SectionVisibility;
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <span className="text-sm font-medium">{SECTION_LABELS[key]}</span>
              <select
                value={current}
                onChange={(e) => setLevel(key, e.target.value as SectionVisibility)}
                disabled={disabled}
                className="rounded-md border bg-white px-2 py-1 text-xs"
              >
                {LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {SECTION_VISIBILITY_LABELS[lv]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">
        · <strong>공유자까지</strong>: 로그인 회원 + (운영진 페이지 한정) QR/링크로 방문한 비로그인 외부인까지 노출됩니다.
      </p>
    </div>
  );
}
