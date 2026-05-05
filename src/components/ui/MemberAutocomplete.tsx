"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useAllMembers } from "@/features/member/useMembers";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectedMember {
  id: string;
  name: string;
  studentId?: string;
}

interface Props {
  /** 현재 선택된 회원 (id) */
  value: string;
  /** 표시 이름 */
  displayName?: string;
  /** 선택 시 콜백 */
  onSelect: (member: SelectedMember) => void;
  /** 선택 해제 콜백 */
  onClear?: () => void;
  /** 제외할 회원 id 목록 (이미 추가된 회원) */
  excludeIds?: string[];
  placeholder?: string;
  className?: string;
}

export default function MemberAutocomplete({
  value,
  displayName,
  onSelect,
  onClear,
  excludeIds = [],
  placeholder = "회원 이름을 입력하세요",
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { members, isLoading } = useAllMembers();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter((m) => !excludeIds.includes(m.id))
      .filter((m) => {
        const name = (m.name ?? "").toLowerCase();
        const sid = (m.studentId ?? "").toLowerCase();
        return name.includes(q) || sid.includes(q);
      })
      .slice(0, 10);
  }, [members, query, excludeIds]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  if (value && displayName) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2", className)}>
        <span className="text-sm font-medium">{displayName}</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-red-500"
            aria-label="선택 해제"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && query.trim() && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-card shadow-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 size={14} className="mr-2 animate-spin" />
              회원 목록 로딩 중...
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">일치하는 회원이 없습니다.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect({ id: m.id, name: m.name, studentId: m.studentId });
                      setQuery("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {m.studentId || "학번 미등록"}
                      {m.generation ? ` · ${m.generation}기` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
