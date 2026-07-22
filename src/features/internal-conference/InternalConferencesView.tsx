"use client";

/**
 * 대내 학술대회 목록 뷰 — 운영진 CRUD 포함.
 *
 * - 비로그인·일반 회원: 목록 렌더만.
 * - admin 이상 로그인: "행사 추가" 버튼 + 카드별 수정/삭제 버튼 노출.
 *   (site_settings write 규칙이 ['president','admin','sysadmin'] 이므로 UI도 동일 범위로 맞춤.
 *    staff 포함을 원하면 firestore.rules site_settings write 에 'staff' 추가 후
 *    이 파일의 isAdmin 조건을 isStaffOrAbove 로 교체.)
 * - slug=hackathon-2026-08-22 는 삭제 불가, slug·contextId·hubHref 불변.
 */

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Trophy,
  ArrowRight,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { formatDday } from "@/lib/dday";
import { toast } from "sonner";
import {
  INTERNAL_CONFERENCES,
  getConferenceStatus,
  type InternalConference,
  type InternalConferenceStatus,
  type InternalConferenceKind,
} from "@/features/internal-conference/conferences";
import {
  useInternalConferences,
  useSaveInternalConferences,
} from "@/features/site-settings/useInternalConferences";

// ── Constants ──────────────────────────────────────────────────────────────

const HACKATHON_PROTECTED_SLUG = "hackathon-2026-08-22";

const STATUS_LABELS: Record<InternalConferenceStatus, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
};

const STATUS_COLORS: Record<InternalConferenceStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-accent/10 text-accent",
  completed: "bg-muted text-muted-foreground",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(title: string, date: string): string {
  const base = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return `${base}-${date}`;
}

function defaultFeatures(kind: InternalConferenceKind): InternalConference["features"] {
  if (kind === "hackathon") {
    return { ideaBoard: true, teams: true, submissions: true, judging: true, awards: true };
  }
  return { ideaBoard: false, teams: false, submissions: true, judging: false, awards: false };
}

// ── Form types ─────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  tagline: string;
  description: string;
  kind: InternalConferenceKind;
  date: string;
  dayLabel: string;
  timeLabel: string;
  place: string;
  awardsAnnounceDate: string;
  status: InternalConferenceStatus | "";
  externalLink: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  tagline: "",
  description: "",
  kind: "hackathon",
  date: "",
  dayLabel: "",
  timeLabel: "",
  place: "",
  awardsAnnounceDate: "",
  status: "",
  externalLink: "",
};

function conferenceToForm(c: InternalConference): FormState {
  return {
    title: c.title,
    tagline: c.tagline,
    description: c.description,
    kind: c.kind,
    date: c.date,
    dayLabel: c.dayLabel ?? "",
    timeLabel: c.timeLabel ?? "",
    place: c.place ?? "",
    awardsAnnounceDate: c.awardsAnnounceDate ?? "",
    status: c.status ?? "",
    externalLink: c.externalLink ?? "",
  };
}

// ── Conference Form Dialog ─────────────────────────────────────────────────

interface ConferenceDialogProps {
  open: boolean;
  onClose: () => void;
  existing: InternalConference | null;
  onSave: (c: InternalConference) => Promise<void>;
  saving: boolean;
}

