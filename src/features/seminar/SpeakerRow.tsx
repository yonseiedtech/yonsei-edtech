"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { X, Search } from "lucide-react";
import { SPEAKER_TYPE_LABELS } from "@/types";
import type { SeminarSpeaker, SpeakerType } from "@/types";

export type MemberLite = {
  id: string;
  name: string;
  studentId?: string;
  affiliation?: string;
  position?: string;
  generation?: number;
  bio?: string;
};

export function emptySpeaker(type: SpeakerType = "member"): SeminarSpeaker {
  return { type, name: "" };
}

interface Props {
  speaker: SeminarSpeaker;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<SeminarSpeaker>) => void;
  onRemove: () => void;
  allMembers: MemberLite[];
  excludeIds: string[];
}

export default function SpeakerRow({
  speaker,
  index,
  canRemove,
  onChange,
  onRemove,
  allMembers,
  excludeIds,
}: Props) {
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allMembers
      .filter((m) => !excludeIds.includes(m.id))
      .filter((m) => {
        const n = (m.name ?? "").toLowerCase();
        const sid = (m.studentId ?? "").toLowerCase();
        return n.includes(q) || sid.includes(q);
      })
      .slice(0, 8);
  }, [search, allMembers, excludeIds]);

  function pickMember(m: MemberLite) {
    onChange({
      type: "member",
      userId: m.id,
      studentId: m.studentId,
      name: m.name,
      affiliation: m.affiliation,
      position: m.position,
    });
    setSearch("");
    setShowResults(false);
  }

  function clearMemberLink() {
    onChange({ userId: undefined });
  }

  return (
    <div className="rounded-lg border bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          연사 #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500"
            aria-label="연사 삭제"
            title="연사 삭제"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">유형</label>
        <div className="flex gap-1">
          {(["member", "guest"] as SpeakerType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ type: t, ...(t === "guest" ? { userId: undefined } : {}) })}
              className={`rounded-md border px-3 py-1 text-xs ${
                speaker.type === t
                  ? t === "guest"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-primary bg-primary/10 text-primary"
                  : "border-input bg-white text-muted-foreground hover:bg-muted"
              }`}
            >
              {SPEAKER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {speaker.type === "member" && (
        <div className="relative">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            회원 검색 {speaker.userId && <span className="ml-1 text-[10px] text-emerald-700">✓ 매칭됨</span>}
          </label>
          {speaker.userId ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm">
              <span className="font-medium">{speaker.name}</span>
              {speaker.studentId && (
                <span className="font-mono text-[11px] text-muted-foreground">{speaker.studentId}</span>
              )}
              <button
                type="button"
                onClick={clearMemberLink}
                className="ml-auto rounded p-1 text-xs text-muted-foreground hover:text-red-500"
              >
                매칭 해제
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  placeholder="이름 또는 학번으로 검색"
                  className="pl-7"
                />
              </div>
              {showResults && search.trim() && (
                <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-lg">
                  {matches.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      일치하는 회원이 없습니다 — 아래에 직접 입력하세요.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {matches.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => pickMember(m)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50"
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {m.studentId || "학번 미등록"}{m.generation ? ` · ${m.generation}기` : ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!speaker.userId && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">이름</label>
            <Input
              value={speaker.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={speaker.type === "guest" ? "외부 연사 이름" : "이름"}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              학번 {speaker.type === "member" && <span className="text-[10px] text-primary">(가입 시 자동 연동의 키)</span>}
            </label>
            <Input
              value={speaker.studentId ?? ""}
              onChange={(e) => onChange({ studentId: e.target.value })}
              placeholder={speaker.type === "member" ? "예: 2024******" : "(선택)"}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">소속 (선택)</label>
          <Input
            value={speaker.affiliation ?? ""}
            onChange={(e) => onChange({ affiliation: e.target.value })}
            placeholder="예: 연세대학교 교육학과"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">직위·직책 (선택)</label>
          <Input
            value={speaker.position ?? ""}
            onChange={(e) => onChange({ position: e.target.value })}
            placeholder="예: 교수, 박사과정"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">약력·소개 (선택)</label>
        <Input
          value={speaker.bio ?? ""}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="발표자 약력 (한 줄)"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">사진 URL (선택)</label>
        <Input
          value={speaker.photoUrl ?? ""}
          onChange={(e) => onChange({ photoUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
