"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import ResearchPaperList from "@/features/research/ResearchPaperList";
import WritingPaperEditor from "@/features/research/WritingPaperEditor";
import WritingHeatmap from "@/features/research/WritingHeatmap";
import WritingHistoryList from "@/features/research/WritingHistoryList";
import ResearchDashboard from "@/features/research/ResearchDashboard";
import ResearchReportPrint from "@/features/research/ResearchReportPrint";
import ResearchReportEditor from "@/features/research/ResearchReportEditor";
import ResearchProposalEditor from "@/features/research/ResearchProposalEditor";
import StudyTimerStats from "@/features/research/study-timer/StudyTimerStats";
import ManualSessionDialog from "@/features/research/study-timer/ManualSessionDialog";
import EditSessionDialog from "@/features/research/study-timer/EditSessionDialog";
import { useStudySessions, useDeleteSession } from "@/features/research/study-timer/useStudySessions";
import { useResearchPapers } from "@/features/research/useResearchPapers";
import { useWritingPaper } from "@/features/research/useWritingPaper";
import { useWritingPaperHistory } from "@/features/research/useWritingPaperHistory";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import type { User, StudySession } from "@/types";
import {
  BookOpen, FileText, BookOpenCheck, FileBarChart2,
  X, CalendarRange, Printer, FileEdit, ClipboardList,
  Clock, Plus, Pencil, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPeriodLabel } from "@/lib/research-period";
import {
  currentSemesterRange,
  previousSemesterRange,
  thisYearRange,
  inferCurrentSemester,
  semesterRange,
  enrollmentYearRanges,
  type Semester,
} from "@/lib/semester";

interface Props {
  userId: string;
  readOnly?: boolean;
}

type ResearchTab = "writing" | "reading" | "report" | "timer";
type WritingSubTab = "report" | "proposal" | "thesis";
type WritingPeriodMode = "semester" | "1year" | "yearly" | "custom";

function isResearchTab(v: string | null): v is ResearchTab {
  return v === "writing" || v === "reading" || v === "report" || v === "timer";
}

function isWritingSubTab(v: string | null): v is WritingSubTab {
  return v === "report" || v === "proposal" || v === "thesis";
}