function ConferenceDialog({
  open,
  onClose,
  existing,
  onSave,
  saving,
}: ConferenceDialogProps) {
  const isNew = !existing;
  const isProtected = existing?.slug === HACKATHON_PROTECTED_SLUG;

  // key 변경으로 다이얼로그 재마운트 → 상태 초기화(상위에서 key 주입)
  const [form, setForm] = useState<FormState>(() =>
    existing ? conferenceToForm(existing) : EMPTY_FORM,
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("제목은 필수입니다.");
      return;
    }
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      toast.error("날짜를 YYYY-MM-DD 형식으로 입력해주세요.");
      return;
    }

    const slug = isNew
      ? slugify(form.title.trim(), form.date.trim())
      : existing.slug;

    const contextId = isNew
      ? `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      : existing.contextId;

    const conf: InternalConference = {
      slug,
      contextId,
      kind: isProtected ? existing.kind : form.kind,
      title: form.title.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      date: form.date.trim(),
      ...(form.dayLabel.trim() ? { dayLabel: form.dayLabel.trim() } : {}),
      ...(form.timeLabel.trim() ? { timeLabel: form.timeLabel.trim() } : {}),
      ...(form.place.trim() ? { place: form.place.trim() } : {}),
      ...(form.awardsAnnounceDate.trim() ? { awardsAnnounceDate: form.awardsAnnounceDate.trim() } : {}),
      features: isNew ? defaultFeatures(form.kind) : existing.features,
      hubHref: isNew ? "" : existing.hubHref,
      ...(form.status ? { status: form.status } : {}),
      ...(form.externalLink.trim() ? { externalLink: form.externalLink.trim() } : {}),
    };

    await onSave(conf);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isNew ? "행사 추가" : isProtected ? "행사 수정 (slug · contextId 불변)" : "행사 수정"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {/* 제목 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-title">제목 *</Label>
            <Input
              id="ic-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="예: 에듀테크 해커톤 2026"
            />
          </div>

          {/* 태그라인 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-tagline">태그라인</Label>
            <Input
              id="ic-tagline"
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="예: 교육 혁신 아이디어 경연"
            />
          </div>

          {/* 유형 — 신규 전용 */}
          {isNew && (
            <div className="space-y-1.5">
              <label htmlFor="ic-kind" className="text-sm font-medium leading-none">
                유형
              </label>
              <select
                id="ic-kind"
                value={form.kind}
                onChange={(e) => set("kind", e.target.value as InternalConferenceKind)}
                className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <option value="hackathon">해커톤</option>
                <option value="symposium">심포지엄</option>
              </select>
            </div>
          )}

          {/* 날짜 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-date">날짜 * (YYYY-MM-DD)</Label>
            <Input
              id="ic-date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              placeholder="2026-08-22"
            />
          </div>

          {/* 요일 · 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ic-day">요일</Label>
              <Input
                id="ic-day"
                value={form.dayLabel}
                onChange={(e) => set("dayLabel", e.target.value)}
                placeholder="토"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ic-time">시간</Label>
              <Input
                id="ic-time"
                value={form.timeLabel}
                onChange={(e) => set("timeLabel", e.target.value)}
                placeholder="10:00–18:00"
              />
            </div>
          </div>

          {/* 장소 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-place">장소</Label>
            <Input
              id="ic-place"
              value={form.place}
              onChange={(e) => set("place", e.target.value)}
              placeholder="연세대학교 ○○관"
            />
          </div>

          {/* 설명 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-desc">설명</Label>
            <Textarea
              id="ic-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="행사 소개 문구..."
            />
          </div>

          {/* 상태 */}
          <div className="space-y-1.5">
            <label htmlFor="ic-status" className="text-sm font-medium leading-none">
              진행 상태 (미지정 시 날짜로 자동 계산)
            </label>
            <select
              id="ic-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as InternalConferenceStatus | "")}
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="">자동 (날짜 기준)</option>
              <option value="upcoming">예정</option>
              <option value="ongoing">진행 중</option>
              <option value="completed">완료</option>
            </select>
          </div>

          {/* 수상 발표일 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-awards">수상 발표 예정일 (YYYY-MM-DD)</Label>
            <Input
              id="ic-awards"
              value={form.awardsAnnounceDate}
              onChange={(e) => set("awardsAnnounceDate", e.target.value)}
              placeholder="2026-09-05"
            />
          </div>

          {/* 외부 링크 */}
          <div className="space-y-1.5">
            <Label htmlFor="ic-ext">외부 링크 (전용 허브 없는 신규 행사 CTA 용)</Label>
            <Input
              id="ic-ext"
              value={form.externalLink}
              onChange={(e) => set("externalLink", e.target.value)}
              placeholder="https://..."
            />
          </div>

          {/* slug 표시 — 수정 불가 */}
          {!isNew && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">slug (불변)</Label>
              <Input
                value={existing.slug}
                readOnly
                className="cursor-default bg-muted text-muted-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {isNew ? "추가" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Conference Card ────────────────────────────────────────────────────────

interface ConferenceCardProps {
  conference: InternalConference;
  isStaff: boolean;
  onEdit: (c: InternalConference) => void;
  onDelete: (c: InternalConference) => void;
}

function ConferenceCard({ conference, isStaff, onEdit, onDelete }: ConferenceCardProps) {
  const status = getConferenceStatus(conference);
  const dday = status === "completed" ? null : formatDday(conference.date);
  const hasHub = !!conference.hubHref;
  const hasExternal = !!conference.externalLink;
  const isProtected = conference.slug === HACKATHON_PROTECTED_SLUG;

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          <Trophy size={12} />
          {conference.tagline}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            STATUS_COLORS[status],
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-bold leading-snug">{conference.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {conference.description}
      </p>

      <div className="mt-4 flex flex-col gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} className="shrink-0 text-primary" />
          {conference.date}
          {conference.dayLabel ? ` (${conference.dayLabel})` : ""}
          {dday && (
            <span className="ml-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
              {dday.label}
            </span>
          )}
        </span>
        {conference.timeLabel && (
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="shrink-0 text-primary" />
            {conference.timeLabel}
          </span>
        )}
        {conference.place && (
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="shrink-0 text-primary" />
            {conference.place}
          </span>
        )}
      </div>

      {/* 운영진에게 해커톤 상세 설정 링크 안내 */}
      {isStaff && conference.kind === "hackathon" && (
        <div
          className="mt-3 text-[11px] text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          상세 설정:{" "}
          <Link
            href="/console/hackathon"
            className="underline underline-offset-2 hover:text-primary"
          >
            콘솔 › 해커톤 운영 › 행사 설정
          </Link>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        {/* CTA 힌트 */}
        {(hasHub || hasExternal) ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            {!hasHub && hasExternal ? (
              <><ExternalLink size={12} /> 자세히 보기</>
            ) : (
              <><ArrowRight size={12} /> 행사 허브 보기</>
            )}
          </span>
        ) : (
          <span />
        )}

        {/* 운영진 컨트롤 — 클릭이 카드 링크로 전파되지 않도록 stopPropagation */}
        {isStaff && (
          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onEdit(conference)}
              aria-label="수정"
            >
              <Pencil size={13} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(conference)}
              disabled={isProtected}
              title={isProtected ? "해커톤은 삭제할 수 없습니다" : "삭제"}
              aria-label={isProtected ? "해커톤은 삭제할 수 없습니다" : "삭제"}
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      </div>
    </>
  );

  const cardClass =
    "group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2";

  if (hasHub) {
    return (
      <Link href={conference.hubHref} className={cardClass}>
        {inner}
      </Link>
    );
  }
  if (hasExternal) {
    return (
      <a
        href={conference.externalLink}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

// ── Main View ──────────────────────────────────────────────────────────────

export default function InternalConferencesView() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "admin");

  const { conferences, recordId, isLoading } = useInternalConferences();
  const { mutateAsync: save, isPending: saving } = useSaveInternalConferences();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InternalConference | null>(null);
  /** key 변경으로 ConferenceDialog 재마운트 → form 상태 초기화 */
  const [dialogKey, setDialogKey] = useState(0);

  function openNew() {
    setEditing(null);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  function openEdit(c: InternalConference) {
    setEditing(c);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }

  async function handleSave(updated: InternalConference) {
    // recordId=null(최초 편집)이면 conferences 는 이미 레지스트리 폴백 — 시드 효과 내재
    let next: InternalConference[];
    if (editing) {
      next = conferences.map((c) => (c.slug === editing.slug ? updated : c));
    } else {
      next = [...conferences, updated];
    }

    try {
      await save({ recordId, conferences: next });
      toast.success(editing ? "행사를 수정했습니다." : "행사를 추가했습니다.");
      setDialogOpen(false);
    } catch (err) {
      console.error("[InternalConferencesView] save failed:", err);
      toast.error("저장에 실패했습니다. 권한을 확인해주세요.");
    }
  }

  async function handleDelete(c: InternalConference) {
    if (c.slug === HACKATHON_PROTECTED_SLUG) {
      toast.error("해커톤은 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`"${c.title}" 행사를 삭제하시겠습니까?`)) return;

    const next = conferences.filter((x) => x.slug !== c.slug);
    try {
      await save({ recordId, conferences: next });
      toast.success("행사를 삭제했습니다.");
    } catch (err) {
      console.error("[InternalConferencesView] delete failed:", err);
      toast.error("삭제에 실패했습니다. 권한을 확인해주세요.");
    }
  }

  // 예정·진행 우선(가까운 날짜순) → 완료(최근순)
  const sorted = [...conferences].sort((a, b) => {
    const aDone = getConferenceStatus(a) === "completed";
    const bDone = getConferenceStatus(b) === "completed";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return aDone
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });

  return (
    <>
      {/* 운영진 툴바 */}
      {isStaff && (
        <div className="mb-6 mt-8 flex justify-end">
          <Button size="sm" onClick={openNew}>
            <Plus size={14} className="mr-1.5" />
            행사 추가
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="예정된 대내 학술대회가 없어요"
          description="새로운 미니 학술대회가 준비되면 이곳에 표시됩니다. 다른 학술활동을 둘러보세요."
          className="mt-6"
          actions={[
            { label: "대외 학술대회 보기", href: "/activities/external", variant: "default" },
            { label: "세미나 둘러보기", href: "/seminars", variant: "outline" },
          ]}
        />
      ) : (
        <div className={cn("grid gap-5 sm:grid-cols-2", isStaff ? "" : "mt-8")}>
          {sorted.map((c) => (
            <ConferenceCard
              key={c.slug}
              conference={c}
              isStaff={isStaff}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 추가/수정 다이얼로그 */}
      {dialogOpen && (
        <ConferenceDialog
          key={dialogKey}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          existing={editing}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </>
  );
}
