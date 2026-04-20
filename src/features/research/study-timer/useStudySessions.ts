import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studySessionsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { StudySession, StudySessionType } from "@/types";

export function useStudySessions() {
  const { user } = useAuthStore();
  const userId = user?.id;

  const { data: sessions = [], ...rest } = useQuery({
    queryKey: ["study-sessions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await studySessionsApi.listByUser(userId);
      return (res.data as unknown as StudySession[]).sort(
        (a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""),
      );
    },
    enabled: !!userId,
  });

  return { sessions, ...rest };
}

export function useStudySessionsByPaper(paperId?: string) {
  const { sessions } = useStudySessions();
  if (!paperId) return [];
  return sessions.filter((s) => s.paperId === paperId && s.endTime);
}

export function useStudySessionsByWritingPaper(writingPaperId?: string) {
  const { sessions } = useStudySessions();
  if (!writingPaperId) return [];
  return sessions.filter((s) => s.writingPaperId === writingPaperId && s.endTime);
}

export function useTodaySessions() {
  const { sessions } = useStudySessions();
  const today = new Date().toISOString().slice(0, 10);
  return sessions.filter((s) => s.startTime?.slice(0, 10) === today && s.endTime);
}

export function usePaperTotalMinutes(paperId?: string): number {
  const paperSessions = useStudySessionsByPaper(paperId);
  return paperSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
}

export function useCreateSession() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      type: StudySessionType;
      paperId?: string;
      writingPaperId?: string;
      targetTitle: string;
    }) => {
      if (!user) throw new Error("로그인 필요");
      const now = new Date().toISOString();
      const res = await studySessionsApi.create({
        userId: user.id,
        type: data.type,
        paperId: data.paperId ?? null,
        writingPaperId: data.writingPaperId ?? null,
        targetTitle: data.targetTitle,
        startTime: now,
        endTime: null,
        durationMinutes: 0,
        source: "timer",
        createdAt: now,
        updatedAt: now,
      });
      return res as unknown as StudySession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions"] }),
  });
}

export function useEndSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      focusScore,
      memo,
    }: {
      sessionId: string;
      focusScore?: number;
      memo?: string;
    }) => {
      const existing = await studySessionsApi.get(sessionId);
      const session = existing as unknown as StudySession;
      const start = new Date(session.startTime).getTime();
      const end = Date.now();
      const durationMinutes = Math.round(((end - start) / 60000) * 10) / 10;

      await studySessionsApi.update(sessionId, {
        endTime: new Date().toISOString(),
        durationMinutes,
        ...(focusScore !== undefined && { focusScore }),
        ...(memo !== undefined && { memo }),
        updatedAt: new Date().toISOString(),
      });

      return { durationMinutes };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions"] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      sessionId: string;
      type?: StudySessionType;
      targetTitle?: string;
      date: string;
      startTime: string;
      endTime: string;
      memo?: string;
    }) => {
      const startIso = `${data.date}T${data.startTime}:00`;
      const endIso = `${data.date}T${data.endTime}:00`;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      if (endMs <= startMs) throw new Error("종료 시각이 시작보다 빠릅니다");
      const durationMinutes = Math.round(((endMs - startMs) / 60000) * 10) / 10;

      await studySessionsApi.update(data.sessionId, {
        ...(data.type && { type: data.type }),
        ...(data.targetTitle !== undefined && { targetTitle: data.targetTitle }),
        startTime: new Date(startIso).toISOString(),
        endTime: new Date(endIso).toISOString(),
        durationMinutes,
        memo: data.memo ?? "",
        updatedAt: new Date().toISOString(),
      });

      return { durationMinutes };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions"] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await studySessionsApi.delete(sessionId);
      return { sessionId };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions"] }),
  });
}

export function useCreateManualSession() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      type: StudySessionType;
      paperId?: string;
      writingPaperId?: string;
      targetTitle: string;
      date: string;
      startTime: string;
      endTime: string;
      memo?: string;
    }) => {
      if (!user) throw new Error("로그인 필요");
      const startIso = `${data.date}T${data.startTime}:00`;
      const endIso = `${data.date}T${data.endTime}:00`;
      const startMs = new Date(startIso).getTime();
      const endMs = new Date(endIso).getTime();
      if (endMs <= startMs) throw new Error("종료 시각이 시작보다 빠릅니다");
      const durationMinutes = Math.round(((endMs - startMs) / 60000) * 10) / 10;
      const now = new Date().toISOString();

      await studySessionsApi.create({
        userId: user.id,
        type: data.type,
        paperId: data.paperId ?? null,
        writingPaperId: data.writingPaperId ?? null,
        targetTitle: data.targetTitle,
        startTime: new Date(startIso).toISOString(),
        endTime: new Date(endIso).toISOString(),
        durationMinutes,
        source: "manual",
        ...(data.memo && { memo: data.memo }),
        createdAt: now,
        updatedAt: now,
      });

      return { durationMinutes };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-sessions"] }),
  });
}
