"use client";

/**
 * 해커톤 산출물 제출 + 제출 목록 (v7-M1)
 *
 * 팀별 산출물 1건(제목·설명·링크·팀원)을 제출한다. 신규 컬렉션 hackathon_submissions
 * 사용 (심사 도메인 분리 — firestore.rules). 1인(팀 대표) 1제출 — 본인(ownerId)
 * 제출 존재 여부로 판정하며, 본인 제출은 수정할 수 있다.
 *
 *  - 제출 마감(HACKATHON_SUBMISSION_DEADLINE 이후)이면 폼이 잠기고 목록만 표시.
 *  - 수상 등급(award)이 지정된 제출은 수상 배지 표시.
 * 게스트는 가입 유도.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Trophy,
  Loader2,
  Send,
  LogIn,
  Link as LinkIcon,
  Users,
  Presentation,
  Github,
  MonitorPlay,
  Lock,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { hackathonSubmissionsApi } from "@/lib/bkend";
import {
  HACKATHON_AWARD_LABELS,
  type HackathonSubmission,
} from "@/types";
import {
  HACKATHON_CONTEXT_ID,
  isHackathonSubmissionClosed,
} from "./config";

const MAX_TITLE = 80;
const MAX_DESC = 600;

interface FormState {
  teamName: string;
  title: string;
  description: string;
  presentationUrl: string;
  demoUrl: string;
  repoUrl: string;
  members: string;
}

const EMPTY_FORM: FormState = {
  teamName: "",
  title: "",
  description: "",
  presentationUrl: "",
  demoUrl: "",
  repoUrl: "",
  members: "",
};

function toForm(s: HackathonSubmission): FormState {
  return {
    teamName: s.teamName ?? "",
    title: s.title ?? "",
    description: s.description ?? "",
    presentationUrl: s.presentationUrl ?? "",
    demoUrl: s.demoUrl ?? "",
    repoUrl: s.repoUrl ?? "",
    members: (s.members ?? []).join(", "),
  };
}

export default function HackathonSubmissions() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const closed = isHackathonSubmissionClosed();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── 팀 확정 프리필 연결 (M6-v9) ──
  // HackathonBoard 의 "팀 확정" 버튼이 CustomEvent + sessionStorage 로 전달하는
  // teamName/members 를 받아 제출 폼을 자동 열고 프리필한다.
  useEffect(() => {
    function applyPrefill(teamName: string, members: string) {
      setForm((f) => ({ ...f, teamName, members }));
      setEditing(true);
    }

    // 1) 같은 페이지에서 CustomEvent 수신 (페이지 리로드 없는 경우)
    function handleEvent(e: Event) {
      const detail = (e as CustomEvent<{ teamName: string; members: string }>)
        .detail;
      if (detail) applyPrefill(detail.teamName, detail.members);
    }
    window.addEventListener("hackathon:prefill", handleEvent);

    // 2) sessionStorage 잔여분 수신 (탭 이동·리로드 후 복원)
    const raw = sessionStorage.getItem("hackathon_prefill");
    if (raw) {
      sessionStorage.removeItem("hackathon_prefill");
      try {
        const data = JSON.parse(raw) as { teamName?: string; members?: string };
        applyPrefill(data.teamName ?? "", data.members ?? "");
      } catch {
        // 손상된 값 무시
      }
    }

    return () => window.removeEventListener("hackathon:prefill", handleEvent);
  }, []);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["hackathon-submissions"],
    enabled: !!user,
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  const mine = useMemo(
    () => (user ? submissions.find((s) => s.ownerId === user.id) : undefined),
    [submissions, user],
  );

  const sorted = useMemo(
    () =>
      [...submissions].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [submissions],
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["hackathon-submissions"] });
  }

  function startEdit() {
    if (mine) setForm(toForm(mine));
    else setForm(EMPTY_FORM);
    setEditing(true);
  }

  async function handleSave() {
    if (!user) return;
    const teamName = form.teamName.trim();
    const title = form.title.trim();
    const description = form.description.trim();
    if (!teamName || !title || !description) {
      toast.error("팀 이름·제목·설명은 필수입니다.");
      return;
    }
    const members = form.members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    const payload: Record<string, unknown> = {
      contextId: HACKATHON_CONTEXT_ID,
      teamName,
      title: title.slice(0, MAX_TITLE),
      description: description.slice(0, MAX_DESC),
      presentationUrl: form.presentationUrl.trim(),
      demoUrl: form.demoUrl.trim(),
      repoUrl: form.repoUrl.trim(),
      members,
      ownerId: user.id,
      ownerName: user.name,
    };
    setSaving(true);
    try {
      if (mine) {
        await hackathonSubmissionsApi.update(mine.id, payload);
        toast.success("산출물을 수정했습니다.");
      } else {
        await hackathonSubmissionsApi.create({ ...payload, published: false });
        toast.success("산출물을 제출했습니다. 수고 많으셨어요!");
      }
      setEditing(false);
      refresh();
    } catch (e) {
      console.error("[hackathon/submit]", e);
      toast.error("저장 실패 — 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  // ── 비로그인 ──
  if (!user) {
    return (
      <EmptyState
        icon={LogIn}
        title="로그인하고 산출물 제출하기"
        description="팀 산출물 제출과 열람은 회원 전용입니다. 로그인하면 우리 팀의 결과물을 남기고 다른 팀의 도전도 볼 수 있어요."
        actions={[
          { label: "로그인", href: "/login" },
          { label: "회원가입", href: "/signup", variant: "outline" },
        ]}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div id="hackathon-submission" className="space-y-6">
      {/* ── 마감 안내 ── */}
      {closed && (
        <div className="flex items-center gap-2 rounded-xl border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <Lock size={13} />
          산출물 제출이 마감되었습니다. 심사 결과와 수상작은 아래에서 확인할 수 있어요.
        </div>
      )}

      {/* ── 제출 폼 / 내 제출 요약 ── */}
      {editing ? (
        <section className="rounded-2xl border bg-card p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold">
            <Send size={16} className="text-primary" />
            {mine ? "산출물 수정" : "산출물 제출"}
          </h3>
          <div className="mt-3 space-y-3">
            <Field label="팀 이름" required>
              <input
                value={form.teamName}
                onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
                placeholder="예: 배움틈새"
                className={inputCls}
              />
            </Field>
            <Field label="산출물 제목" required>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value.slice(0, MAX_TITLE) }))
                }
                placeholder="예: 개별 학습 속도를 배려하는 AI 튜터 프로토타입"
                className={inputCls}
              />
            </Field>
            <Field label="설명" required>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value.slice(0, MAX_DESC) }))
                }
                rows={4}
                placeholder="어떤 교육 현장의 문제를, 어떤 교육공학적 근거로, 어떻게 풀었는지 적어주세요."
                className={inputCls}
              />
              <div className="mt-0.5 text-right text-[11px] text-muted-foreground">
                {form.description.length}/{MAX_DESC}
              </div>
            </Field>
            <Field label="발표자료 링크">
              <input
                value={form.presentationUrl}
                onChange={(e) => setForm((f) => ({ ...f, presentationUrl: e.target.value }))}
                placeholder="https://…"
                className={inputCls}
              />
            </Field>
            <Field label="데모 링크">
              <input
                value={form.demoUrl}
                onChange={(e) => setForm((f) => ({ ...f, demoUrl: e.target.value }))}
                placeholder="https://…"
                className={inputCls}
              />
            </Field>
            <Field label="저장소 링크">
              <input
                value={form.repoUrl}
                onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))}
                placeholder="https://github.com/…"
                className={inputCls}
              />
            </Field>
            <Field label="팀원 (쉼표로 구분)">
              <input
                value={form.members}
                onChange={(e) => setForm((f) => ({ ...f, members: e.target.value }))}
                placeholder="예: 김연세, 이교육, 박공학"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              취소
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 size={14} className="mr-1 animate-spin" />
              ) : (
                <Send size={14} className="mr-1" />
              )}
              {mine ? "수정 저장" : "제출하기"}
            </Button>
          </div>
        </section>
      ) : mine ? (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-primary">
              <CheckCircle2 size={16} />
              우리 팀 산출물 제출 완료
            </h3>
            {!closed && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                <Pencil size={13} className="mr-1" />
                수정
              </Button>
            )}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{mine.title}</p>
          <p className="text-xs text-muted-foreground">{mine.teamName}</p>
        </section>
      ) : (
        !closed && (
          <section className="rounded-2xl border bg-card p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <Trophy size={16} className="text-primary" />
              우리 팀 산출물 제출하기
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              완성도보다 문제를 잘 들여다본 과정이 더 중요합니다. 지금까지의 결과물을 남겨보세요.
            </p>
            <div className="mt-3">
              <Button size="sm" onClick={startEdit}>
                <Send size={14} className="mr-1" />
                제출 시작
              </Button>
            </div>
          </section>
        )
      )}

      {/* ── 제출 목록 ── */}
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Users size={15} className="text-primary" />
          제출된 산출물
          <span className="text-xs font-normal text-muted-foreground">
            {submissions.length}팀
          </span>
        </h3>
        {sorted.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="아직 제출된 산출물이 없습니다"
            description="첫 번째로 우리 팀의 결과물을 제출해보세요."
          />
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  {s.award && (
                    <Badge variant="default" className="gap-0.5 text-[10px]">
                      <Trophy size={9} /> {HACKATHON_AWARD_LABELS[s.award]}
                    </Badge>
                  )}
                  {user && s.ownerId === user.id && (
                    <span className="text-[11px] text-primary">· 우리 팀</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                  {s.teamName}
                  {s.members.length > 0 && (
                    <span className="ml-1 text-muted-foreground/80">
                      · {s.members.join(", ")}
                    </span>
                  )}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {s.description}
                </p>
                <SubmissionLinks submission={s} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

export function SubmissionLinks({ submission }: { submission: HackathonSubmission }) {
  const links: { url?: string; label: string; icon: typeof LinkIcon }[] = [
    { url: submission.presentationUrl, label: "발표자료", icon: Presentation },
    { url: submission.demoUrl, label: "데모", icon: MonitorPlay },
    { url: submission.repoUrl, label: "저장소", icon: Github },
  ];
  const visible = links.filter((l) => l.url && l.url.trim());
  if (visible.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {visible.map((l) => {
        const Icon = l.icon;
        return (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent"
          >
            <Icon size={12} />
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
