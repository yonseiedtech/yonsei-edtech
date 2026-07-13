"use client";

/**
 * GuestPollVoter — /gatherings/poll/[id] 공유 페이지 전용 게스트 투표 UI
 *
 * 서버 컴포넌트(page.tsx)에서 미리 계산한 candidateSlots·eventId 를 props 로 받아
 * 비로그인 방문자가 학번+이름 입력 후 가능 슬롯을 토글·자동저장할 수 있게 한다.
 * 저장은 /api/networking/availability-guest(Admin SDK, 서버 검증) 로 POST (debounce 800ms).
 *
 * 개인정보 최소화: 이름·학번은 localStorage 에만 보관하고 집계 뷰에는 노출하지 않는다.
 * pollDeadline 지난 경우 투표 불가 안내를 표시하고 폼을 숨긴다.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  candidateSlots: string[];
  pollDeadline?: string;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function fullDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export default function GuestPollVoter({ eventId, candidateSlots, pollDeadline }: Props) {
  // NetworkingPoll 과 동일한 localStorage 키 — 같은 브라우저에서 이미 투표한 경우 자동 프리필
  const [guestVoter, setGuestVoter] = useState<{ name: string; studentId: string } | null>(null);
  const [guestSlots, setGuestSlots] = useState<Set<string>>(new Set());
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [studentIdInput, setStudentIdInput] = useState("");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollClosed = !!pollDeadline && new Date(pollDeadline).getTime() < Date.now();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("gatherings.guestVoter");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { name?: unknown; studentId?: unknown };
      if (typeof parsed?.name === "string" && typeof parsed?.studentId === "string") {
        setGuestVoter({ name: parsed.name, studentId: parsed.studentId });
      }
    } catch {
      /* localStorage 접근 불가 시 무시 */
    }
  }, []);

  // 날짜별 슬롯 그룹화 (YYYY-MM-DD → slot[] 순서 유지)
  const slotsByDate = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const slot of candidateSlots) {
      const [date] = slot.split("|");
      const arr = m.get(date) ?? [];
      arr.push(slot);
      m.set(date, arr);
    }
    return m;
  }, [candidateSlots]);

  async function saveVotes(slots: string[]) {
    const voter = guestVoter;
    if (!voter) return;
    setSaving(true);
    try {
      const res = await fetch("/api/networking/availability-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          guestName: voter.name,
          studentId: voter.studentId,
          availableSlots: slots,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? "저장에 실패했습니다.");
      }
      toast.success("가능 일정이 저장되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function scheduleGuestSave(slots: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveVotes(slots), 800);
  }

  function toggleSlot(slot: string) {
    if (pollClosed || !guestVoter) return;
    setGuestSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      scheduleGuestSave(Array.from(next));
      return next;
    });
  }

  function submitGuestVoter() {
    const name = nameInput.trim();
    const sid = studentIdInput.trim();
    if (!name || !sid) {
      toast.error("이름과 학번을 입력해주세요.");
      return;
    }
    if (name.length > 30) {
      toast.error("이름이 너무 깁니다.");
      return;
    }
    if (!/^[0-9-]{1,20}$/.test(sid)) {
      toast.error("학번은 숫자와 하이픈만 입력할 수 있습니다.");
      return;
    }
    const voter = { name, studentId: sid };
    try {
      localStorage.setItem("gatherings.guestVoter", JSON.stringify(voter));
    } catch {
      /* 저장 실패해도 이번 세션 투표 진행 */
    }
    setGuestVoter(voter);
    setGuestFormOpen(false);
  }

  // 투표 마감 — 확정 대기 안내만 표시
  if (pollClosed) {
    return (
      <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
        투표가 마감되었습니다. 아래에서 집계 결과를 확인하세요.
      </div>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold">
        <CalendarCheck size={15} className="text-indigo-600 dark:text-indigo-400" />
        일정 투표 참여
      </h2>

      {!guestVoter ? (
        /* 투표 진입 — 이름·학번 입력 */
        <div className="rounded-xl border border-dashed bg-muted/30 p-3">
          {!guestFormOpen ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">
                회원이 아니어도 학번과 이름으로 참여할 수 있어요.
              </p>
              <Button size="sm" onClick={() => setGuestFormOpen(true)}>
                <UserPlus size={13} className="mr-1" />
                로그인 없이 학번·이름으로 투표하기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">
                이름과 학번을 입력하면 바로 투표할 수 있어요.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="이름"
                  maxLength={30}
                  className="h-8 text-sm sm:flex-1"
                />
                <Input
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="학번"
                  maxLength={20}
                  inputMode="numeric"
                  className="h-8 text-sm sm:flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") submitGuestVoter(); }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={submitGuestVoter}>
                  투표 시작
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setGuestFormOpen(false)}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 슬롯 토글 — 날짜별 그룹 */
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/30">
            <p className="text-[11px] text-indigo-800 dark:text-indigo-100">
              비로그인 투표 중 ·{" "}
              <b>{guestVoter.name}</b> 님 · 선택 {guestSlots.size}개
              {saving && (
                <span className="ml-1.5 text-muted-foreground">저장 중…</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setGuestVoter(null);
                setGuestSlots(new Set());
                setGuestFormOpen(false);
              }}
              className="text-[11px] text-indigo-600 underline underline-offset-2 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-100"
            >
              다시 입력
            </button>
          </div>

          <p className="mb-3 text-[11px] text-muted-foreground">
            시간대를 눌러 가능 여부를 선택하세요. 선택은 자동 저장됩니다.
          </p>

          <div className="space-y-3">
            {Array.from(slotsByDate.entries()).map(([date, slots]) => (
              <div key={date}>
                <p className="mb-1.5 text-xs font-semibold text-foreground">
                  {fullDateLabel(date)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((slot) => {
                    const time = slot.split("|")[1];
                    const active = guestSlots.has(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        aria-pressed={active}
                        disabled={saving}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums transition-colors disabled:opacity-60",
                          active
                            ? "border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500"
                            : "border-border bg-background text-muted-foreground hover:border-indigo-400 hover:text-foreground",
                        )}
                      >
                        {active && <Check size={11} />}
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
