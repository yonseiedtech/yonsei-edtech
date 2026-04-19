"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  GraduationCap,
  User as UserIcon,
  BookOpen,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { alumniThesesApi, profilesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import type { AlumniThesis, User } from "@/types";

function jaccardWithMatches(a: string[], b: string[]): { score: number; matches: string[] } {
  const A = new Map<string, string>();
  a.forEach((s) => {
    const norm = s.trim().toLowerCase();
    if (norm) A.set(norm, s.trim());
  });
  const B = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (A.size === 0 || B.size === 0) return { score: 0, matches: [] };
  const matches: string[] = [];
  A.forEach((orig, norm) => {
    if (B.has(norm)) matches.push(orig);
  });
  const inter = matches.length;
  const score = inter / (A.size + B.size - inter);
  return { score, matches };
}

interface RelatedThesis {
  thesis: AlumniThesis;
  reason: string;
}

interface RelatedGroups {
  byAdvisor: RelatedThesis[];
  byKeyword: RelatedThesis[];
}

interface EditDraft {
  title: string;
  titleEn: string;
  authorName: string;
  advisorName: string;
  awardedYearMonth: string;
  keywords: string;
  abstract: string;
  dcollectionUrl: string;
}

function toDraft(t: AlumniThesis): EditDraft {
  return {
    title: t.title ?? "",
    titleEn: t.titleEn ?? "",
    authorName: t.authorName ?? "",
    advisorName: t.advisorName ?? "",
    awardedYearMonth: t.awardedYearMonth ?? "",
    keywords: (t.keywords ?? []).join(", "),
    abstract: t.abstract ?? "",
    dcollectionUrl: t.dcollectionUrl ?? "",
  };
}

export default function AlumniThesisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: viewer } = useAuthStore();
  const canEdit = isAtLeast(viewer, "staff");
  const [thesis, setThesis] = useState<AlumniThesis | null>(null);
  const [related, setRelated] = useState<RelatedGroups>({
    byAdvisor: [],
    byKeyword: [],
  });
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await alumniThesesApi.get(params.id);
        if (cancelled) return;
        setThesis(t);

        if (t.authorUserId) {
          try {
            const a = await profilesApi.get(t.authorUserId);
            if (!cancelled) setAuthor(a);
          } catch {
            // 매핑된 회원 조회 실패는 무시
          }
        }

        const all = await alumniThesesApi.list();
        if (cancelled) return;
        const others = all.data.filter((x) => x.id !== t.id);

        const byAdvisor: RelatedThesis[] = t.advisorName
          ? others
              .filter((x) => x.advisorName && x.advisorName === t.advisorName)
              .sort((a, b) =>
                (b.awardedYearMonth ?? "").localeCompare(a.awardedYearMonth ?? ""),
              )
              .slice(0, 5)
              .map((x) => ({
                thesis: x,
                reason: `같은 지도교수(${t.advisorName})의 논문`,
              }))
          : [];

        const byKeyword: RelatedThesis[] = others
          .map((x) => {
            const { score, matches } = jaccardWithMatches(
              t.keywords ?? [],
              x.keywords ?? [],
            );
            return { t: x, score, matches };
          })
          .filter((r) => r.matches.length > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((r) => ({
            thesis: r.t,
            reason: `키워드 ‘${r.matches.slice(0, 3).join(", ")}’ 공유`,
          }));

        setRelated({ byAdvisor, byKeyword });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "불러오지 못했습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  const year = useMemo(() => {
    const m = (thesis?.awardedYearMonth ?? "").match(/^(\d{4})/);
    return m ? m[1] : null;
  }, [thesis]);

  const semester = useMemo(() => {
    const m = (thesis?.awardedYearMonth ?? "").match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    const y = m[1];
    const mo = Number(m[2]);
    if (mo === 2) return `${y}년 전기`;
    if (mo === 8) return `${y}년 후기`;
    return `${y}년 ${mo}월`;
  }, [thesis]);

  function startEdit() {
    if (!thesis) return;
    setDraft(toDraft(thesis));
    setEditing(true);
    setSaveMsg(null);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setSaveMsg(null);
  }

  async function saveEdit() {
    if (!thesis || !draft) return;
    if (!draft.title.trim() || !draft.authorName.trim()) {
      setSaveMsg("⚠ 제목과 저자는 필수입니다.");
      return;
    }
    if (draft.awardedYearMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(draft.awardedYearMonth)) {
      setSaveMsg("⚠ 졸업시점 형식은 YYYY-MM (예: 2025-02) 입니다.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        title: draft.title.trim(),
        titleEn: draft.titleEn.trim() || null,
        authorName: draft.authorName.trim(),
        advisorName: draft.advisorName.trim() || null,
        awardedYearMonth: draft.awardedYearMonth.trim() || null,
        keywords: draft.keywords
          .split(/[,\n]+/)
          .map((k) => k.trim())
          .filter(Boolean),
        abstract: draft.abstract.trim() || null,
        dcollectionUrl: draft.dcollectionUrl.trim() || null,
      };
      await alumniThesesApi.update(thesis.id, payload);
      const fresh = await alumniThesesApi.get(thesis.id);
      setThesis(fresh);
      setEditing(false);
      setDraft(null);
      setSaveMsg("✓ 저장되었습니다.");
    } catch (e) {
      setSaveMsg(`⚠ ${e instanceof Error ? e.message : "저장 실패"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !thesis) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <p className="text-sm text-destructive">⚠ {error ?? "논문을 찾을 수 없습니다."}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft size={14} className="mr-1" /> 뒤로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-4xl px-4">
        <Link
          href="/alumni/thesis"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={12} /> 학위논문 목록
        </Link>

        <div className="mt-4 rounded-2xl border bg-white p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
                <Calendar size={12} />
                {semester ?? (year ? `${year}년` : "졸업시점 미상")}
              </p>
              <h1 className="mt-1.5 text-xl font-bold leading-snug sm:text-2xl">
                {thesis.title}
              </h1>
              {thesis.titleEn && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {thesis.titleEn}
                </p>
              )}
            </div>
            {canEdit && !editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                className="shrink-0"
              >
                <Pencil size={13} className="mr-1.5" />
                편집
              </Button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon size={13} className="text-muted-foreground" />
              <span className="font-medium">{thesis.authorName}</span>
              {author ? (
                <Link
                  href={`/profile/${author.id}`}
                  className="ml-1 text-xs text-primary hover:underline"
                >
                  회원 프로필 →
                </Link>
              ) : (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  미매핑
                </Badge>
              )}
            </span>
            {thesis.advisorName && (
              <span className="text-sm">
                <span className="text-muted-foreground">지도:</span>{" "}
                <span className="font-medium">{thesis.advisorName}</span>
              </span>
            )}
          </div>

          {thesis.keywords && thesis.keywords.length > 0 && (
            <div className="mt-5">
              <h2 className="text-xs font-semibold text-muted-foreground">키워드</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {thesis.keywords.map((k, i) => (
                  <Badge key={`${k}-${i}`} variant="secondary" className="text-xs">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {thesis.abstract && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">초록</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {thesis.abstract}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {thesis.dcollectionUrl && (
              <a
                href={thesis.dcollectionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ExternalLink size={14} className="mr-1.5" />
                dCollection에서 원문 보기
              </a>
            )}
          </div>

          {canEdit && editing && draft && (
            <div className="mt-6 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-5">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Pencil size={14} />
                  운영진 편집 모드
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    <X size={13} className="mr-1" />
                    취소
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={saving}>
                    <Save size={13} className="mr-1" />
                    {saving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="제목 *">
                  <Input
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  />
                </Field>
                <Field label="영문 제목">
                  <Input
                    value={draft.titleEn}
                    onChange={(e) => setDraft({ ...draft, titleEn: e.target.value })}
                  />
                </Field>
                <Field label="저자명 *">
                  <Input
                    value={draft.authorName}
                    onChange={(e) =>
                      setDraft({ ...draft, authorName: e.target.value })
                    }
                  />
                </Field>
                <Field label="지도교수명">
                  <Input
                    value={draft.advisorName}
                    onChange={(e) =>
                      setDraft({ ...draft, advisorName: e.target.value })
                    }
                    placeholder="예: 이성주"
                  />
                </Field>
                <Field label="졸업시점 (YYYY-MM)">
                  <Input
                    value={draft.awardedYearMonth}
                    onChange={(e) =>
                      setDraft({ ...draft, awardedYearMonth: e.target.value })
                    }
                    placeholder="예: 2025-02 (전기) / 2025-08 (후기)"
                  />
                </Field>
                <Field label="dCollection URL">
                  <Input
                    value={draft.dcollectionUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, dcollectionUrl: e.target.value })
                    }
                    placeholder="https://dcollection.yonsei.ac.kr/..."
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="키워드 (쉼표로 구분)">
                  <Input
                    value={draft.keywords}
                    onChange={(e) =>
                      setDraft({ ...draft, keywords: e.target.value })
                    }
                    placeholder="예: 인공지능, 학습설계, 메타버스"
                  />
                </Field>
              </div>

              <div className="mt-3">
                <Field label="초록">
                  <Textarea
                    value={draft.abstract}
                    onChange={(e) =>
                      setDraft({ ...draft, abstract: e.target.value })
                    }
                    rows={8}
                    placeholder="논문 초록을 입력하세요"
                  />
                </Field>
              </div>

              {saveMsg && (
                <p
                  className={`mt-3 text-xs ${
                    saveMsg.startsWith("✓") ? "text-emerald-700" : "text-destructive"
                  }`}
                >
                  {saveMsg}
                </p>
              )}
            </div>
          )}
          {!editing && saveMsg && (
            <p
              className={`mt-3 text-xs ${
                saveMsg.startsWith("✓") ? "text-emerald-700" : "text-destructive"
              }`}
            >
              {saveMsg}
            </p>
          )}
        </div>

        {(related.byAdvisor.length > 0 || related.byKeyword.length > 0) && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <RelatedGroup
              title="지도교수 기준 추천"
              accent="indigo"
              icon={<UserIcon size={14} />}
              items={related.byAdvisor}
              emptyText={
                thesis.advisorName
                  ? "같은 지도교수의 다른 논문이 없습니다."
                  : "지도교수 정보가 없습니다."
              }
            />
            <RelatedGroup
              title="키워드 기준 추천"
              accent="amber"
              icon={<BookOpen size={14} />}
              items={related.byKeyword}
              emptyText="공유 키워드가 있는 논문이 없습니다."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function semesterLabelOf(awardedYearMonth?: string): string {
  if (!awardedYearMonth) return "";
  const m = awardedYearMonth.match(/^(\d{4})-(\d{2})/);
  if (!m) return awardedYearMonth.slice(0, 4) + "년";
  const mo = Number(m[2]);
  if (mo === 2) return `${m[1]}년 전기`;
  if (mo === 8) return `${m[1]}년 후기`;
  return `${m[1]}년`;
}

function RelatedGroup({
  title,
  accent,
  icon,
  items,
  emptyText,
}: {
  title: string;
  accent: "indigo" | "amber";
  icon: React.ReactNode;
  items: RelatedThesis[];
  emptyText: string;
}) {
  const accentMap = {
    indigo: { headBg: "bg-indigo-50", headText: "text-indigo-700", reason: "text-indigo-700" },
    amber: { headBg: "bg-amber-50", headText: "text-amber-700", reason: "text-amber-700" },
  } as const;
  const a = accentMap[accent];
  return (
    <div className="rounded-2xl border bg-white">
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${a.headBg}`}>
        <span className={a.headText}>{icon}</span>
        <h3 className={`text-xs font-bold ${a.headText}`}>{title}</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {items.length}건
        </span>
      </div>
      <div className="p-2">
        {items.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="divide-y">
            {items.map(({ thesis: r, reason }) => {
              const yearLabel = semesterLabelOf(r.awardedYearMonth);
              return (
                <li key={r.id} className="py-2.5">
                  <Link
                    href={`/alumni/thesis/${r.id}`}
                    className="block rounded-md px-2 py-1.5 hover:bg-muted/50 hover:text-primary"
                  >
                    <p className="text-sm font-medium leading-snug">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.authorName}
                      {r.advisorName && ` · 지도 ${r.advisorName}`}
                      {yearLabel && ` · ${yearLabel}`}
                    </p>
                    <p className={`mt-1 text-[11px] font-medium ${a.reason}`}>
                      {reason} 이유로 관련되었습니다.
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
