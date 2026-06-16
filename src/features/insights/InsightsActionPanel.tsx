"use client";

/**
 * InsightsActionPanel — 운영 인사이트 액션화 (2차 백로그 v2-M3).
 *
 * insights 통계를 "보고 끝"에서 "보고 행동"으로. 데이터로 식별한 회원군에게
 * 운영진이 넛지(인앱 + 푸시 알림)를 1클릭으로 일괄 발송한다.
 *
 * 3개 데이터 기반 세그먼트:
 *   - churn_risk        : 60일+ 미접속 승인 회원 (이탈 위험)
 *   - diagnosis_missing : 진단평가 미응시 승인 회원 (진단 유도)
 *   - review_stalled    : 복습 지연 암기카드가 임계 이상인 회원 (복습 정체)
 *
 * 발송 안전 장치(오발송 방지):
 *   1. "대상 미리보기" → 서버 dryRun 으로 대상 수·명단·메시지 미리보기
 *   2. 확인 다이얼로그에서 메시지 편집 + 대상 수 재확인 후에만 발송
 *   3. 서버: admin 인증 · NotificationPrefs 옵트아웃 존중 · 1일 1회 중복 방지 · 발송 상한
 *
 * 메시지 톤·발송 정책은 운영진 결정 사항 — 기본 템플릿 + 확인 절차까지만 제공.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardList,
  Layers,
  Send,
  Eye,
  Loader2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

type Segment = "churn_risk" | "diagnosis_missing" | "review_stalled";

interface TargetMember {
  userId: string;
  name: string;
  reason: string;
}

interface DryRunResult {
  segment: Segment;
  total: number;
  capped: boolean;
  maxRecipients: number;
  targets: TargetMember[];
  preview: { title: string; body: string; link: string };
}

interface SegmentDef {
  segment: Segment;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const SEGMENTS: SegmentDef[] = [
  {
    segment: "churn_risk",
    label: "이탈 위험군 넛지",
    description: "60일 이상 미접속한 승인 회원에게 재참여 독려 알림을 발송합니다.",
    icon: AlertTriangle,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-950/30",
  },
  {
    segment: "diagnosis_missing",
    label: "진단 미응시자 유도",
    description: "진단평가를 아직 받지 않은 승인 회원에게 응시 유도 알림을 발송합니다.",
    icon: ClipboardList,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-950/30",
  },
  {
    segment: "review_stalled",
    label: "복습 정체 회원 알림",
    description: "복습 지연 암기카드가 많이 쌓인 회원에게 복습 독려 알림을 발송합니다.",
    icon: Layers,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-950/30",
  },
];

async function callNudgeApi(payload: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("인증 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
  const res = await fetch("/api/admin/insights/nudge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error ? `발송 실패: ${data.error}` : "발송에 실패했습니다.");
  }
  return data;
}

export default function InsightsActionPanel() {
  const [loadingSegment, setLoadingSegment] = useState<Segment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  async function handlePreview(segment: Segment) {
    setLoadingSegment(segment);
    try {
      const data = (await callNudgeApi({ segment, dryRun: true })) as DryRunResult;
      setDryRun(data);
      setTitle(data.preview.title);
      setBody(data.preview.body);
      setLink(data.preview.link);
      setDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "대상 조회에 실패했습니다.");
    } finally {
      setLoadingSegment(null);
    }
  }

  async function handleSend() {
    if (!dryRun) return;
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 모두 입력해 주세요.");
      return;
    }
    setSending(true);
    try {
      const data = await callNudgeApi({
        segment: dryRun.segment,
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || undefined,
        dryRun: false,
      });
      const notified = data?.notified ?? 0;
      const sentTotal = data?.sentTotal ?? 0;
      const skippedDup = data?.skippedDup ?? 0;
      toast.success(
        `넛지 발송 완료 — 인앱 ${notified}명 · 푸시 ${sentTotal}건` +
          (skippedDup > 0 ? ` (오늘 중복 ${skippedDup}명 제외)` : ""),
      );
      setDialogOpen(false);
      setDryRun(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "발송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  const activeDef = dryRun
    ? SEGMENTS.find((s) => s.segment === dryRun.segment)
    : null;

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        데이터로 식별한 회원군에게 <strong className="text-foreground">참여 독려 넛지(인앱 + 푸시 알림)</strong>를
        일괄 발송합니다. <strong className="text-foreground">대상 미리보기 → 메시지 확인</strong> 후에만 발송되며,
        알림 수신을 끈 회원의 푸시는 자동 제외됩니다. 같은 대상에는 하루 1회만 발송됩니다.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SEGMENTS.map((def) => {
          const Icon = def.icon;
          const loading = loadingSegment === def.segment;
          return (
            <div key={def.segment} className="flex flex-col rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${def.color}`}
                >
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{def.label}</p>
                </div>
              </div>
              <p className="mb-4 flex-1 text-xs leading-relaxed text-muted-foreground">
                {def.description}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => handlePreview(def.segment)}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" />
                    대상 조회 중…
                  </>
                ) : (
                  <>
                    <Eye size={14} className="mr-1.5" />
                    대상 미리보기
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* 확인 다이얼로그 — 대상 수·명단·메시지 미리보기 후 발송 */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !sending && setDialogOpen(o)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeDef && <activeDef.icon size={18} className="text-muted-foreground" />}
              {activeDef?.label ?? "넛지 발송"}
            </DialogTitle>
            <DialogDescription>
              발송 전 대상과 메시지를 확인하세요. 발송 후에는 취소할 수 없습니다.
            </DialogDescription>
          </DialogHeader>

          {dryRun && (
            <div className="space-y-4">
              {/* 대상 수 */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
                <Users size={16} className="text-muted-foreground" />
                <span>
                  발송 대상{" "}
                  <strong className="text-foreground">{dryRun.total}명</strong>
                </span>
                {dryRun.capped && (
                  <span className="ml-auto text-[11px] text-rose-500">
                    상한 {dryRun.maxRecipients}명 초과 — 발송 불가
                  </span>
                )}
              </div>

              {dryRun.total === 0 ? (
                <p className="rounded-lg border border-dashed bg-muted/10 py-6 text-center text-xs text-muted-foreground">
                  조건에 해당하는 회원이 없습니다.
                </p>
              ) : (
                <>
                  {/* 대상 명단 미리보기 */}
                  <div className="rounded-lg border">
                    <p className="border-b bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                      대상 명단 (최대 100명 미리보기)
                    </p>
                    <ul className="max-h-40 divide-y overflow-y-auto">
                      {dryRun.targets.map((t) => (
                        <li
                          key={t.userId}
                          className="flex items-center justify-between px-3 py-1.5 text-xs"
                        >
                          <span className="truncate font-medium">{t.name}</span>
                          <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                            {t.reason}
                          </span>
                        </li>
                      ))}
                      {dryRun.total > dryRun.targets.length && (
                        <li className="px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                          외 {dryRun.total - dryRun.targets.length}명
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* 메시지 편집 */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium">
                      알림 제목
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={50}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        placeholder="알림 제목"
                      />
                    </label>
                    <label className="block text-xs font-medium">
                      알림 내용
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={200}
                        rows={3}
                        className="mt-1 w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm"
                        placeholder="알림 내용"
                      />
                    </label>
                    <label className="block text-xs font-medium">
                      이동 링크
                      <input
                        type="text"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        placeholder="/dashboard"
                      />
                    </label>
                  </div>

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    인앱 알림은 대상 전원에게, 푸시 알림은 수신 동의 회원에게만 발송됩니다. 오늘 이미 같은
                    넛지를 받은 회원은 중복 제외됩니다.
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={sending}
            >
              취소
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                sending ||
                !dryRun ||
                dryRun.total === 0 ||
                dryRun.capped ||
                !title.trim() ||
                !body.trim()
              }
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                  발송 중…
                </>
              ) : (
                <>
                  <Send size={14} className="mr-1.5" />
                  {dryRun ? `${dryRun.total}명에게 발송` : "발송"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
