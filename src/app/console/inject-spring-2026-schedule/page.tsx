"use client";

/**
 * 운영 콘솔 — 2026 춘계학술대회 시간표 일괄 등록 (one-time admin tool)
 *
 * 활동 ID: 4WMIvSwobAIrqT4Nm5Ks (대외학술대회: 2026 한국교육공학회 춘계학술대회)
 * 일자: 2026-05-09
 * 시간 구조 skeleton (개회식·폐회식·4 SESSION × 7 트랙·휴식) 을 일괄 생성.
 * 세부 세션 제목·발표자는 인젝션 후 편집기에서 AI 추출 또는 수동 보강.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Calendar, Check } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { activitiesApi, conferenceProgramsApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import type { ConferenceDay, ConferenceProgram, ConferenceSession } from "@/types";

const ACTIVITY_ID = "4WMIvSwobAIrqT4Nm5Ks";
const DATE = "2026-05-09";
const LOCATION = "이화여자대학교 학관 5층 충돌구";

const TRACKS = ["A", "B", "C", "D", "E", "F", "G"] as const;

interface SessionSeed {
  startTime: string;
  endTime: string;
  category: ConferenceSession["category"];
  track?: string;
  title: string;
  speakers?: string[];
  affiliation?: string;
  location?: string;
  abstract?: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildSkeleton(): SessionSeed[] {
  const sessions: SessionSeed[] = [];

  // 09:35 — 사진 / 단체촬영
  sessions.push({
    startTime: "09:35",
    endTime: "10:00",
    category: "other",
    title: "사진 / 단체 촬영",
    location: LOCATION,
  });

  // SESSION 01 — 10:00 ~ 11:00 (A-1 ~ G-1)
  for (const t of TRACKS) {
    sessions.push({
      startTime: "10:00",
      endTime: "11:00",
      category: "paper",
      track: t,
      title: `${t}-1 (편집기에서 제목 입력)`,
      location: LOCATION,
      abstract: "AI 추출 또는 수동 입력 필요",
    });
  }

  // 개회식 — 11:10 ~ 12:00 (개·폐회식 = ceremony)
  sessions.push({
    startTime: "11:10",
    endTime: "12:00",
    category: "ceremony",
    title: "개회식",
    abstract:
      "축사 / 기조강연 'Can You Believe It?: An Enhanced Self Directed Lifelong Learning is Here!' (Curtis J. Bonk, Indiana University) / 강연 (Hiroshi Kato, The Open University of Japan)",
    location: LOCATION,
  });

  // 점심 — 12:00 ~ 13:30
  sessions.push({
    startTime: "12:00",
    endTime: "13:30",
    category: "break",
    title: "점심",
    location: LOCATION,
  });

  // 포스터 세션 A — 13:00 ~ 14:15 (parallel — 별도 트랙)
  sessions.push({
    startTime: "13:00",
    endTime: "14:15",
    category: "poster",
    track: "포스터 A",
    title: "포스터 세션 A (편집기 AI 추출 권장)",
    location: "이화여자대학교 학관 5층 503호",
    abstract: "24개 포스터 — 편집기에서 이미지(2.jpg) AI 추출",
  });

  // SESSION 02 — 13:30 ~ 14:30 (A-2 ~ G-2)
  for (const t of TRACKS) {
    sessions.push({
      startTime: "13:30",
      endTime: "14:30",
      category: "paper",
      track: t,
      title: `${t}-2 (편집기에서 제목 입력)`,
      location: LOCATION,
    });
  }

  // 휴식 — 14:30 ~ 14:40
  sessions.push({
    startTime: "14:30",
    endTime: "14:40",
    category: "break",
    title: "휴식 (10분)",
  });

  // 포스터 세션 B — 14:30 ~ 15:50
  sessions.push({
    startTime: "14:30",
    endTime: "15:50",
    category: "poster",
    track: "포스터 B",
    title: "포스터 세션 B (편집기 AI 추출 권장)",
    location: "이화여자대학교 학관 5층 503호",
    abstract: "24개 포스터 — 편집기에서 이미지(3.jpg) AI 추출",
  });

  // SESSION 03 — 14:40 ~ 15:40 (A-3 ~ G-3)
  for (const t of TRACKS) {
    sessions.push({
      startTime: "14:40",
      endTime: "15:40",
      category: "paper",
      track: t,
      title: `${t}-3 (편집기에서 제목 입력)`,
      location: LOCATION,
    });
  }

  // 휴식 — 15:40 ~ 15:50
  sessions.push({
    startTime: "15:40",
    endTime: "15:50",
    category: "break",
    title: "휴식 (10분)",
  });

  // SESSION 04 — 15:50 ~ 16:50 (A-4 ~ G-4)
  for (const t of TRACKS) {
    sessions.push({
      startTime: "15:50",
      endTime: "16:50",
      category: "paper",
      track: t,
      title: `${t}-4 (편집기에서 제목 입력)`,
      location: LOCATION,
    });
  }

  // 휴식 — 16:50 ~ 17:00
  sessions.push({
    startTime: "16:50",
    endTime: "17:00",
    category: "break",
    title: "휴식 (10분)",
  });

  // 폐회식 — 17:00 ~ 17:30
  sessions.push({
    startTime: "17:00",
    endTime: "17:30",
    category: "ceremony",
    title: "폐회식",
    abstract: "시상식 및 폐회사",
    location: LOCATION,
  });

  return sessions;
}

function MigratePageContent() {
  const qc = useQueryClient();
  const seeds = buildSkeleton();

  const { data: actRes, isLoading: actLoading } = useQuery({
    queryKey: ["console-inject-act", ACTIVITY_ID],
    queryFn: () => activitiesApi.get(ACTIVITY_ID),
    staleTime: 60_000,
  });
  const { data: progsRes, isLoading: progsLoading } = useQuery({
    queryKey: ["console-inject-prog", ACTIVITY_ID],
    queryFn: () => conferenceProgramsApi.listByActivity(ACTIVITY_ID),
    staleTime: 60_000,
  });

  const activity = actRes;
  const existingProgram = (progsRes?.data?.[0] ?? null) as ConferenceProgram | null;
  const existingDay = existingProgram?.days.find((d) => d.date === DATE);
  const alreadyHasSchedule =
    !!existingDay && existingDay.sessions.length >= 5;

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  async function runInject() {
    if (alreadyHasSchedule) {
      if (
        !confirm(
          `${DATE} 일자에 이미 ${existingDay!.sessions.length}개 세션이 있습니다. 덧붙이는 방식(append)으로 진행할까요?`,
        )
      ) {
        return;
      }
    }

    setRunning(true);
    try {
      const newSessions: ConferenceSession[] = seeds.map((s) => ({
        id: uid("ses"),
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.category,
        track: s.track,
        title: s.title,
        speakers: s.speakers,
        affiliation: s.affiliation,
        abstract: s.abstract,
        location: s.location,
      }));

      if (existingProgram) {
        // 기존 일자에 append, 없으면 새 day 추가
        const days = [...existingProgram.days];
        const idx = days.findIndex((d) => d.date === DATE);
        if (idx >= 0) {
          days[idx] = {
            ...days[idx],
            sessions: [...days[idx].sessions, ...newSessions].sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            ),
          };
        } else {
          const newDay: ConferenceDay = {
            date: DATE,
            dayLabel: "1일차",
            sessions: newSessions,
          };
          days.push(newDay);
        }
        await conferenceProgramsApi.update(existingProgram.id, { days });
      } else {
        // 신규 program 생성
        const newDay: ConferenceDay = {
          date: DATE,
          dayLabel: "1일차",
          sessions: newSessions,
        };
        await conferenceProgramsApi.create({
          activityId: ACTIVITY_ID,
          title:
            (activity as { title?: string } | undefined)?.title ??
            "2026 춘계학술대회",
          days: [newDay],
          createdBy: "system",
        });
      }

      setDone(true);
      toast.success(
        `${seeds.length}개 세션 skeleton 등록 완료. 편집기에서 AI 추출/수동 입력으로 보강하세요.`,
      );
      await qc.invalidateQueries({ queryKey: ["console-inject-prog"] });
    } catch (e) {
      toast.error(`등록 실패: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  if (actLoading || progsLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 활동·프로그램 정보 불러오는 중…
      </div>
    );
  }

  if (!activity) {
    return (
      <EmptyState
        icon={Calendar}
        title="활동을 찾을 수 없습니다"
        description={`activity ID = ${ACTIVITY_ID}`}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <ConsolePageHeader
        icon={Calendar}
        title="2026 춘계학술대회 시간표 일괄 등록"
        description={`활동: ${(activity as { title?: string }).title ?? ACTIVITY_ID} · 일자 ${DATE}`}
      />

      <div className="rounded-md border bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">사전 안내</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
          <li>총 {seeds.length}개 세션을 일괄 등록 (개회식·폐회식·SESSION 01~04 × 7 트랙·포스터 A·B·휴식)</li>
          <li>세션 제목은 자리 표시자(예: A-1)이며, 편집기에서 AI 추출 또는 수기 보강 필요</li>
          <li>이미 {DATE} 일자에 세션이 있으면 append(덧붙이기) 모드로 진행 (덮어쓰기 없음)</li>
          <li>장소: {LOCATION}</li>
        </ul>
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="text-sm">
          현재 {DATE} 일자 등록 세션:{" "}
          <b>{existingDay?.sessions.length ?? 0}개</b>
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3"
          onClick={runInject}
          disabled={running || done}
        >
          {running ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> 등록 중…
            </>
          ) : done ? (
            <>
              <Check className="mr-1 h-3 w-3" /> 완료됨
            </>
          ) : (
            `${seeds.length}개 세션 일괄 등록 실행`
          )}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left">시간</th>
              <th className="px-3 py-2 text-left">카테고리</th>
              <th className="px-3 py-2 text-left">트랙</th>
              <th className="px-3 py-2 text-left">제목</th>
              <th className="px-3 py-2 text-left">메모</th>
            </tr>
          </thead>
          <tbody>
            {seeds.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">
                  {s.startTime}~{s.endTime}
                </td>
                <td className="px-3 py-2 text-xs">{s.category}</td>
                <td className="px-3 py-2 text-xs">{s.track ?? "-"}</td>
                <td className="px-3 py-2">{s.title}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.abstract ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        등록 후{" "}
        <a
          href={`/academic-admin/external/${ACTIVITY_ID}/program`}
          className="text-primary underline"
        >
          편집기로 이동
        </a>{" "}
        하여 세션별 제목·발표자·소속을 보강하세요. 포스터 세션 A·B는 이미지 업로드로 AI 자동 추출 기능을 사용하시면 빠릅니다.
      </p>
    </div>
  );
}

export default function InjectSchedulePage() {
  return (
    <AuthGuard allowedRoles={["admin", "sysadmin"]}>
      <MigratePageContent />
    </AuthGuard>
  );
}
