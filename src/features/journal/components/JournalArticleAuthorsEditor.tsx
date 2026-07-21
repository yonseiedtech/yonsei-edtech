"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, X, Star, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CreditRoleSelector from "@/features/collaborative-research/components/CreditRoleSelector";
import type { ArticleAuthorSnapshot, CollabResearchMember, CreditRole, User } from "@/types";

interface Props {
  authors: ArticleAuthorSnapshot[];
  onChange: (authors: ArticleAuthorSnapshot[]) => void;
  /** 팀 멤버 목록 — 빠른 추가용 */
  teamMembers: CollabResearchMember[];
  /** userId → User 매핑 (이름·이메일) */
  userMap: Map<string, User>;
  disabled?: boolean;
}

/** 정식 연구지 출판을 위한 저자 스냅샷 편집. 순서·교신·제1·소속·ORCID·CRediT 모두 조정. */
export default function JournalArticleAuthorsEditor({
  authors,
  onChange,
  teamMembers,
  userMap,
  disabled,
}: Props) {
  const [search, setSearch] = useState("");

  const alreadyAddedIds = new Set(authors.map((a) => a.userId));
  const availableMembers = teamMembers.filter(
    (m) =>
      !alreadyAddedIds.has(m.userId) &&
      (search === "" ||
        userMap.get(m.userId)?.name?.toLowerCase().includes(search.toLowerCase())),
  );

  const addAuthor = (member: CollabResearchMember) => {
    const profile = userMap.get(member.userId);
    const next: ArticleAuthorSnapshot = {
      userId: member.userId,
      displayName: profile?.name ?? member.userId,
      affiliation: member.affiliation ?? "연세대학교 교육대학원 교육공학전공",
      email: profile?.email,
      orcidId: member.orcidId,
      authorOrder: authors.length + 1,
      isCorresponding: authors.length === 0, // 첫 저자가 교신 기본
      isFirstAuthor: authors.length === 0,
      creditRoles: member.creditRoles ?? [],
    };
    onChange([...authors, next]);
    setSearch("");
  };

  const removeAt = (idx: number) => {
    const next = authors
      .filter((_, i) => i !== idx)
      .map((a, i) => ({ ...a, authorOrder: i + 1 }));
    onChange(next);
  };

  const swap = (a: number, b: number) => {
    if (b < 0 || b >= authors.length) return;
    const next = [...authors];
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next.map((au, i) => ({ ...au, authorOrder: i + 1 })));
  };

  const updateAuthor = <K extends keyof ArticleAuthorSnapshot>(
    idx: number,
    key: K,
    value: ArticleAuthorSnapshot[K],
  ) => {
    onChange(authors.map((a, i) => (i === idx ? { ...a, [key]: value } : a)));
  };

  const setCorresponding = (idx: number) => {
    onChange(
      authors.map((a, i) => ({ ...a, isCorresponding: i === idx })),
    );
  };

  const toggleFirstAuthor = (idx: number) => {
    onChange(
      authors.map((a, i) => (i === idx ? { ...a, isFirstAuthor: !a.isFirstAuthor } : a)),
    );
  };

  const updateCredit = (idx: number, roles: CreditRole[]) =>
    updateAuthor(idx, "creditRoles", roles);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          저자 정의 ({authors.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {authors.length === 0 && (
          <p className="rounded bg-warning/5 px-3 py-2 text-sm text-warning">
            ⚠️ 출판 전 1명 이상의 저자를 추가해야 합니다.
          </p>
        )}

        {authors.map((a, idx) => (
          <div
            key={a.userId}
            className="space-y-3 rounded border border-muted p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="text-xs font-mono text-muted-foreground">
                    #{a.authorOrder}
                  </span>
                  {a.displayName}
                  {a.isCorresponding && (
                    <Crown size={14} className="text-cat-5" aria-label="교신저자" />
                  )}
                  {a.isFirstAuthor && (
                    <Star size={14} className="text-warning" aria-label="제1저자" />
                  )}
                </p>
                {a.email && (
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => swap(idx, idx - 1)}
                  disabled={idx === 0 || disabled}
                  title="위로"
                >
                  <ArrowUp size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => swap(idx, idx + 1)}
                  disabled={idx === authors.length - 1 || disabled}
                  title="아래로"
                >
                  <ArrowDown size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAt(idx)}
                  disabled={disabled}
                  title="제거"
                >
                  <X size={14} className="text-destructive" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`author-affiliation-${idx}`} className="text-xs">
                  소속 (발간 당시 동결)
                </Label>
                <Input
                  id={`author-affiliation-${idx}`}
                  value={a.affiliation}
                  onChange={(e) => updateAuthor(idx, "affiliation", e.target.value)}
                  disabled={disabled}
                  placeholder="예: 연세대학교 교육대학원 교육공학전공 석사과정"
                />
              </div>
              <div>
                <Label htmlFor={`author-orcid-${idx}`} className="text-xs">
                  ORCID iD (선택)
                </Label>
                <Input
                  id={`author-orcid-${idx}`}
                  value={a.orcidId ?? ""}
                  onChange={(e) => updateAuthor(idx, "orcidId", e.target.value)}
                  disabled={disabled}
                  placeholder="0000-0000-0000-0000"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={a.isCorresponding ? "default" : "outline"}
                onClick={() => setCorresponding(idx)}
                disabled={disabled}
              >
                <Crown size={12} className="mr-1" />
                교신저자 지정
              </Button>
              <Button
                type="button"
                size="sm"
                variant={a.isFirstAuthor ? "default" : "outline"}
                onClick={() => toggleFirstAuthor(idx)}
                disabled={disabled}
              >
                <Star size={12} className="mr-1" />
                {a.isFirstAuthor ? "제1저자 해제" : "제1저자 지정 (공동 가능)"}
              </Button>
            </div>

            <div>
              <Label className="text-xs">CRediT 기여 역할</Label>
              <CreditRoleSelector
                value={a.creditRoles}
                onChange={(r) => updateCredit(idx, r)}
                disabled={disabled}
                size="sm"
              />
            </div>
          </div>
        ))}

        {!disabled && availableMembers.length > 0 && (
          <div className="space-y-2 rounded border border-dashed border-muted p-3">
            <Label className="text-xs">팀 멤버에서 저자 추가</Label>
            <Input
              placeholder="이름 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="space-y-1">
              {availableMembers.slice(0, 5).map((m) => {
                const profile = userMap.get(m.userId);
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => addAuthor(m)}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{profile?.name ?? m.userId}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{profile?.email}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