export default function MyResearchView({ userId, readOnly = false }: Props) {
  const { user: authUser } = useAuthStore();
  const isSelf = authUser?.id === userId;
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: ResearchTab = isResearchTab(rawTab) ? rawTab : "writing";

  const rawSub = searchParams.get("sub");
  const writingSubTab: WritingSubTab = isWritingSubTab(rawSub) ? rawSub : "report";

  // 연구 리포트 기간 필터
  const fromParam = searchParams.get("from") || "";
  const toParam = searchParams.get("to") || "";
  const [periodStart, setPeriodStart] = useState<string>(fromParam);
  const [periodEnd, setPeriodEnd] = useState<string>(toParam);

  // 연구 현황 (작성활동) 기간 선택
  const [writingPeriodMode, setWritingPeriodMode] = useState<WritingPeriodMode>("semester");
  const currentSem = useMemo(() => inferCurrentSemester(), []);
  const [semYear, setSemYear] = useState(currentSem.year);
  const [semSemester, setSemSemester] = useState<Semester>(currentSem.semester);
  const [yearIdx, setYearIdx] = useState(0);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // 연구 리포트 인쇄 섹션 토글
  const [showPrint, setShowPrint] = useState(false);

  // 수동 세션 추가 다이얼로그
  const [manualOpen, setManualOpen] = useState(false);
  // 세션 수정 다이얼로그
  const [editSession, setEditSession] = useState<StudySession | null>(null);

  // 학습 세션 (연구 타이머) — 본인일 때만 의미 있음 (hook이 authStore 사용)
  const { sessions: studySessions } = useStudySessions();
  const { mutateAsync: deleteSession } = useDeleteSession();

  async function handleDeleteSession(s: StudySession) {
    const label = s.targetTitle || "(제목 없음)";
    if (!window.confirm(`"${label}" 세션을 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return;
    try {
      await deleteSession(s.id);
      toast.success("세션이 삭제되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다");
    }
  }

  const { data: fetchedUser } = useQuery({
    queryKey: ["mypage-user", userId],
    queryFn: async () => {
      const res = await profilesApi.get(userId);
      return res as unknown as User;
    },
    enabled: !isSelf,
  });
  const user = isSelf ? authUser : fetchedUser;

  const { papers } = useResearchPapers(userId);
  const { paper: writingPaper } = useWritingPaper(userId);
  const { history } = useWritingPaperHistory(userId);

  // 연구 리포트 기간 라벨
  const periodLabel = useMemo(
    () => formatPeriodLabel(periodStart, periodEnd),
    [periodStart, periodEnd],
  );

  // 연구 현황 기간 계산
  const yearRanges = useMemo(() => {
    if (!user?.enrollmentYear || !user?.enrollmentHalf) return [];
    return enrollmentYearRanges(user.enrollmentYear, user.enrollmentHalf);
  }, [user?.enrollmentYear, user?.enrollmentHalf]);

  const oneYearRange = useMemo(() => {
    const now = new Date();
    const fromY = now.getFullYear() - 1;
    const fromM = String(now.getMonth() + 1).padStart(2, "0");
    const toY = now.getFullYear();
    const toM = String(now.getMonth() + 1).padStart(2, "0");
    return {
      from: `${fromY}-${fromM}`,
      to: `${toY}-${toM}`,
      label: `최근 1년 (${fromY}.${fromM}~${toY}.${toM})`,
    };
  }, []);

  const writingPeriod = useMemo(() => {
    if (writingPeriodMode === "semester") {
      return semesterRange(semYear, semSemester);
    }
    if (writingPeriodMode === "1year") {
      return oneYearRange;
    }
    if (writingPeriodMode === "yearly" && yearRanges[yearIdx]) {
      return yearRanges[yearIdx];
    }
    return { from: customStart, to: customEnd, label: "" };
  }, [writingPeriodMode, semYear, semSemester, oneYearRange, yearIdx, yearRanges, customStart, customEnd]);

  // 연구 현황 필터링된 이력
  const filteredHistory = useMemo(() => {
    const { from, to } = writingPeriod;
    if (!from && !to) return history;
    return history.filter((h) => {
      const ym = h.savedAt?.slice(0, 7);
      if (!ym) return false;
      if (from && ym < from) return false;
      if (to && ym > to) return false;
      return true;
    });
  }, [history, writingPeriod]);

  if (!user) return null;

  // 리포트 기간 빠른 선택
  const cur = currentSemesterRange();
  const prev = previousSemesterRange();
  const ty = thisYearRange();

  function handleTabChange(next: string) {
    if (!isResearchTab(next)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    params.delete("sub");
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  function handleSubTabChange(sub: WritingSubTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "writing");
    params.set("sub", sub);
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  function syncPeriodToUrl(start: string, end: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (start) params.set("from", start); else params.delete("from");
    if (end) params.set("to", end); else params.delete("to");
    router.replace(`/mypage/research?${params.toString()}`, { scroll: false });
  }

  function handleStartChange(v: string) {
    setPeriodStart(v);
    syncPeriodToUrl(v, periodEnd);
  }

  function handleEndChange(v: string) {
    setPeriodEnd(v);
    syncPeriodToUrl(periodStart, v);
  }

  function applyRange(from: string, to: string) {
    setPeriodStart(from);
    setPeriodEnd(to);
    syncPeriodToUrl(from, to);
  }

  function resetPeriod() {
    setPeriodStart("");
    setPeriodEnd("");
    syncPeriodToUrl("", "");
  }

  function navigateSemester(dir: -1 | 1) {
    if (dir === 1) {
      if (semSemester === "first") {
        setSemSemester("second");
      } else {
        setSemYear((y) => y + 1);
        setSemSemester("first");
      }
    } else {
      if (semSemester === "second") {
        setSemSemester("first");
      } else {
        setSemYear((y) => y - 1);
        setSemSemester("second");
      }
    }
  }

  const hasPeriod = !!(periodStart || periodEnd);

  return (
    <div className="py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between print-hide">
          <div className="flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            <h1 className="text-2xl font-bold">내 연구활동</h1>
          </div>
          <Link
            href="/mypage"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            마이페이지로 돌아가기
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground print-hide">
          직접 쓰는 논문과 분석한 논문을 한 곳에서 관리하세요.
        </p>

        {/* ── 연구 현황 (탭 위 공유 섹션, 모든 탭에 노출) ── */}
        <div className="space-y-4 mt-6 print-hide">
          <h3 className="text-sm font-semibold text-foreground">연구 현황</h3>

          {/* 기간 선택기 */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarRange size={12} />
                기간 선택
              </span>
              <PeriodModeBtn label="학기" active={writingPeriodMode === "semester"} onClick={() => setWritingPeriodMode("semester")} />
              <PeriodModeBtn label="1년" active={writingPeriodMode === "1year"} onClick={() => setWritingPeriodMode("1year")} />
              {yearRanges.length > 0 && (
                <PeriodModeBtn label="연간" active={writingPeriodMode === "yearly"} onClick={() => setWritingPeriodMode("yearly")} />
              )}
              <PeriodModeBtn label="직접 설정" active={writingPeriodMode === "custom"} onClick={() => setWritingPeriodMode("custom")} />
            </div>

            {writingPeriodMode === "semester" && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigateSemester(-1)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">◀</button>
                <span className="text-sm font-medium">{writingPeriod.label}</span>
                <button type="button" onClick={() => navigateSemester(1)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">▶</button>
              </div>
            )}

            {writingPeriodMode === "1year" && (
              <p className="text-sm font-medium">{oneYearRange.label}</p>
            )}

            {writingPeriodMode === "yearly" && yearRanges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {yearRanges.map((r, i) => (
                  <QuickBtn
                    key={r.from}
                    label={r.label.split(" ")[0]}
                    onClick={() => setYearIdx(i)}
                    active={yearIdx === i}
                  />
                ))}
              </div>
            )}

            {writingPeriodMode === "custom" && (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">시작</label>
                  <Input type="month" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">종료</label>
                  <Input type="month" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
                </div>
              </div>
            )}
          </div>

          <WritingHeatmap history={filteredHistory} />
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-6 print-hide">
          <TabsList variant="line" className="w-full justify-start gap-2 border-b">
            <TabsTrigger value="writing" className="flex-none">
              <FileText size={14} />내 논문 작성
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex-none">
              <BookOpenCheck size={14} />논문 읽기
            </TabsTrigger>
            <TabsTrigger value="report" className="flex-none">
              <FileBarChart2 size={14} />연구 리포트
            </TabsTrigger>
            <TabsTrigger value="timer" className="flex-none">
              <Clock size={14} />연구 타이머
            </TabsTrigger>
          </TabsList>

          {/* ── 내 논문 작성 ── */}
          <TabsContent value="writing" className="mt-5">
            {/* 서브탭 */}
            <div className="inline-flex rounded-lg border bg-white p-1 gap-1 mb-5">
              <SubTabBtn
                label="연구 보고서"
                icon={<FileEdit size={13} />}
                active={writingSubTab === "report"}
                onClick={() => handleSubTabChange("report")}
              />
              <SubTabBtn
                label="연구 계획서"
                icon={<ClipboardList size={13} />}
                active={writingSubTab === "proposal"}
                onClick={() => handleSubTabChange("proposal")}
              />
              <SubTabBtn
                label="논문"
                icon={<FileText size={13} />}
                active={writingSubTab === "thesis"}
                onClick={() => handleSubTabChange("thesis")}
              />
            </div>

            {/* 서브탭 콘텐츠 */}
            {writingSubTab === "report" && (
              <ResearchReportEditor user={user} readOnly={!isSelf || readOnly} />
            )}

            {writingSubTab === "proposal" && (
              <ResearchProposalEditor user={user} readOnly={!isSelf || readOnly} />
            )}

            {writingSubTab === "thesis" && (
              <WritingPaperEditor user={user} readOnly={!isSelf || readOnly} />
            )}
          </TabsContent>

          {/* ── 논문 읽기 ── */}
          <TabsContent value="reading" className="mt-5">
            <ResearchPaperList
              user={user}
              readOnly={!isSelf || readOnly}
              periodStart={periodStart}
              periodEnd={periodEnd}
            />
          </TabsContent>

          {/* ── 연구 리포트 ── */}
          <TabsContent value="report" className="mt-5">
            <div className="space-y-6">
              {/* 기간 필터 */}
              <section className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <CalendarRange size={12} />
                      빠른 선택
                    </span>
                    <QuickBtn label={cur.label} onClick={() => applyRange(cur.from, cur.to)} active={periodStart === cur.from && periodEnd === cur.to} />
                    <QuickBtn label={prev.label} onClick={() => applyRange(prev.from, prev.to)} active={periodStart === prev.from && periodEnd === prev.to} />
                    <QuickBtn label={ty.label} onClick={() => applyRange(ty.from, ty.to)} active={periodStart === ty.from && periodEnd === ty.to} />
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">시작 (YYYY-MM)</label>
                      <Input type="month" value={periodStart} onChange={(e) => handleStartChange(e.target.value)} className="w-40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">종료 (YYYY-MM)</label>
                      <Input type="month" value={periodEnd} onChange={(e) => handleEndChange(e.target.value)} className="w-40" />
                    </div>
                    {hasPeriod && (
                      <button
                        type="button"
                        onClick={resetPeriod}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X size={12} />
                        초기화
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    기간: <span className="font-medium text-foreground">{periodLabel}</span>
                    {" · "}리포트 통계 및 논문 읽기 목록에 적용됩니다.
                  </p>
                </div>
              </section>

              <div className="print-hide">
                <ResearchDashboard
                  papers={papers}
                  history={history}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                />
              </div>

              {/* 출력 버튼 */}
              <div className="flex justify-end print-hide">
                <button
                  type="button"
                  onClick={() => setShowPrint((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Printer size={14} />
                  {showPrint ? "리포트 닫기" : "연구활동 리포트 출력"}
                </button>
              </div>

              {showPrint && (
                <ResearchReportPrint
                  user={user}
                  papers={papers}
                  writingPaper={writingPaper ?? null}
                  history={history}
                  periodStart={periodStart}
                  periodEnd={periodEnd}
                />
              )}
            </div>
          </TabsContent>

          {/* ── 연구 타이머 ── */}
          <TabsContent value="timer" className="mt-5">
            {isSelf ? (
              <div className="space-y-6">
                <StudyTimerStats />

                <div className="rounded-2xl border bg-white p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Pencil size={14} />
                        수동 세션 추가
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        타이머를 켜지 않고 했던 연구·읽기 시간을 직접 입력하세요.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setManualOpen(true)}>
                      <Plus size={14} className="mr-1" />
                      추가
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">최근 세션</h3>
                  {studySessions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      아직 기록된 세션이 없습니다. 수동 추가 또는 논문 화면에서 타이머를 시작해보세요.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {studySessions.slice(0, 20).map((s) => {
                        const date = s.startTime?.slice(0, 10) ?? "";
                        const start = s.startTime?.slice(11, 16) ?? "";
                        const end = s.endTime?.slice(11, 16) ?? "";
                        const minutes = s.durationMinutes ?? 0;
                        const completed = !!s.endTime;
                        return (
                          <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm truncate">
                                <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  s.type === "writing"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-emerald-50 text-emerald-600"
                                }`}>
                                  {s.type === "writing" ? "작성" : "읽기"}
                                </span>
                                <span className="text-foreground">{s.targetTitle || "(제목 없음)"}</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {date} · {start}~{end}
                                {s.source === "manual" && (
                                  <span className="ml-1 text-amber-600">· 수동</span>
                                )}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-medium text-muted-foreground">
                              {minutes < 60
                                ? `${Math.round(minutes)}분`
                                : `${(minutes / 60).toFixed(1)}h`}
                            </span>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setEditSession(s)}
                                disabled={!completed}
                                title={completed ? "세션 수정" : "진행 중인 세션은 수정할 수 없습니다"}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSession(s)}
                                title="세션 삭제"
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-12 text-center">
                연구 타이머는 본인만 확인할 수 있습니다.
              </p>
            )}
          </TabsContent>
        </Tabs>

        {/* ── 작성 이력 (페이지 하단 공통 영역) ── */}
        <div className="mt-8 print-hide">
          <WritingHistoryList history={filteredHistory} />
        </div>

        {isSelf && (
          <>
            <ManualSessionDialog
              open={manualOpen}
              onClose={() => setManualOpen(false)}
            />
            <EditSessionDialog
              open={!!editSession}
              session={editSession}
              onClose={() => setEditSession(null)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function QuickBtn({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function PeriodModeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SubTabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
