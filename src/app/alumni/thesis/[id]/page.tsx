"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  GraduationCap,
  User as UserIcon,
  BookOpen,
} from "lucide-react";
import { alumniThesesApi, profilesApi, thesisClaimsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { AlumniThesis, User } from "@/types";

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const B = new Set(b.map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((v) => {
    if (B.has(v)) inter++;
  });
  return inter / (A.size + B.size - inter);
}

export default function AlumniThesisDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user: viewer } = useAuthStore();
  const [thesis, setThesis] = useState<AlumniThesis | null>(null);
  const [related, setRelated] = useState<AlumniThesis[]>([]);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

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
        const ranked = others
          .map((x) => ({
            t: x,
            score:
              jaccard(t.keywords ?? [], x.keywords ?? []) * 0.7 +
              (x.advisorName && x.advisorName === t.advisorName ? 0.3 : 0),
          }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((r) => r.t);
        setRelated(ranked);
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

  async function handleClaim() {
    if (!thesis || !viewer) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      await thesisClaimsApi.create({
        thesisId: thesis.id,
        userId: viewer.id,
        status: "pending",
      });
      setClaimMsg("✓ 클레임이 접수되었습니다. 운영진 검증 후 회원 프로필에 연결됩니다.");
    } catch (e) {
      setClaimMsg(`⚠ ${e instanceof Error ? e.message : "클레임 실패"}`);
    } finally {
      setClaiming(false);
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
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-snug sm:text-2xl">
                {thesis.title}
              </h1>
              {thesis.titleEn && (
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {thesis.titleEn}
                </p>
              )}
            </div>
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
            <span className="inline-flex items-center gap-1 text-sm">
              <Calendar size={12} className="text-muted-foreground" />
              {year ? `${year}년 졸업` : thesis.awardedYearMonth || "—"}
            </span>
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

          {thesis.toc && (
            <details className="mt-6 rounded-lg border bg-muted/20 p-3">
              <summary className="cursor-pointer text-sm font-medium">목차</summary>
              <pre className="mt-3 whitespace-pre-wrap text-xs text-foreground/80">
                {thesis.toc}
              </pre>
            </details>
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
            {viewer && !thesis.authorUserId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClaim}
                disabled={claiming}
              >
                {claiming ? "처리 중..." : "내 논문 맞아요 (클레임)"}
              </Button>
            )}
          </div>
          {claimMsg && (
            <p className="mt-3 text-xs text-muted-foreground">{claimMsg}</p>
          )}
        </div>

        {related.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen size={14} className="text-primary" />
              관련 논문
            </h2>
            <ul className="mt-3 divide-y">
              {related.map((r) => (
                <li key={r.id} className="py-2.5">
                  <Link
                    href={`/alumni/thesis/${r.id}`}
                    className="block hover:text-primary"
                  >
                    <p className="text-sm font-medium leading-snug">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.authorName}
                      {r.advisorName && ` · 지도 ${r.advisorName}`}
                      {r.awardedYearMonth && ` · ${r.awardedYearMonth.slice(0, 4)}년`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
