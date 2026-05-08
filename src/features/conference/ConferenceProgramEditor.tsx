"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { conferenceProgramsApi } from "@/lib/bkend";
import { uploadToStorage } from "@/lib/storage";
import KeywordMultiSelect from "@/components/ui/keyword-multi-select";
import { auth } from "@/lib/firebase";
import { todayYmdKst } from "@/lib/dday";
import {
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  type ConferenceDay,
  type ConferenceProgram,
  type ConferenceSession,
  type ConferenceSessionCategory,
} from "@/types";

interface Props {
  activityId: string;
  activityTitle: string;
  currentUserId: string;
}

const CATEGORY_OPTIONS: ConferenceSessionCategory[] = [
  "keynote", "symposium", "panel", "paper", "poster", "media",
  "workshop", "networking", "ceremony", "break", "other",
];

function uid() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function blankSession(): ConferenceSession {
  return {
    id: uid(),
    startTime: "09:00",
    endTime: "10:00",
    category: "paper",
    title: "새 세션",
  };
}

function blankDay(date: string, label?: string): ConferenceDay {
  return { date, dayLabel: label, sessions: [blankSession()] };
}

export default function ConferenceProgramEditor({
  activityId,
  activityTitle,
  currentUserId,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);
  const [draft, setDraft] = useState<{
    title: string;
    notes: string;
    days: ConferenceDay[];
    uploadedSourceUrl?: string;
    uploadedSourceType?: "image" | "pdf";
    uploadedSourceName?: string;
  }>({
    title: activityTitle,
    notes: "",
    days: [],
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // Phase 0 P0: dirty 상태 — draft 가 마지막 저장과 다를 때 true
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractPreview, setExtractPreview] = useState<{
    title?: string;
    notes?: string;
    days: ConferenceDay[];
  } | null>(null);
  const [extractHint, setExtractHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await conferenceProgramsApi.listByActivity(activityId);
        if (!alive) return;
        const first = res?.data?.[0];
        if (first) {
          setProgram(first);
          setDraft({
            title: first.title || activityTitle,
            notes: first.notes ?? "",
            days: (first.days ?? []).map((d) => ({
              ...d,
              sessions: d.sessions.map((s) => ({ ...s })),
            })),
            uploadedSourceUrl: first.uploadedSourceUrl,
            uploadedSourceType: first.uploadedSourceType,
            uploadedSourceName: first.uploadedSourceName,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "프로그램 로드 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activityId, activityTitle]);

  const totalSessions = useMemo(
    () => draft.days.reduce((sum, d) => sum + d.sessions.length, 0),
    [draft.days],
  );

  function addDay() {
    const lastDate = draft.days[draft.days.length - 1]?.date;
    const next = lastDate
      ? new Date(new Date(lastDate).getTime() + 86_400_000)
          .toISOString()
          .slice(0, 10)
      // Sprint 69: KST 기준 오늘 (UTC drift 픽스)
      : todayYmdKst();
    const label = `${draft.days.length + 1}일차`;
    setDraft((d) => ({ ...d, days: [...d.days, blankDay(next, label)] }));
  }

  function removeDay(idx: number) {
    setDraft((d) => ({ ...d, days: d.days.filter((_, i) => i !== idx) }));
  }

  function patchDay(idx: number, patch: Partial<ConferenceDay>) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) => (i === idx ? { ...day, ...patch } : day)),
    }));
  }

  function addSession(dayIdx: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) =>
        i === dayIdx
          ? { ...day, sessions: [...day.sessions, blankSession()] }
          : day,
      ),
    }));
  }

  function patchSession(
    dayIdx: number,
    sessionIdx: number,
    patch: Partial<ConferenceSession>,
  ) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              sessions: day.sessions.map((s, j) =>
                j === sessionIdx ? { ...s, ...patch } : s,
              ),
            }
          : day,
      ),
    }));
  }

  function moveSession(dayIdx: number, sessionIdx: number, dir: -1 | 1) {
    setDraft((d) => {
      const day = d.days[dayIdx];
      if (!day) return d;
      const next = sessionIdx + dir;
      if (next < 0 || next >= day.sessions.length) return d;
      const arr = [...day.sessions];
      [arr[sessionIdx], arr[next]] = [arr[next], arr[sessionIdx]];
      return {
        ...d,
        days: d.days.map((day2, i) =>
          i === dayIdx ? { ...day2, sessions: arr } : day2,
        ),
      };
    });
  }

  function removeSession(dayIdx: number, sessionIdx: number) {
    setDraft((d) => ({
      ...d,
      days: d.days.map((day, i) =>
        i === dayIdx
          ? { ...day, sessions: day.sessions.filter((_, j) => j !== sessionIdx) }
          : day,
      ),
    }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        throw new Error("이미지 또는 PDF 파일만 업로드 가능합니다.");
      }
      const uploaded = await uploadToStorage(
        file,
        `conference-programs/${activityId}`,
      );
      setDraft((d) => ({
        ...d,
        uploadedSourceUrl: uploaded.url,
        uploadedSourceType: isPdf ? "pdf" : "image",
        uploadedSourceName: uploaded.name,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("파일 읽기 실패"));
      reader.readAsDataURL(file);
    });
  }

  async function handleAiExtract(file: File) {
    setExtracting(true);
    setError(null);
    try {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) {
        throw new Error("이미지 또는 PDF 파일만 가능합니다.");
      }
      if (file.size > 6 * 1024 * 1024) {
        throw new Error("파일이 너무 큽니다. (최대 6MB)");
      }

      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("로그인이 필요합니다.");
      const token = await currentUser.getIdToken(true);

      const dataUrl = await fileToBase64(file);
      const res = await fetch("/api/ai/conference-extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageData: dataUrl,
          mimeType: file.type,
          hint: extractHint || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `AI 호출 실패 (${res.status})`);
      }
      const data = (await res.json()) as {
        title?: string;
        notes?: string;
        days: ConferenceDay[];
      };
      const daysWithIds: ConferenceDay[] = (data.days ?? []).map((d) => ({
        ...d,
        sessions: (d.sessions ?? []).map((s) => ({ ...s, id: uid() })),
      }));
      if (daysWithIds.length === 0) {
        throw new Error("추출된 세션이 없습니다. 더 선명한 이미지로 재시도하세요.");
      }
      setExtractPreview({
        title: data.title,
        notes: data.notes,
        days: daysWithIds,
      });
      toast.success(
        `${daysWithIds.length}일 / ${daysWithIds.reduce((n, d) => n + d.sessions.length, 0)}개 세션 추출 완료`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI 추출 실패";
      setError(msg);
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  }

  function applyExtractMerge() {
    if (!extractPreview) return;
    setDraft((d) => {
      const merged: ConferenceDay[] = [...d.days];
      for (const newDay of extractPreview.days) {
        const idx = merged.findIndex((x) => x.date === newDay.date);
        if (idx === -1) {
          merged.push(newDay);
        } else {
          const existingTitles = new Set(merged[idx].sessions.map((s) => s.title));
          const fresh = newDay.sessions.filter((s) => !existingTitles.has(s.title));
          merged[idx] = {
            ...merged[idx],
            sessions: [...merged[idx].sessions, ...fresh],
          };
        }
      }
      merged.sort((a, b) => a.date.localeCompare(b.date));
      return {
        ...d,
        title: d.title || extractPreview.title || d.title,
        notes: d.notes || extractPreview.notes || d.notes,
        days: merged,
      };
    });
    setExtractPreview(null);
    toast.success("초안에 병합되었습니다. 검토 후 저장하세요.");
  }

  function applyExtractReplace() {
    if (!extractPreview) return;
    setDraft((d) => ({
      ...d,
      title: extractPreview.title || d.title,
      notes: extractPreview.notes || d.notes,
      days: extractPreview.days,
    }));
    setExtractPreview(null);
    toast.success("기존 일자가 교체되었습니다. 검토 후 저장하세요.");
  }

  // ─────────────────────────────────────────────────────────────────
  // Sprint 67-C: CSV 업로드 — AI 추출 실패 시 대체 경로
  // 헤더: date,startTime,endTime,track,category,title,speakers,affiliation,location,abstract
  // ─────────────────────────────────────────────────────────────────
  function parseCsvText(text: string): ConferenceDay[] {
    text = text.replace(/^﻿/, "");
    const rows: string[][] = [];
    let cur = "";
    let inQuote = false;
    let row: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuote) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          cur += c;
        }
      } else {
        if (c === '"') inQuote = true;
        else if (c === ",") {
          row.push(cur);
          cur = "";
        } else if (c === "\n") {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        } else if (c === "\r") {
          // skip CR (handled by LF)
        } else {
          cur += c;
        }
      }
    }
    if (cur.length || row.length) {
      row.push(cur);
      rows.push(row);
    }
    if (rows.length === 0) throw new Error("빈 CSV 파일입니다.");

    const header = (rows.shift() ?? []).map((s) => s.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k.toLowerCase());
    const dateI = idx("date");
    const startI = idx("starttime");
    const endI = idx("endtime");
    const trackI = idx("track");
    const catI = idx("category");
    const titleI = idx("title");
    const speakersI = idx("speakers");
    const affI = idx("affiliation");
    const locI = idx("location");
    const abstractI = idx("abstract");

    if (dateI < 0 || startI < 0 || endI < 0 || titleI < 0) {
      throw new Error(
        "CSV 헤더에 date,startTime,endTime,title 컬럼이 모두 필요합니다.",
      );
    }

    const VALID_CATS = new Set([
      "keynote",
      "symposium",
      "panel",
      "paper",
      "poster",
      "media",
      "workshop",
      "networking",
      "ceremony",
      "break",
      "other",
    ]);

    const byDate = new Map<string, ConferenceDay["sessions"]>();
    for (const r of rows) {
      if (!r.length || r.every((v) => !v?.trim())) continue;
      const date = r[dateI]?.trim();
      if (!date) continue;
      const rawCat = (catI >= 0 ? r[catI]?.trim() : "") || "other";
      const category = (VALID_CATS.has(rawCat) ? rawCat : "other") as ConferenceDay["sessions"][number]["category"];
      const speakersRaw = speakersI >= 0 ? r[speakersI]?.trim() ?? "" : "";
      const speakers = speakersRaw
        ? speakersRaw.split(/[;,/]/).map((s) => s.trim()).filter(Boolean)
        : undefined;
      const session = {
        id: uid(),
        startTime: r[startI]?.trim() ?? "",
        endTime: r[endI]?.trim() ?? "",
        track: trackI >= 0 ? r[trackI]?.trim() || undefined : undefined,
        category,
        title: r[titleI]?.trim() ?? "",
        speakers,
        affiliation: affI >= 0 ? r[affI]?.trim() || undefined : undefined,
        location: locI >= 0 ? r[locI]?.trim() || undefined : undefined,
        abstract: abstractI >= 0 ? r[abstractI]?.trim() || undefined : undefined,
      };
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(session);
    }

    const days: ConferenceDay[] = [...byDate.entries()].map(([date, sessions]) => ({
      date,
      sessions: sessions.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
    days.sort((a, b) => a.date.localeCompare(b.date));
    if (days.length === 0) {
      throw new Error("유효한 데이터 행이 없습니다. CSV 내용을 확인하세요.");
    }
    return days;
  }

  async function handleCsvUpload(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const days = parseCsvText(text);
      setExtractPreview({
        title: undefined,
        notes: undefined,
        days,
      });
      const total = days.reduce((n, d) => n + d.sessions.length, 0);
      toast.success(
        `CSV 파싱 완료 — ${days.length}일 / ${total}개 세션. 미리보기에서 병합 또는 교체를 선택하세요.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "CSV 파싱 실패";
      setError(msg);
      toast.error(msg);
    }
  }

  /**
   * Phase 0 P0: 저장 전 무결성 검증 — 필수값·시간 순서·중복 일자 등.
   * 반환: 에러 메시지 배열 (빈 배열이면 통과).
   */
  function validateProgramDraft(d: typeof draft): string[] {
    const errors: string[] = [];
    if (!d.title?.trim()) errors.push("프로그램 제목을 입력하세요.");
    if (d.days.length === 0) errors.push("최소 1개의 일자가 필요합니다.");

    // 일자 중복 검사
    const dateSeen = new Set<string>();
    for (const day of d.days) {
      if (!day.date) {
        errors.push("빈 일자가 있습니다 — 날짜를 입력하세요.");
        continue;
      }
      if (dateSeen.has(day.date)) {
        errors.push(`일자 중복: ${day.date}`);
      }
      dateSeen.add(day.date);
    }

    // 세션 검사 — 빈 제목·시간 역전·동일 일자·동일 트랙 시간 충돌
    // (포스터·휴식·식사·네트워킹 카테고리는 동시 진행이 정상이므로 충돌 검사 제외)
    const PARALLEL_OK_CATEGORIES = new Set([
      "poster",
      "break",
      "networking",
      "media",
    ]);
    for (const day of d.days) {
      const sessionsByTime: {
        id: string;
        title: string;
        start: string;
        end: string;
        track: string;
        category: string;
      }[] = [];
      for (const s of day.sessions) {
        if (!s.title?.trim()) {
          errors.push(`${day.date} — 빈 세션 제목이 있습니다.`);
        }
        if (!s.startTime || !s.endTime) {
          errors.push(`${day.date} "${s.title || "(제목 없음)"}" — 시간이 비어있습니다.`);
          continue;
        }
        if (s.endTime <= s.startTime) {
          errors.push(`${day.date} "${s.title}" — 종료 시각이 시작 시각보다 같거나 빠릅니다 (${s.startTime}~${s.endTime}).`);
        }
        sessionsByTime.push({
          id: s.id,
          title: s.title,
          start: s.startTime,
          end: s.endTime,
          track: (s.track ?? "").trim(),
          category: s.category ?? "other",
        });
      }
      // 시간 충돌 — 동일 트랙끼리만 검사. 트랙이 다르거나 한쪽이 parallel-ok 카테고리면 무시.
      for (let i = 0; i < sessionsByTime.length; i++) {
        for (let j = i + 1; j < sessionsByTime.length; j++) {
          const a = sessionsByTime[i];
          const b = sessionsByTime[j];
          if (!(a.start < b.end && b.start < a.end)) continue;
          // 동시 진행 OK 카테고리 (포스터·휴식 등) 는 충돌 무시
          if (
            PARALLEL_OK_CATEGORIES.has(a.category) ||
            PARALLEL_OK_CATEGORIES.has(b.category)
          )
            continue;
          // 트랙이 다르면 병렬 진행으로 간주 (정상)
          if (a.track && b.track && a.track !== b.track) continue;
          // 트랙 정보가 없으면 동일 공간으로 간주 → 충돌
          errors.push(
            `${day.date} 시간 충돌: "${a.title}" (${a.start}~${a.end}) ↔ "${b.title}" (${b.start}~${b.end})${a.track ? ` [${a.track}]` : ""}`,
          );
        }
      }
    }
    return errors;
  }

  async function handleSave(opts?: { silent?: boolean }) {
    const errs = validateProgramDraft(draft);
    if (errs.length > 0) {
      setError(errs.join("\n"));
      if (!opts?.silent) {
        toast.error(`저장 전 ${errs.length}건 확인이 필요합니다 (상단 알림 참조)`);
      }
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        activityId,
        title: draft.title,
        notes: draft.notes,
        uploadedSourceUrl: draft.uploadedSourceUrl,
        uploadedSourceType: draft.uploadedSourceType,
        uploadedSourceName: draft.uploadedSourceName,
        days: draft.days,
        createdBy: program?.createdBy ?? currentUserId,
      };
      if (program) {
        const updated = await conferenceProgramsApi.update(program.id, payload);
        setProgram(updated);
      } else {
        const created = await conferenceProgramsApi.create(payload);
        setProgram(created);
      }
      setSavedAt(new Date());
      setIsDirty(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Phase 0 P0: draft 변경 추적 — 초기 로드 직후 첫 변화부터 dirty 처리
  const initialDraftRef = useRef<string>("");
  useEffect(() => {
    if (loading) return;
    const current = JSON.stringify(draft);
    if (!initialDraftRef.current) {
      initialDraftRef.current = current;
      return;
    }
    if (current !== initialDraftRef.current) {
      setIsDirty(true);
    }
  }, [draft, loading]);

  // Phase 0 P0: 자동저장 (debounced, 30s) — 기존 program 이 있을 때만 (신규는 명시적 첫 저장 후 활성)
  useEffect(() => {
    if (!program) return; // 신규 program 은 사용자가 명시적으로 첫 저장
    const id = setTimeout(() => {
      // silent — 사용자에게 toast 띄우지 않고 조용히 저장 시도
      void handleSave({ silent: true });
    }, 30_000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, program?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        프로그램 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">프로그램 메타</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="프로그램 제목">
              <Input
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="예: 한국교육공학회 2025 춘계학술대회"
              />
            </Field>
            <Field label="원본 자료 (이미지/PDF)">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileUp className="mr-1 h-3.5 w-3.5" />
                  )}
                  파일 업로드
                </Button>
                {draft.uploadedSourceUrl && (
                  <a
                    href={draft.uploadedSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs text-primary hover:underline"
                  >
                    {draft.uploadedSourceName ?? "원본 자료 보기"}
                  </a>
                )}
              </div>
            </Field>
            <Field label="AI 자동 추출 (이미지/PDF 업로드 시 세션 자동 인식)">
              <div className="flex items-center gap-2">
                <input
                  ref={aiFileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleAiExtract(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={extracting}
                  className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                >
                  {extracting ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                  )}
                  AI로 자동 추출
                </Button>
                <Input
                  value={extractHint}
                  onChange={(e) => setExtractHint(e.target.value)}
                  placeholder="추가 힌트 (예: 2026-05-09 1일차)"
                  className="h-8 flex-1 text-xs"
                />
              </div>
            </Field>
          </div>
          <Field label="안내 메모 (장소 약도, 식사, 셔틀 등)">
            <Textarea
              rows={2}
              value={draft.notes}
              onChange={(e) =>
                setDraft((d) => ({ ...d, notes: e.target.value }))
              }
              placeholder="예: 점심은 본관 1층 식당에서, 셔틀은 정문 09:00 출발"
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          전체 {draft.days.length}일 · {totalSessions}개 세션
        </div>
        <div className="flex items-center gap-2">
          {/* Phase 0 P0: dirty / 저장 중 / 저장됨 상태 표시 */}
          {saving ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Loader2 className="h-3 w-3 animate-spin" /> 저장 중…
            </span>
          ) : isDirty ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              ● 저장 안 됨
            </span>
          ) : savedAt ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              ✓ 저장됨 · {savedAt.toLocaleTimeString("ko-KR")}
            </span>
          ) : null}
          <Button size="sm" variant="outline" onClick={addDay}>
            <CalendarPlus className="mr-1 h-3.5 w-3.5" />
            일자 추가
          </Button>
          <input
            ref={csvFileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleCsvUpload(f);
                e.target.value = "";
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => csvFileInputRef.current?.click()}
            title="CSV 파일에서 세션 일괄 가져오기 (헤더: date,startTime,endTime,track,category,title,speakers,affiliation,location,abstract)"
          >
            CSV 업로드
          </Button>
          <Button size="sm" onClick={() => handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            저장
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {draft.days.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
            <p className="text-sm">아직 등록된 일자가 없습니다.</p>
            <Button size="sm" onClick={addDay}>
              <Plus className="mr-1 h-4 w-4" />
              첫 일자 추가
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {draft.days.map((day, dayIdx) => (
          <Card key={dayIdx}>
            {/* Phase 1 — 일자 헤더 sticky: 긴 세션 목록에서도 컨텍스트 보존 */}
            <CardHeader className="sticky top-0 z-10 rounded-t-xl bg-card/95 pb-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="date"
                  value={day.date}
                  onChange={(e) => patchDay(dayIdx, { date: e.target.value })}
                  className="h-9 w-40"
                />
                <Input
                  value={day.dayLabel ?? ""}
                  onChange={(e) =>
                    patchDay(dayIdx, { dayLabel: e.target.value })
                  }
                  placeholder={`${dayIdx + 1}일차`}
                  className="h-9 w-32"
                />
                <Badge variant="secondary" className="text-xs">
                  세션 {day.sessions.length}개
                </Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addSession(dayIdx)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    세션 추가
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeDay(dayIdx)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    title="일자 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {day.sessions.map((s, sIdx) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onChange={(patch) => patchSession(dayIdx, sIdx, patch)}
                  onMoveUp={() => moveSession(dayIdx, sIdx, -1)}
                  onMoveDown={() => moveSession(dayIdx, sIdx, 1)}
                  onRemove={() => removeSession(dayIdx, sIdx)}
                  isFirst={sIdx === 0}
                  isLast={sIdx === day.sessions.length - 1}
                />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog
        open={!!extractPreview}
        onOpenChange={(open) => {
          if (!open) setExtractPreview(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI 추출 결과 미리보기
            </DialogTitle>
          </DialogHeader>
          {extractPreview && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-purple-50 px-3 py-2 text-xs text-purple-900">
                총 {extractPreview.days.length}일 ·{" "}
                {extractPreview.days.reduce((n, d) => n + d.sessions.length, 0)}개 세션이 추출되었습니다.
                결과를 검토한 뒤 <b>병합</b>(기존 일자에 추가) 또는 <b>교체</b>(전체 덮어쓰기)를 선택하세요.
              </div>
              {extractPreview.days.map((day, di) => (
                <div key={di} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{day.date}</span>
                      {day.dayLabel && (
                        <Badge variant="secondary" className="text-[10px]">
                          {day.dayLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {day.sessions.length}개 세션
                    </span>
                  </div>
                  <ul className="divide-y">
                    {day.sessions.map((s, si) => (
                      <li key={si} className="px-3 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {s.startTime}~{s.endTime}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${CONFERENCE_SESSION_CATEGORY_COLORS[s.category]}`}
                          >
                            {CONFERENCE_SESSION_CATEGORY_LABELS[s.category]}
                          </Badge>
                          {s.track && (
                            <Badge variant="secondary" className="text-[10px]">
                              {s.track}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 font-medium">{s.title}</div>
                        {(s.speakers?.length || s.affiliation) && (
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {(s.speakers ?? []).join(", ")}
                            {s.affiliation ? ` · ${s.affiliation}` : ""}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setExtractPreview(null)}>
              취소
            </Button>
            <Button variant="outline" onClick={applyExtractReplace}>
              교체 (덮어쓰기)
            </Button>
            <Button onClick={applyExtractMerge}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              초안에 병합
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionRow({
  session,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
}: {
  session: ConferenceSession;
  onChange: (patch: Partial<ConferenceSession>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  // Phase 1: 세션 카드 접기/펼치기 — 기본값 false (간결 표시), 토글로 상세 편집
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="time"
          value={session.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
          className="h-8 w-28"
        />
        <span className="text-xs text-muted-foreground">~</span>
        <Input
          type="time"
          value={session.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
          className="h-8 w-28"
        />
        <select
          value={session.category}
          onChange={(e) =>
            onChange({ category: e.target.value as ConferenceSessionCategory })
          }
          className={`h-8 rounded-md border border-input bg-background px-2 text-xs ${CONFERENCE_SESSION_CATEGORY_COLORS[session.category]}`}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CONFERENCE_SESSION_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <Input
          value={session.track ?? ""}
          onChange={(e) => onChange({ track: e.target.value })}
          placeholder="트랙 / 룸"
          className="h-8 w-32"
        />
        {/* Phase 1: 접힘 상태에서 제목 미리보기 (편집은 펼쳐야 가능) */}
        {!expanded && (
          <span className="ml-2 max-w-[200px] truncate text-xs text-muted-foreground sm:max-w-[300px]">
            {session.title?.trim() || "(제목 없음)"}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "접기" : "펼쳐서 편집"}
            className="h-7 w-7 p-0"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveUp}
            disabled={isFirst}
            title="위로"
            className="h-7 w-7 p-0"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onMoveDown}
            disabled={isLast}
            title="아래로"
            className="h-7 w-7 p-0"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            title="삭제"
            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <>
          <div className="mt-2">
            <Input
              value={session.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="세션 제목"
            />
          </div>
          {/* Phase 1 — 발표자 Chip 입력 (Enter 로 추가, X 로 제거) */}
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">발표자</p>
            <KeywordMultiSelect
              value={session.speakers ?? []}
              onChange={(speakers) => onChange({ speakers })}
              suggestions={[]}
              placeholder="발표자 이름 (Enter)"
            />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input
              value={session.affiliation ?? ""}
              onChange={(e) => onChange({ affiliation: e.target.value })}
              placeholder="소속 (예: 연세대 교육공학과)"
            />
            <Input
              value={session.location ?? ""}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="장소 (예: 본관 201호)"
            />
          </div>
          <Textarea
            value={session.abstract ?? ""}
            onChange={(e) => onChange({ abstract: e.target.value })}
            placeholder="초록 / 발표 요약 (선택)"
            rows={2}
            className="mt-2"
          />
          <Textarea
            value={(session.materialUrls ?? []).join("\n")}
            onChange={(e) =>
              onChange({
                materialUrls: e.target.value
                  .split(/\n+/)
                  .map((u) => u.trim())
                  .filter((u) => /^https?:\/\//i.test(u)),
              })
            }
            placeholder={"사전 자료 링크 (한 줄당 하나)\n예: https://drive.google.com/file/...\nhttps://arxiv.org/abs/..."}
            rows={2}
            className="mt-2 font-mono text-xs"
          />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
