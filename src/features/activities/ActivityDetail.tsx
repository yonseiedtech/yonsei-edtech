"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activitiesApi, activityApplicantsApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, Users, User, UserPlus, Check, X,
  Pencil, Globe, Loader2, CheckCircle, CheckCircle2, Circle, Clock, XCircle,
  Plus, Trash2, ListChecks, Timer, UserCog,
  ChevronDown, ChevronUp, ChevronRight,
  Upload, Paperclip, FileText, Download, CalendarPlus,
  MessageSquare, MessageSquareQuote, HeartHandshake, BarChart3, Search, Presentation,
} from "lucide-react";
import InlineMeetingTimer from "./InlineMeetingTimer";
import ActivityConnectedTodos from "./ActivityConnectedTodos";
import StudySessionReflectionCard from "./StudySessionReflectionCard";
import StudySessionAssignmentsCard from "./StudySessionAssignmentsCard";
import StudySessionPreClassCard from "./StudySessionPreClassCard";
import StudySessionNotesCard from "./StudySessionNotesCard";
import StudyMaterialArchive from "./StudyMaterialArchive";
import StudyParticipationReport from "./StudyParticipationReport";
import MyActivitySessionsTab from "@/features/conference/MyActivitySessionsTab";
import AttendeeReviewsSection from "@/features/conference/AttendeeReviewsSection";
import ActivityInfoEditor from "./ActivityInfoEditor";
import { todayYmdLocal } from "@/lib/dday";
import type { Activity, ActivityType, ActivityProgress, ActivityProgressMode, FormField, EnrollmentStatus, ExternalParticipantType, SpeakerSubmissionType, StudySessionReflection, StudyAssignment, ApplicantEntry } from "@/types";
import { ENROLLMENT_STATUS_LABELS, ACTIVITY_PROGRESS_MODE_LABELS, EXTERNAL_PARTICIPANT_TYPE_LABELS, EXTERNAL_PARTICIPANT_TYPE_COLORS, SPEAKER_SUBMISSION_TYPE_LABELS, SPEAKER_SUBMISSION_TYPE_COLORS } from "@/types";

/** 신청 시점 표시 — yyyy.mm.dd. hh:mm:ss (24h, 한국 시간) */
function formatAppliedAt(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
import {
  activityProgressApi,
  attendeeReviewsApi,
  progressMeetingsApi,
  userSessionPlansApi,
  studySessionReflectionsApi,
  studyAssignmentsApi,
} from "@/lib/bkend";
import { uploadToStorage } from "@/lib/storage";
import type { UploadedFile } from "@/lib/storage";
import { formatSemester } from "@/lib/semester";
import { computeRecruitmentStatus, formatRecruitmentPeriod } from "@/lib/recruitment-status";
import FormBuilder from "./FormBuilder";
import FormBuilderByType from "./FormBuilderByType";
import FormRenderer from "./FormRenderer";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import { useAllMembers } from "@/features/member/useMembers";

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = { upcoming: "bg-blue-50 text-blue-700", ongoing: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };
const RECRUIT_LABELS: Record<string, string> = { recruiting: "모집중", closed: "모집마감", in_progress: "진행중", completed: "완료" };
const RECRUIT_LABELS_STUDY: Record<string, string> = { recruiting: "모집중", closed: "모집완료" };
const RECRUIT_COLORS: Record<string, string> = { recruiting: "bg-green-50 text-green-700", closed: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };

type Tab = "overview" | "progress" | "staff" | "presenters" | "volunteers" | "participants" | "applicants" | "form-settings" | "report" | "settings" | "my-sessions" | "archive" | "study-report";

/**
 * 비회원 신청현황 조회(application-lookup) 응답 — 서버가 비-PII 화이트리스트로 투영.
 * answers·email·phone·studentId·guestKey·userId 는 포함되지 않는다.
 */
interface PublicLookupResult {
  name: string;
  status: ApplicantEntry["status"];
  participantType?: ApplicantEntry["participantType"];
  appliedAt: string;
  speakerSubmissionType?: ApplicantEntry["speakerSubmissionType"];
  speakerPaperTitle?: string;
}

/** 필수 폼 필드 미입력 여부 — schedule/datetime_slots 의 빈 JSON 배열([])도 미입력으로 간주 */
function isAnswerEmpty(field: FormField, v: unknown): boolean {
  if (field.type === "section_break") return false; // 답변 대상 아님
  if (v === undefined || v === null) return true;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return true;
    if (field.type === "schedule" || field.type === "datetime_slots") {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed) && parsed.length === 0) return true;
      } catch { /* __ALL__ 등 비-JSON 마커는 입력으로 인정 */ }
    }
    return false;
  }
  if (Array.isArray(v)) return v.length === 0; // checkbox / file / image
  return false;
}

interface Props {
  activityId: string;
  type: ActivityType;
  backHref: string;
  backLabel: string;
}

export default function ActivityDetail({ activityId, type, backHref, backLabel }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyName, setApplyName] = useState("");
  const [applyStudentId, setApplyStudentId] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyAnswers, setApplyAnswers] = useState<Record<string, string | string[] | UploadedFile[]>>({});
  const [applyParticipantType, setApplyParticipantType] = useState<ExternalParticipantType>("attendee");
  const [applySpeakerSubmissionType, setApplySpeakerSubmissionType] = useState<SpeakerSubmissionType>("paper");
  const [applySpeakerPaperTitle, setApplySpeakerPaperTitle] = useState("");
  // 신청 정보 수정 모드 — null 이면 신규 신청, 값이 있으면 해당 applicant 수정
  const [editingApplicantKey, setEditingApplicantKey] = useState<string | null>(null);
  // 신청현황 조회 — 비회원 포함, 이름+학번으로 본인 신청 내역 확인
  const [lookupDialog, setLookupDialog] = useState(false);
  const [lookupName, setLookupName] = useState("");
  const [lookupStudentId, setLookupStudentId] = useState("");
  // 신청현황 조회 결과 — 서버가 비-PII 화이트리스트로 투영해 반환 (answers/email 등 미포함)
  const [lookupResult, setLookupResult] = useState<
    PublicLookupResult | "notfound" | "loading" | null
  >(null);
  const [applicantsTypeFilter, setApplicantsTypeFilter] = useState<"all" | ExternalParticipantType>("all");
  const [presentersTypeFilter, setPresentersTypeFilter] = useState<"all" | SpeakerSubmissionType>("all");
  const [signupCtaOpen, setSignupCtaOpen] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressDate, setProgressDate] = useState("");
  const [progressStartTime, setProgressStartTime] = useState("");
  const [progressEndTime, setProgressEndTime] = useState("");
  const [progressMode, setProgressMode] = useState<ActivityProgressMode>("in_person");
  const [roleDialog, setRoleDialog] = useState<{ pid: string; name: string } | null>(null);
  const [roleInput, setRoleInput] = useState("");
  const [noteDialog, setNoteDialog] = useState<{ pid: string; name: string } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [guestStaffName, setGuestStaffName] = useState("");
  const [guestParticipantName, setGuestParticipantName] = useState("");
  const [expandedTimers, setExpandedTimers] = useState<Set<string>>(new Set());
  const [uploadingPid, setUploadingPid] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  // 일괄 주차 생성
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkStart, setBulkStart] = useState("19:00");
  const [bulkEnd, setBulkEnd] = useState("21:00");
  const [bulkMode, setBulkMode] = useState<ActivityProgressMode>("in_person");
  const [bulking, setBulking] = useState(false);

  const toggleTimer = (pid: string) => {
    setExpandedTimers((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const res = await activitiesApi.get(activityId);
      return res;
    },
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ["activity-progress", activityId],
    queryFn: async () => {
      const res = await activityProgressApi.list(activityId);
      const list = res.data as ActivityProgress[];
      // 진행된 날짜(date) 오름차순 정렬, 날짜 동일 시 시작시간/week 보조 정렬
      return [...list].sort((a, b) => {
        const aDate = a.date ?? "";
        const bDate = b.date ?? "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        const aStart = a.startTime ?? "";
        const bStart = b.startTime ?? "";
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        return (a.week ?? 0) - (b.week ?? 0);
      });
    },
  });

  // UX polish: 회차 row 배지 — 활동 단위 1쿼리로 reflections / assignments 집계 (study/project 만)
  const showWeekBadges = (type === "study" || type === "project") && !!user;
  const { data: allReflections = [] } = useQuery({
    queryKey: ["activity-reflections-all", activityId],
    enabled: showWeekBadges,
    queryFn: async () => {
      const res = await studySessionReflectionsApi.listByActivity(activityId);
      return (res.data as StudySessionReflection[]) ?? [];
    },
  });
  const { data: allAssignments = [] } = useQuery({
    queryKey: ["activity-assignments-all", activityId],
    enabled: showWeekBadges,
    queryFn: async () => {
      const res = await studyAssignmentsApi.listByActivity(activityId);
      return ((res.data as StudyAssignment[]) ?? []).filter((a) => a.active !== false);
    },
  });
  const weekBadgeMap = useMemo(() => {
    const m = new Map<string, { reflectionCount: number; assignmentCount: number }>();
    (allReflections as StudySessionReflection[]).forEach((r) => {
      if (!r.activityProgressId) return;
      const prev = m.get(r.activityProgressId) ?? { reflectionCount: 0, assignmentCount: 0 };
      m.set(r.activityProgressId, { ...prev, reflectionCount: prev.reflectionCount + 1 });
    });
    (allAssignments as StudyAssignment[]).forEach((a) => {
      if (!a.activityProgressId) return;
      const prev = m.get(a.activityProgressId) ?? { reflectionCount: 0, assignmentCount: 0 };
      m.set(a.activityProgressId, { ...prev, assignmentCount: prev.assignmentCount + 1 });
    });
    return m;
  }, [allReflections, allAssignments]);

  // Sprint 67-AC: 내 일정 탭 count — 본인 plans 의 활동별 개수 (skipped 제외)
  const { data: mySessionsCount = 0 } = useQuery({
    queryKey: ["activity-my-sessions-count", activityId, user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const res = await userSessionPlansApi.listByUser(user.id);
      const plans = res?.data ?? [];
      return plans.filter(
        (p) => p.activityId === activityId && p.status !== "skipped",
      ).length;
    },
    enabled: !!user?.id && !!activityId,
  });

  // Sprint 67-AD: 활동 리포트 — 후기 통계 (운영진만)
  const { data: attendeeReviews = [] } = useQuery({
    queryKey: ["activity-attendee-reviews", activityId],
    queryFn: async () => {
      const res = await attendeeReviewsApi.listByActivity(activityId);
      return res?.data ?? [];
    },
    enabled: !!activityId && type === "external",
  });

  const rawParticipants = (activity?.participants as string[] | undefined) ?? [];
  const leaderId = (activity?.leaderId as string | undefined) ?? undefined;

  // data-split: 신청자 PII 는 activity_applicants 비공개 컬렉션에서 조회.
  // staff 는 전체 목록을, 비-staff 회원은 본인 신청 1건만 조회한다.
  const { data: staffApplicants = [] } = useQuery({
    queryKey: ["activity-applicants", activityId],
    enabled: isStaff && !!activityId,
    queryFn: () => activityApplicantsApi.get(activityId),
  });
  const { data: myApplication = null } = useQuery({
    queryKey: ["my-application", activityId],
    enabled: !isStaff && !!user && !!activityId,
    queryFn: async (): Promise<ApplicantEntry | null> => {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return null;
      const res = await fetch(`/api/activities/${activityId}/my-application`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { application: ApplicantEntry | null };
      return json.application;
    },
  });
  // staff 는 전체 applicants, 비-staff 는 본인 항목만(목록 길이는 신뢰하지 않음)
  const applicants: ApplicantEntry[] = isStaff
    ? staffApplicants
    : myApplication
      ? [myApplication]
      : [];
  // Sprint 67-K/V: 학번 연동된 applicant(isGuest=false, userId 보유)를 참여자에도 자동 합산.
  // applicant-link-by-studentid 도구가 participants 에 push 하지만, 도구 fix 이전 데이터는 누락 가능 → 표시 시 보강.
  const linkedFromApplicants = (applicants as Array<{ userId?: string; isGuest?: boolean }>)
    .map((a) => (a && a.isGuest === false && a.userId ? a.userId : undefined))
    .filter((v): v is string => !!v);
  const merged = Array.from(new Set([...rawParticipants, ...linkedFromApplicants]));
  const participants =
    leaderId && !merged.includes(leaderId) ? [leaderId, ...merged] : merged;
  const participantRoles = (activity?.participantRoles as Record<string, string> | undefined) ?? {};
  const participantNotes = (activity?.participantNotes as Record<string, string> | undefined) ?? {};
  const guestParticipants = (activity?.guestParticipants as { id: string; name: string; addedAt: string; addedBy: string }[] | undefined) ?? [];
  const guestMap = new Map(guestParticipants.map((g) => [g.id, g]));
  const isGuestPid = (pid: string) => pid.startsWith("guest_");
  const registrationMethod = (activity?.registrationMethod as "open" | "manual" | undefined) ?? "manual";
  const isLeader = !!user && !!leaderId && user.id === leaderId;
  const canManageParticipants = isLeader || isStaff;
  const { members: allMembers } = useAllMembers();
  const memberMap = new Map(allMembers.map((m) => [m.id, m]));
  /** 회원/비회원 통합 이름 조회 */
  const displayName = (pid: string): string =>
    memberMap.get(pid)?.name ?? guestMap.get(pid)?.name ?? "(이름 미확인)";
  const isJoined = user ? participants.includes(user.id) : false;
  // staff 는 전체 목록으로, 비-staff 는 본인 신청 1건(my-application)으로 판정
  const hasApplied = user
    ? isStaff
      ? applicants.some(
          (a) =>
            a.userId === user.id ||
            (a.isGuest && a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase()),
        )
      : !!myApplication
    : false;
  // 자동 모집 상태 계산 — recruitmentStartAt/End 또는 override 기반.
  // 미설정 시 기존 recruitmentStatus 값 그대로 사용 (하위호환).
  const recruitmentComputed = useMemo(
    () =>
      activity
        ? computeRecruitmentStatus(activity)
        : { status: "recruiting" as const, auto: false, notStarted: false, msUntilEnd: null },
    [activity],
  );
  const recruitmentStatus = recruitmentComputed.status;
  const recruitmentPeriodLabel = formatRecruitmentPeriod(
    activity?.recruitmentStartAt as string | undefined,
    activity?.recruitmentEndAt as string | undefined,
  );

  // 신청 다이얼로그가 열릴 때 비활성화된 참석 유형이 선택돼 있으면 첫 번째 활성 유형으로 보정
  useEffect(() => {
    if (!applyDialog || type !== "external") return;
    const configured = activity?.enabledParticipantTypes;
    if (!configured || configured.length === 0) return;
    if (!configured.includes(applyParticipantType)) {
      setApplyParticipantType(configured[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyDialog, activity?.enabledParticipantTypes]);

  // 참여 신청 (대외활동: 신청서 기반, 기타: 즉시 참여)
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!activity) return;
      if (type === "external") {
        const isSpeaker = applyParticipantType === "speaker";
        if (isSpeaker && !applySpeakerPaperTitle.trim()) {
          throw new Error("발표자 신청은 논문/작품 제목이 필요합니다.");
        }
        const missingRequired = combinedApplicationFields.filter(
          (f) => f.required && isAnswerEmpty(f, applyAnswers[f.id]),
        );
        if (missingRequired.length > 0) {
          throw new Error(
            `필수 항목을 입력해주세요 — ${missingRequired.map((f) => f.label).join(", ")}`,
          );
        }
        // 수정 모드 (운영진) — activity_applicants 트랜잭션으로 기존 항목 교체
        if (editingApplicantKey && isStaff) {
          await activityApplicantsApi.mutate(activityId, ({ applicants: cur, participants: curP }) => {
            const idx = cur.findIndex(
              (a) => (a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`) === editingApplicantKey,
            );
            if (idx < 0) throw new Error("수정할 신청을 찾을 수 없습니다.");
            const existing = cur[idx];
            const updatedEntry: ApplicantEntry = {
              ...existing,
              name: applyName.trim() || existing.name,
              studentId: applyStudentId,
              email: applyEmail.trim() || existing.email,
              phone: applyPhone,
              answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined,
              participantType: applyParticipantType,
              speakerSubmissionType: isSpeaker ? applySpeakerSubmissionType : undefined,
              speakerPaperTitle: isSpeaker ? applySpeakerPaperTitle.trim() : undefined,
            };
            return {
              applicants: cur.map((a, i) => (i === idx ? updatedEntry : a)),
              participants: curP,
            };
          });
          return;
        }
        // 신규 신청 + 회원 본인 수정 — apply 라우트 (Admin SDK, editKey 모드 포함)
        if (!user && (!applyName.trim() || !applyEmail.trim() || !applyStudentId.trim())) {
          throw new Error("비회원 신청은 이름·학번·이메일이 모두 필요합니다.");
        }
        const idToken = user ? await auth.currentUser?.getIdToken() : undefined;
        const res = await fetch(`/api/activities/${activityId}/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            name: applyName.trim() || user?.name,
            studentId: applyStudentId,
            email: applyEmail.trim() || user?.email,
            phone: applyPhone,
            answers: Object.keys(applyAnswers).length > 0 ? applyAnswers : undefined,
            participantType: applyParticipantType,
            speakerSubmissionType: isSpeaker ? applySpeakerSubmissionType : undefined,
            speakerPaperTitle: isSpeaker ? applySpeakerPaperTitle.trim() : undefined,
            editKey: editingApplicantKey ?? undefined,
          }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error || "신청에 실패했습니다.");
        }
      } else {
        // study/project "참여 신청" — 일반 회원이 도달하는 경로.
        // activity_applicants write 는 staff 전용(firestore.rules)이라 클라이언트
        // 트랜잭션(mutateRoster)은 PERMISSION_DENIED 로 실패한다 → apply 라우트로 우회.
        if (!user) return;
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) throw new Error("로그인이 필요합니다.");
        const res = await fetch(`/api/activities/${activityId}/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error || "신청에 실패했습니다.");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-applicants", activityId] });
      queryClient.invalidateQueries({ queryKey: ["my-application", activityId] });
      const wasEdit = !!editingApplicantKey;
      toast.success(
        wasEdit
          ? "신청 정보가 수정되었습니다."
          : type === "external"
            ? "참가 신청이 완료되었습니다."
            : "참여 신청이 완료되었습니다.",
      );
      setApplyDialog(false);
      setEditingApplicantKey(null);
      if (!wasEdit && !user && type === "external") setSignupCtaOpen(true);
    },
    onError: (e: Error) => { toast.error(e.message || "신청에 실패했습니다."); },
  });

  // 운영진 전용: 모집 상태를 '모집중'으로 즉시 전환 (신청 버튼 숨김 문제 해결용)
  const setRecruitingMutation = useMutation({
    mutationFn: async () => {
      await activitiesApi.update(activityId, {
        recruitmentStatus: "recruiting",
        recruitmentStatusOverride: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("모집 상태를 '모집중'으로 변경했습니다. 이제 참가 신청 버튼이 표시됩니다.");
    },
    onError: (e: Error) => { toast.error(e.message || "모집 상태 변경에 실패했습니다."); },
  });

  /** 기존 신청 항목을 신청 다이얼로그(수정 모드)로 연다 — 신청자 본인/운영진 공용 */
  function openEditApplication(a: ApplicantEntry) {
    setEditingApplicantKey(a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`);
    setApplyName(a.name ?? "");
    setApplyStudentId(a.studentId ?? "");
    setApplyEmail(a.email ?? "");
    setApplyPhone(a.phone ?? "");
    setApplyParticipantType((a.participantType as ExternalParticipantType) ?? "attendee");
    setApplySpeakerSubmissionType((a.speakerSubmissionType as SpeakerSubmissionType) ?? "paper");
    setApplySpeakerPaperTitle(a.speakerPaperTitle ?? "");
    setApplyAnswers(
      (a.answers as Record<string, string | string[] | UploadedFile[]>) ?? {},
    );
    setApplyDialog(true);
  }

  // PR7: 참여자 추가/제거 (운영진 또는 스터디 모임장)
  const addParticipantMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activity) return;
      if (participants.includes(memberId)) return;
      await activitiesApi.update(activityId, { participants: [...participants, memberId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("참여자가 추가되었습니다.");
    },
    onError: () => toast.error("추가에 실패했습니다."),
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activity) return;
      const updates: Record<string, unknown> = {
        participants: participants.filter((p) => p !== memberId),
      };
      if (isGuestPid(memberId)) {
        updates.guestParticipants = guestParticipants.filter((g) => g.id !== memberId);
      }
      // 역할/메모도 함께 정리 (남아있으면 staff 분류 잔류 유발)
      if (participantRoles[memberId]) {
        const nextRoles = { ...participantRoles };
        delete nextRoles[memberId];
        updates.participantRoles = nextRoles;
      }
      if (participantNotes[memberId]) {
        const nextNotes = { ...participantNotes };
        delete nextNotes[memberId];
        updates.participantNotes = nextNotes;
      }
      await activitiesApi.update(activityId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("참여자가 제외되었습니다.");
    },
    onError: (e: Error) => toast.error(e.message || "참여자 제외에 실패했습니다."),
  });

  // 운영진 직접 추가 — 회원을 참여자로 추가 + 기본 역할("운영진") 자동 부여 → 역할이 비어있어도 운영진 분류됨
  const addStaffMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!activity) return memberId;
      const updates: Record<string, unknown> = {};
      if (!participants.includes(memberId)) {
        updates.participants = [...participants, memberId];
      }
      if (!participantRoles[memberId]) {
        updates.participantRoles = { ...participantRoles, [memberId]: "운영진" };
      }
      if (Object.keys(updates).length > 0) {
        await activitiesApi.update(activityId, updates);
      }
      return memberId;
    },
    onSuccess: async (memberId) => {
      await queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      setRoleInput("운영진");
      setRoleDialog({ pid: memberId, name: displayName(memberId) });
      toast.success("운영진으로 추가되었습니다. 필요 시 세부 역할을 변경하세요.");
    },
    onError: () => toast.error("추가에 실패했습니다."),
  });

  // 비회원 게스트 추가 — 회원으로 검색되지 않는 사람을 이름만으로 추가 (참가자/운영진 공통)
  const addGuestParticipantMutation = useMutation({
    mutationFn: async ({ name, asStaff }: { name: string; asStaff: boolean }) => {
      if (!activity) return null;
      const trimmed = name.trim();
      if (!trimmed) throw new Error("이름을 입력해주세요.");
      const guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newGuest = {
        id: guestId,
        name: trimmed,
        addedAt: new Date().toISOString(),
        addedBy: user?.id ?? "unknown",
      };
      const updates: Record<string, unknown> = {
        participants: [...participants, guestId],
        guestParticipants: [...guestParticipants, newGuest],
      };
      if (asStaff && !participantRoles[guestId]) {
        updates.participantRoles = { ...participantRoles, [guestId]: "운영진" };
      }
      await activitiesApi.update(activityId, updates);
      return { guestId, name: trimmed, asStaff };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      if (!result) return;
      if (result.asStaff) {
        setGuestStaffName("");
        setRoleInput("운영진");
        setRoleDialog({ pid: result.guestId, name: result.name });
        toast.success(`비회원 운영진 "${result.name}"이(가) 추가되었습니다.`);
      } else {
        setGuestParticipantName("");
        toast.success(`비회원 참가자 "${result.name}"이(가) 추가되었습니다.`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "추가에 실패했습니다."),
  });

  // 참여자 역할 저장
  const updateRoleMutation = useMutation({
    mutationFn: async ({ pid, role }: { pid: string; role: string }) => {
      const updated = { ...participantRoles };
      if (role.trim()) updated[pid] = role.trim();
      else delete updated[pid];
      await activitiesApi.update(activityId, { participantRoles: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("역할이 저장되었습니다.");
      setRoleDialog(null);
    },
    onError: (e: Error) => toast.error(e.message || "역할 저장에 실패했습니다."),
  });

  // 참여자 메모 저장
  const updateNoteMutation = useMutation({
    mutationFn: async ({ pid, note }: { pid: string; note: string }) => {
      const updated = { ...participantNotes };
      if (note.trim()) updated[pid] = note.trim();
      else delete updated[pid];
      await activitiesApi.update(activityId, { participantNotes: updated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("메모가 저장되었습니다.");
      setNoteDialog(null);
    },
    onError: (e: Error) => toast.error(e.message || "메모 저장에 실패했습니다."),
  });

  // 참여자 신청 상태 변경 (해당 사용자의 applicant row 가 있을 때만 의미가 있음)
  // 대외 학술대회의 경우 거절 시 applicant까지 제거(=신청 취소)
  const updateParticipantStatusMutation = useMutation({
    mutationFn: async ({ pid, status }: { pid: string; status: "approved" | "rejected" | "pending" }) => {
      const isExternalReject = type === "external" && status === "rejected";
      await activityApplicantsApi.mutate(activityId, ({ applicants: cur, participants: curP }) => {
        const updated = isExternalReject
          ? cur.filter((a) => a.userId !== pid)
          : cur.map((a) => (a.userId === pid ? { ...a, status } : a));
        const newParticipants = status === "rejected"
          ? curP.filter((p) => p !== pid)
          : curP;
        return { applicants: updated, participants: newParticipants };
      });
      return { isExternalReject };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-applicants", activityId] });
      toast.success(result?.isExternalReject ? "신청이 취소되었습니다." : "상태가 변경되었습니다.");
    },
    onError: (e: Error) => toast.error(e.message || "상태 변경에 실패했습니다."),
  });

  // 거절 이력 삭제 (관리자) — applicants에서 완전 제거
  const deleteApplicantMutation = useMutation({
    mutationFn: async ({ key }: { key: string }) => {
      if (!activity) return;
      await activitiesApi.mutateRoster(activityId, ({ applicants: cur, participants: curP }) => {
        const target = cur.find((a) => (a.userId ?? a.guestKey) === key);
        return {
          applicants: cur.filter((a) => (a.userId ?? a.guestKey) !== key),
          participants: target?.userId ? curP.filter((p) => p !== target.userId) : curP,
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-applicants", activityId] });
      toast.success("이력이 삭제되었습니다.");
    },
    onError: (e: Error) => toast.error(e.message || "이력 삭제에 실패했습니다."),
  });

  // 신청 승인/거절 (관리자)
  // 대외 학술대회의 경우 거절 시 신청현황에서 제거(=신청 취소)
  const updateApplicantMutation = useMutation({
    mutationFn: async ({ key, status }: { key: string; status: "approved" | "rejected" }) => {
      if (!activity) return;
      const isExternalReject = type === "external" && status === "rejected";
      await activitiesApi.mutateRoster(activityId, ({ applicants: cur, participants: curP }) => {
        const target = cur.find((a) => (a.userId ?? a.guestKey) === key);
        const updated = isExternalReject
          ? cur.filter((a) => (a.userId ?? a.guestKey) !== key)
          : cur.map((a) => ((a.userId ?? a.guestKey) === key ? { ...a, status } : a));
        let newParticipants = curP;
        if (status === "approved" && target?.userId && !curP.includes(target.userId)) {
          newParticipants = [...curP, target.userId];
        } else if (isExternalReject && target?.userId && curP.includes(target.userId)) {
          newParticipants = curP.filter((p) => p !== target.userId);
        }
        return { applicants: updated, participants: newParticipants };
      });
      return { isExternalReject };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-applicants", activityId] });
      toast.success(result?.isExternalReject ? "신청이 취소되었습니다." : "처리되었습니다.");
    },
    onError: (e: Error) => toast.error(e.message || "처리에 실패했습니다."),
  });

  // Sprint UX-3: pending 신청 다중 선택 일괄 승인/거절 (운영진)
  const [selectedApplicantKeys, setSelectedApplicantKeys] = useState<string[]>([]);
  const bulkApplicantMutation = useMutation({
    mutationFn: async ({ keys, status }: { keys: string[]; status: "approved" | "rejected" }) => {
      if (!activity || keys.length === 0) return;
      const keySet = new Set(keys);
      const isExternalReject = type === "external" && status === "rejected";
      await activitiesApi.mutateRoster(activityId, ({ applicants: cur, participants: curP }) => {
        const targets = cur.filter((a) => keySet.has((a.userId ?? a.guestKey) as string));
        const updated = isExternalReject
          ? cur.filter((a) => !keySet.has((a.userId ?? a.guestKey) as string))
          : cur.map((a) => (keySet.has((a.userId ?? a.guestKey) as string) ? { ...a, status } : a));
        let newParticipants = curP;
        if (status === "approved") {
          const toAdd = targets
            .map((t) => t.userId)
            .filter((id): id is string => !!id && !curP.includes(id));
          if (toAdd.length > 0) newParticipants = [...curP, ...toAdd];
        } else if (isExternalReject) {
          const removeIds = new Set(targets.map((t) => t.userId).filter(Boolean));
          newParticipants = curP.filter((p) => !removeIds.has(p));
        }
        return { applicants: updated, participants: newParticipants };
      });
      return { count: keys.length, isExternalReject, status };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      queryClient.invalidateQueries({ queryKey: ["activity-applicants", activityId] });
      setSelectedApplicantKeys([]);
      if (result) {
        const action = result.status === "approved" ? "승인" : result.isExternalReject ? "신청 취소" : "거절";
        toast.success(`${result.count}명 ${action} 처리되었습니다.`);
      }
    },
    onError: (e: Error) => toast.error(e.message || "일괄 처리에 실패했습니다."),
  });

  if (!activity) {
    return <div className="py-16 text-center text-muted-foreground">활동을 찾을 수 없습니다.</div>;
  }

  const applicationQuestions = (activity?.applicationQuestions as string[] | undefined) ?? [];
  const applicationForm: FormField[] = (activity?.applicationForm as FormField[] | undefined)
    ?? applicationQuestions.map((q, i) => ({ id: `legacy_${i}`, type: "long_text" as const, label: q }));
  // Sprint 70: 대외활동에서 신청자가 선택한 참석유형의 추가 폼 (공통 폼 + 유형별 폼 = 신청 다이얼로그 표시 폼)
  const applicationFormByType = (activity?.applicationFormByType as
    | Partial<Record<ExternalParticipantType, FormField[]>>
    | undefined) ?? {};
  const typeSpecificForm: FormField[] =
    type === "external" ? applicationFormByType[applyParticipantType] ?? [] : [];
  const combinedApplicationFields: FormField[] = [...applicationForm, ...typeSpecificForm];

  // 리포트 통계 — status 필드가 없는 옛 데이터는 "pending" 으로 간주 (집계 누락 방지)
  const reportStats = {
    totalApplicants: applicants.length,
    approved: applicants.filter((a) => a.status === "approved").length,
    rejected: applicants.filter((a) => a.status === "rejected").length,
    pending: applicants.filter((a) => (a.status ?? "pending") === "pending").length,
    participants: participants.length,
    approvalRate: applicants.length > 0 ? Math.round((applicants.filter((a) => a.status === "approved").length / applicants.length) * 100) : 0,
  };

  const progressDone = progressList.filter((p) => p.status === "completed").length;
  const progressPct = progressList.length > 0 ? Math.round((progressDone / progressList.length) * 100) : 0;

  const staffPids = participants.filter((pid) => leaderId === pid || !!participantRoles[pid]);
  const regularPids = participants.filter((pid) => !staffPids.includes(pid));

  const speakerApplicants = applicants.filter((a) => a.participantType === "speaker");
  const volunteerApplicants = applicants.filter((a) => a.participantType === "volunteer");
  // data-split: 비-staff 는 전체 신청자 목록 대신 비-PII 공개 발표자 투영을 사용.
  const publicSpeakers = (activity?.publicSpeakers as Activity["publicSpeakers"]) ?? [];
  // 발표자 탭 카운트 — staff 는 실제 speaker applicants, 비-staff 는 publicSpeakers
  const presentersCount = isStaff ? speakerApplicants.length : publicSpeakers.length;

  // Sprint 4 — 자료 아카이브 노출 조건: study/project 이고 자료(materials 또는 preReadMaterials)가 1개 이상 존재
  const hasArchive =
    (type === "study" || type === "project") &&
    progressList.some(
      (p) =>
        ((p.materials as ActivityProgress["materials"])?.length ?? 0) > 0 ||
        ((p.preReadMaterials as ActivityProgress["preReadMaterials"])?.length ?? 0) > 0,
    );

  const TABS: { value: Tab; label: string; show: boolean }[] = [
    { value: "overview", label: "개요", show: true },
    { value: "progress", label: `진행 현황${progressList.length > 0 ? ` (${progressPct}%)` : ""}`, show: !!user && type !== "external" },
    // Sprint 67: 외부 학술대회 — 본인이 추가한 세션(plans) 모아 보기 (요청)
    { value: "my-sessions", label: `내 일정${mySessionsCount > 0 ? ` (${mySessionsCount})` : ""}`, show: type === "external" && !!user },
    // Sprint 4 — 자료 아카이브 (study/project 전용)
    { value: "archive", label: "자료 아카이브", show: !!user && hasArchive },
    { value: "staff", label: `운영진 (${staffPids.length})`, show: !!user },
    { value: "presenters", label: `발표자 (${presentersCount})`, show: type === "external" },
    { value: "volunteers", label: `자원봉사자 (${volunteerApplicants.length})`, show: type === "external" && isStaff },
    { value: "participants", label: `참여자 (${regularPids.length})`, show: !!user },
    // Sprint 67: 신청현황은 운영진+ 만 노출 (요청 — 일반 신청자 미노출)
    { value: "applicants", label: `신청현황 (${applicants.length})`, show: !!user && registrationMethod === "open" && isStaff },
    { value: "form-settings", label: "신청 폼 설정", show: registrationMethod === "open" && isStaff },
    { value: "report", label: "리포트", show: isStaff },
    // Sprint 5 — 스터디 참여도 리포트 (study/project 전용, 운영진/리더)
    { value: "study-report", label: "참여도 리포트", show: (type === "study" || type === "project") && (isStaff || isLeader) },
    { value: "settings", label: "관리", show: isStaff },
  ];

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link href={backHref} className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />{backLabel}
        </Link>

        {/* 헤더 */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[activity.status])}>{STATUS_LABELS[activity.status]}</Badge>
            {recruitmentStatus && !(type === "study" && (recruitmentStatus === "in_progress" || recruitmentStatus === "completed")) && (
              <Badge variant="secondary" className={cn("text-xs", RECRUIT_COLORS[recruitmentStatus])}>
                {recruitmentComputed.notStarted
                  ? "모집 예정"
                  : type === "study"
                    ? (RECRUIT_LABELS_STUDY[recruitmentStatus] ?? RECRUIT_LABELS[recruitmentStatus])
                    : RECRUIT_LABELS[recruitmentStatus]}
              </Badge>
            )}
            {recruitmentComputed.auto && recruitmentPeriodLabel && (
              <span className="text-[10px] text-muted-foreground">
                모집 {recruitmentPeriodLabel}
              </span>
            )}
            {/* D-day 배지 — 모집 마감까지 / 모집 시작까지 */}
            {recruitmentComputed.auto && (() => {
              if (recruitmentComputed.notStarted && activity.recruitmentStartAt) {
                const msUntilStart = new Date(activity.recruitmentStartAt as string).getTime() - Date.now();
                const days = Math.ceil(msUntilStart / (1000 * 60 * 60 * 24));
                if (days > 0) {
                  return (
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                      모집까지 D-{days}
                    </span>
                  );
                }
              }
              if (recruitmentStatus === "recruiting" && recruitmentComputed.msUntilEnd !== null) {
                const days = Math.ceil(recruitmentComputed.msUntilEnd / (1000 * 60 * 60 * 24));
                if (days <= 0) {
                  return (
                    <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-bold text-white">
                      마감 D-DAY
                    </span>
                  );
                }
                return (
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                    days <= 3
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                  )}>
                    마감 D-{days}
                  </span>
                );
              }
              return null;
            })()}
          </div>
          <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight sm:mt-4 sm:text-3xl">{activity.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground sm:mt-5">
            <span className="flex items-center gap-1.5"><Calendar size={14} />{activity.date}{activity.endDate ? ` ~ ${activity.endDate}` : ""}</span>
            {(activity.year || activity.semester) && (
              <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                {formatSemester(activity.year, activity.semester)}
              </Badge>
            )}
            {activity.leader && <span className="flex items-center gap-1.5"><User size={14} />{activity.leader}</span>}
            {activity.location && <span className="flex items-center gap-1.5"><MapPin size={14} />{activity.location}</span>}
            <span className="flex items-center gap-1.5"><Users size={14} />참여 {participants.length}{activity.maxParticipants ? `/${activity.maxParticipants}` : ""}명</span>
            {activity.conferenceUrl && <a href={activity.conferenceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe size={14} />학회 홈페이지</a>}
          </div>

          {type === "external" && (
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Sprint 67-AQ: 핵심 CTA — primary 강조 (시각 위계) */}
              <Link
                href={`/activities/external/${activityId}/program`}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
              >
                <Calendar size={14} /> 학술대회 프로그램 · 내 일정
              </Link>
              {user && (
                <Link
                  href={`/activities/external/${activityId}/workbook`}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
                >
                  <ListChecks size={14} /> 워크북
                </Link>
              )}
              {/* Sprint 67-Z: 후기 작성 버튼 (학술대회 프로그램·워크북과 동일 형식) */}
              {user && (
                <Link
                  href={`/activities/external/${activityId}/review`}
                  className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted"
                >
                  <MessageSquare size={14} /> 후기 작성
                </Link>
              )}
              {/* Sprint 67-AJ: 내 봉사 페이지 — volunteer participantType 자만 노출 */}
              {user && applicants.some(
                (a) => a.userId === user.id && a.participantType === "volunteer",
              ) && (
                <Link
                  href={`/activities/external/${activityId}/my-volunteer`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-900 shadow-xs hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100"
                >
                  <span>💗</span> 내 봉사
                </Link>
              )}
              {/* Sprint 70: 운영자 통합 박스 — 5개 운영 진입 버튼 시각적 강조 */}
              {/* 운영 도구 — 대외 학술대회는 운영진(staff+)이면 접속 경로와 무관하게 노출 */}
              {isStaff && (type === "external" || backHref.includes("academic-admin") || backHref.includes("/console/academic")) && (
                <div className="basis-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <UserCog size={12} /> 운영 도구 {type === "external" && "(대외 학술대회)"}
                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold normal-case">
                      운영진 전용
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {type === "external" && (
                    <Link
                      href={`/console/academic/external/${activityId}/program`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      <Pencil size={14} /> 시간표 편집
                    </Link>
                    )}
                    {type === "external" && (
                      <>
                        <Link
                          href={`/console/academic/external/${activityId}/workbook`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50/50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-200"
                        >
                          <ListChecks size={14} /> 워크북 관리
                        </Link>
                        <Link
                          href={`/console/academic/external/${activityId}/reviews`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50/50 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200"
                        >
                          <MessageSquareQuote size={14} /> 후기 모니터링
                        </Link>
                        <Link
                          href={`/console/academic/external/${activityId}/volunteers`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50/50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                        >
                          <HeartHandshake size={14} /> 봉사자 운영
                        </Link>
                        <Link
                          href={`/console/academic/external/${activityId}/speakers`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50/50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200"
                        >
                          <Presentation size={14} /> 발표자 운영
                        </Link>
                        <Link
                          href={`/console/academic/external/${activityId}/session-analytics`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50/50 px-3 py-1.5 text-xs font-medium text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-200"
                        >
                          <BarChart3 size={14} /> 세션 분석 통계
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 모집 자동 안내 — 미개시/마감 임박/마감됨 (자동 계산 모드일 때만) */}
          {recruitmentComputed.auto && (recruitmentComputed.notStarted || (recruitmentStatus === "closed" && (activity.recruitmentStartAt || activity.recruitmentEndAt))) && (
            <div className="mt-6 border-t border-slate-100 pt-5 sm:mt-7 sm:pt-6">
              {recruitmentComputed.notStarted ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                  <div className="font-medium">모집 예정</div>
                  <div className="mt-1 text-[11px] opacity-90">
                    {recruitmentPeriodLabel ? `${recruitmentPeriodLabel} 모집이 시작됩니다.` : "곧 모집이 시작됩니다."}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  <div className="font-medium">모집이 마감되었습니다</div>
                  {recruitmentPeriodLabel && (
                    <div className="mt-1 text-[11px] opacity-90">모집 기간 {recruitmentPeriodLabel}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 운영진 전용 안내 — registrationMethod=open 이지만 모집 상태가 recruiting 이 아니어서
              회원에게 신청 버튼이 숨겨진 경우. 자동 계산 모드(recruitmentStartAt/End 설정)가 아닐 때만. */}
          {isStaff && registrationMethod === "open" && recruitmentStatus !== "recruiting"
            && !recruitmentComputed.auto && (
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                <Clock size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">
                    현재 모집 상태가 &lsquo;{RECRUIT_LABELS[recruitmentStatus] ?? recruitmentStatus}&rsquo;(으)로 설정되어 회원에게 <strong>참가 신청 버튼이 표시되지 않습니다.</strong>
                  </p>
                  <p className="mt-1 text-xs opacity-90">
                    회원이 신청하려면 모집 상태를 &lsquo;모집중&rsquo;으로 변경해야 합니다.
                    모집 기간(시작·종료일시)을 설정하면 자동으로 모집중이 유지되며, 아래 버튼으로 즉시 전환할 수도 있습니다.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => setRecruitingMutation.mutate()}
                    disabled={setRecruitingMutation.isPending}
                  >
                    <UserPlus size={14} className="mr-1.5" />
                    모집중으로 변경
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 참여 버튼 — 헤더와 시각적으로 분리 */}
          {(((!isJoined && !hasApplied && recruitmentStatus === "recruiting" && registrationMethod === "open") || isJoined || (hasApplied && !isJoined))) && (
            <div className="mt-6 border-t border-slate-100 pt-5 sm:mt-7 sm:pt-6">
              {recruitmentComputed.auto && recruitmentStatus === "recruiting" && recruitmentComputed.msUntilEnd !== null && recruitmentComputed.msUntilEnd <= 1000 * 60 * 60 * 24 * 3 && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50/60 p-2 text-[11px] text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  마감까지 약 {Math.max(1, Math.ceil(recruitmentComputed.msUntilEnd / (1000 * 60 * 60)))}시간 남았습니다.
                </div>
              )}
              {!isJoined && !hasApplied && recruitmentStatus === "recruiting" && registrationMethod === "open" && (
                type === "external" ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button size="lg" className="w-full font-semibold sm:w-auto" onClick={() => {
                      setApplyName(user?.name ?? "");
                      setApplyStudentId(user?.studentId ?? "");
                      setApplyEmail(user?.email ?? "");
                      setApplyPhone("");
                      setApplySpeakerSubmissionType("paper");
                      setApplySpeakerPaperTitle("");
                      setApplyDialog(true);
                    }}>
                      <UserPlus size={16} className="mr-1.5" />참가 신청{!user && " (비회원 가능)"}
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full font-medium sm:w-auto"
                      onClick={() => {
                        setLookupName(user?.name ?? "");
                        setLookupStudentId(user?.studentId ?? "");
                        setLookupResult(null);
                        setLookupDialog(true);
                      }}
                    >
                      <Search size={16} className="mr-1.5" />신청현황 조회
                    </Button>
                  </div>
                ) : user ? (
                  <Button size="lg" className="w-full font-semibold sm:w-auto" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                    <UserPlus size={16} className="mr-1.5" />참여 신청
                  </Button>
                ) : (
                  <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`} className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 sm:w-auto">
                    <UserPlus size={16} className="mr-1.5" />로그인 후 참여 신청
                  </Link>
                )
              )}
              {isJoined && <Badge className="bg-green-50 px-3 py-1 text-sm text-green-700"><Check size={14} className="mr-1" />참여 중</Badge>}
              {hasApplied && !isJoined && <Badge className="bg-amber-50 px-3 py-1 text-sm text-amber-700"><Clock size={14} className="mr-1" />신청 대기중</Badge>}
              {type === "external" && user && (() => {
                const mine = applicants.find((a) => a.userId === user.id);
                return mine ? (
                  <Button variant="outline" size="sm" className="ml-2 gap-1" onClick={() => openEditApplication(mine)}>
                    <Pencil size={14} />신청 정보 수정
                  </Button>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* 탭 — 헤더와 본문 사이 여백 확대 */}
        <div className="mt-8 flex overflow-x-auto border-b">
          {TABS.filter((t) => t.show).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex-none border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                activeTab === tab.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {!user ? (
                activity.imageUrl ? (
                  <div className="overflow-hidden rounded-2xl border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activity.imageUrl} alt={`${activity.title} 포스터`} className="block w-full" />
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
                    포스터가 등록되지 않았습니다. 자세한 정보는 로그인 후 확인할 수 있습니다.
                  </div>
                )
              ) : (
                <>
                  {activity.imageUrl && (
                    <div className="overflow-hidden rounded-2xl border bg-card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activity.imageUrl} alt={`${activity.title} 포스터`} className="block w-full" />
                    </div>
                  )}
                  <div className="rounded-2xl border bg-card p-6">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{activity.description}</p>
                    {activity.detailContent && (
                      <div className="mt-4 border-t pt-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{activity.detailContent}</p>
                      </div>
                    )}
                  </div>
                  {activity.tags && activity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activity.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  )}
                  {/* Sprint 67-Z/QA-H2: 학술대회 참석자 후기 섹션 — isStaff 만 (leader 제외, regrets 권한 정확화) */}
                  {type === "external" && (
                    <AttendeeReviewsSection
                      activityId={activityId}
                      currentUserId={user?.id}
                      isStaff={isStaff}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "progress" && (
            <div className="space-y-4">
              {/* 진행률 바 */}
              {progressList.length > 0 && (
                <div className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">전체 진행률</span>
                    <span className="text-muted-foreground">{progressDone}/{progressList.length} 완료 ({progressPct}%)</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div className={cn("h-full rounded-full transition-all", progressPct === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}

              {/* 주차 추가 (운영진 또는 스터디/프로젝트 모임장) — 리스트 위로 이동 */}
              {(isStaff || isLeader) && (
                <div className="rounded-2xl border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1"><ListChecks size={14} />주차 추가</h3>
                    {(type === "study" || type === "project") && (
                      <Button
                        size="sm"
                        variant={bulkOpen ? "default" : "outline"}
                        onClick={() => setBulkOpen((v) => !v)}
                        className="h-7 gap-1 px-2 text-[11px]"
                      >
                        <CalendarPlus size={12} />
                        {bulkOpen ? "일괄 생성 닫기" : "주 단위 일괄 생성"}
                      </Button>
                    )}
                  </div>
                  <Input value={progressTitle} onChange={(e) => setProgressTitle(e.target.value)} placeholder="활동 내용 (예: 논문 리뷰 #1)" />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">날짜</label>
                      <Input type="date" value={progressDate} onChange={(e) => setProgressDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">시작 시간</label>
                      <Input type="time" value={progressStartTime} onChange={(e) => setProgressStartTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">종료 시간</label>
                      <Input type="time" value={progressEndTime} onChange={(e) => setProgressEndTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">방법</label>
                      <select
                        value={progressMode}
                        onChange={(e) => setProgressMode(e.target.value as ActivityProgressMode)}
                        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      >
                        <option value="in_person">대면</option>
                        <option value="zoom">ZOOM</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!progressTitle.trim()} onClick={async () => {
                      try {
                        const nextWeek = progressList.reduce((max, p) => Math.max(max, p.week ?? 0), 0) + 1;
                        await activityProgressApi.create({
                          activityId,
                          week: nextWeek,
                          date: progressDate || todayYmdLocal(),
                          startTime: progressStartTime || undefined,
                          endTime: progressEndTime || undefined,
                          mode: progressMode,
                          title: progressTitle.trim(),
                          status: "planned",
                        });
                        await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                        await queryClient.refetchQueries({ queryKey: ["activity-progress", activityId] });
                        setProgressTitle("");
                        setProgressDate("");
                        setProgressStartTime("");
                        setProgressEndTime("");
                        setProgressMode("in_person");
                        toast.success("추가되었습니다.");
                      } catch (e) {
                        console.error("[activity-progress/create]", e);
                        toast.error(e instanceof Error ? `추가 실패: ${e.message}` : "추가에 실패했습니다.");
                      }
                    }}><Plus size={14} className="mr-1" />추가</Button>
                  </div>

                  {/* 일괄 생성 폼 (스터디/프로젝트만) */}
                  {bulkOpen && (type === "study" || type === "project") && (
                    <div className="space-y-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                      <p className="text-[11px] text-muted-foreground">
                        시작 날짜부터 7일 간격으로 N개 주차를 한 번에 생성합니다. 제목은 "Week 1, Week 2..." 형식으로 자동 입력되며 나중에 개별 편집 가능합니다.
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">시작 날짜</label>
                          <Input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">주차 수</label>
                          <Input type="number" min={1} max={20} value={bulkCount} onChange={(e) => setBulkCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">시작 시간</label>
                          <Input type="time" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] text-muted-foreground">종료 시간</label>
                          <Input type="time" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={bulkMode}
                          onChange={(e) => setBulkMode(e.target.value as ActivityProgressMode)}
                          className="w-32 rounded-md border bg-background px-2 py-1.5 text-sm"
                        >
                          <option value="in_person">대면</option>
                          <option value="zoom">ZOOM</option>
                        </select>
                        <Button
                          size="sm"
                          disabled={!bulkStartDate || bulking}
                          onClick={async () => {
                            if (!bulkStartDate) {
                              toast.error("시작 날짜를 선택하세요.");
                              return;
                            }
                            setBulking(true);
                            try {
                              const start = new Date(bulkStartDate + "T00:00:00");
                              const baseWeek = progressList.reduce((max, p) => Math.max(max, p.week ?? 0), 0);
                              for (let i = 0; i < bulkCount; i++) {
                                const d = new Date(start);
                                d.setDate(start.getDate() + i * 7);
                                const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                                await activityProgressApi.create({
                                  activityId,
                                  week: baseWeek + i + 1,
                                  date: ymd,
                                  startTime: bulkStart || undefined,
                                  endTime: bulkEnd || undefined,
                                  mode: bulkMode,
                                  title: `Week ${baseWeek + i + 1}`,
                                  status: "planned",
                                });
                              }
                              await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                              await queryClient.refetchQueries({ queryKey: ["activity-progress", activityId] });
                              toast.success(`${bulkCount}개 주차가 생성되었습니다.`);
                              setBulkOpen(false);
                            } catch (e) {
                              console.error("[activity-progress/bulk]", e);
                              toast.error(e instanceof Error ? `일괄 생성 실패: ${e.message}` : "일괄 생성 실패");
                            } finally {
                              setBulking(false);
                            }
                          }}
                        >
                          {bulking ? <Loader2 size={12} className="mr-1 animate-spin" /> : <CalendarPlus size={12} className="mr-1" />}
                          {bulkCount}개 주차 일괄 생성
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 주차별 기록 */}
              <div className="rounded-2xl border bg-card divide-y">
                {progressList.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">등록된 진행 기록이 없습니다.</p>
                ) : (
                  progressList.map((p, idx) => {
                    const isExpanded = expandedTimers.has(p.id);
                    const displayWeek = idx + 1;
                    return (
                      <div key={p.id}>
                        <div className="flex items-start gap-3 px-4 py-3">
                          <button
                            onClick={async () => {
                              if (!isStaff && !isLeader) return;
                              const next = p.status === "completed" ? "planned" : p.status === "planned" ? "in_progress" : "completed";
                              try {
                                await activityProgressApi.update(p.id, { status: next });
                                queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                              } catch (e) {
                                console.error("[activity-progress/update]", e);
                                toast.error(e instanceof Error ? `상태 변경 실패: ${e.message}` : "상태 변경에 실패했습니다.");
                              }
                            }}
                            className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", p.status === "completed" ? "border-green-500 bg-green-500 text-white" : p.status === "in_progress" ? "border-amber-400 bg-amber-50" : "border-muted-foreground/30")}
                            disabled={!isStaff && !isLeader}
                          >
                            {p.status === "completed" && <Check size={12} />}
                            {p.status === "in_progress" && <div className="h-2 w-2 rounded-full bg-amber-400" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">Week {displayWeek}</Badge>
                              {p.mode && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px]",
                                    p.mode === "in_person"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-blue-50 text-blue-700",
                                  )}
                                >
                                  {ACTIVITY_PROGRESS_MODE_LABELS[p.mode]}
                                </Badge>
                              )}
                              <span className="text-sm font-medium">{p.title}</span>
                            </div>
                            {p.description && <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>}
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span>{p.date}</span>
                              {(p.startTime || p.endTime) && (
                                <span>
                                  {p.startTime}
                                  {p.startTime && p.endTime && " ~ "}
                                  {p.endTime}
                                </span>
                              )}
                              {/* UX polish: 회고/과제 N건 배지 — 회차당 활동 진척 한눈에 */}
                              {showWeekBadges && (() => {
                                const stat = weekBadgeMap.get(p.id);
                                if (!stat || (stat.reflectionCount === 0 && stat.assignmentCount === 0)) return null;
                                return (
                                  <span className="flex items-center gap-1">
                                    {stat.reflectionCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-[9px] text-blue-700"
                                        title={`회고 ${stat.reflectionCount}건`}
                                      >
                                        💬 {stat.reflectionCount}
                                      </span>
                                    )}
                                    {stat.assignmentCount > 0 && (
                                      <span
                                        className="inline-flex items-center gap-0.5 rounded bg-purple-50 px-1 py-0.5 text-[9px] text-purple-700"
                                        title={`과제 ${stat.assignmentCount}건`}
                                      >
                                        📝 {stat.assignmentCount}
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                              {/* UX polish: 출석/자료 카운트도 같은 행에 노출 (이미 expanded view 에는 있음) */}
                              {((p.attendedUserIds as string[] | undefined)?.length ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-0.5 text-[9px] text-emerald-700"
                                  title={`출석 ${(p.attendedUserIds as string[]).length}명`}
                                >
                                  ✓ {(p.attendedUserIds as string[]).length}
                                </span>
                              )}
                              {((p.materials as ActivityProgress["materials"])?.length ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[9px] text-amber-700"
                                  title={`자료 ${(p.materials as ActivityProgress["materials"])!.length}건`}
                                >
                                  📎 {(p.materials as ActivityProgress["materials"])!.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {/* Week-Page: 회차 별도 페이지로 이동 (study/project 만, 회의록·과제·노트·회고 통합 페이지) */}
                            {(type === "study" || type === "project") && (
                              <Link
                                href={`/activities/${type === "study" ? "studies" : "projects"}/${activityId}/weeks/${displayWeek}`}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-primary/40 bg-primary/5 px-2 text-[11px] font-medium text-primary hover:bg-primary/10"
                                aria-label={`Week ${displayWeek} 전체 페이지 열기`}
                              >
                                <span className="hidden sm:inline">전체 페이지</span>
                                <ChevronRight size={12} />
                              </Link>
                            )}
                            <Button
                              size="sm"
                              variant={isExpanded ? "default" : "outline"}
                              onClick={() => toggleTimer(p.id)}
                              className="h-7 gap-1 px-2 text-[11px]"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "미팅 타이머 접기" : "미팅 타이머 펼치기"}
                            >
                              <Timer size={12} />
                              <span className="hidden sm:inline">타이머</span>
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </Button>
                            {(isStaff || isLeader) && (
                              <button onClick={async () => {
                                if (!confirm("이 진행 기록을 영구 삭제할까요? 출석·자료 정보도 함께 사라집니다.")) return;
                                try {
                                  await activityProgressApi.delete(p.id);
                                  queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                                  toast.success("삭제되었습니다.");
                                } catch (e) {
                                  console.error("[activity-progress/delete]", e);
                                  toast.error(e instanceof Error ? `삭제 실패: ${e.message}` : "삭제에 실패했습니다.");
                                }
                              }} className="rounded p-1 text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                            )}
                          </div>
                        </div>
                        {isExpanded && (() => {
                          const attendedSet = new Set((p.attendedUserIds as string[] | undefined) ?? []);
                          const materials = (p.materials as ActivityProgress["materials"]) ?? [];
                          const isUploading = uploadingPid === p.id;
                          return (
                            <div className="border-t bg-muted/20 px-4 py-3 space-y-4">
                              {/* Sprint 3 — 사전 학습 (study/project 만) */}
                              {(type === "study" || type === "project") && (
                                <StudySessionPreClassCard
                                  activityId={activityId}
                                  progress={p}
                                  week={displayWeek}
                                  canManage={isStaff || isLeader}
                                  participantIds={participants}
                                />
                              )}

                              <InlineMeetingTimer
                                activityId={activityId}
                                activityProgressId={p.id}
                                weekLabel={`Week ${displayWeek} · ${p.title}`}
                                canControl={isStaff || isLeader}
                                canStart={isStaff || isLeader}
                                createdBy={user?.id}
                              />

                              {/* 출석 체크 */}
                              <div className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Users size={12} /> 출석 ({attendedSet.size}/{participants.length})
                                  </h4>
                                  {!(isStaff || isLeader) && (
                                    <span className="text-[10px] text-muted-foreground">운영진/리더만 변경 가능</span>
                                  )}
                                </div>
                                {participants.length === 0 ? (
                                  <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
                                    아직 등록된 참여자가 없습니다.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                                    {participants.map((pid) => {
                                      const m = memberMap.get(pid);
                                      const guest = guestMap.get(pid);
                                      const name = m?.name ?? guest?.name ?? "(이름 미확인)";
                                      const attended = attendedSet.has(pid);
                                      return (
                                        <button
                                          key={pid}
                                          type="button"
                                          disabled={!(isStaff || isLeader)}
                                          onClick={async () => {
                                            const next = attended
                                              ? Array.from(attendedSet).filter((x) => x !== pid)
                                              : [...Array.from(attendedSet), pid];
                                            try {
                                              await activityProgressApi.update(p.id, { attendedUserIds: next });
                                              queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                                            } catch (e) {
                                              console.error("[attendance]", e);
                                              toast.error(e instanceof Error ? `출석 변경 실패: ${e.message}` : "출석 변경 실패");
                                            }
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] transition",
                                            attended
                                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                              : "border-border bg-background text-foreground hover:border-primary/30",
                                            !(isStaff || isLeader) && "cursor-default opacity-80",
                                          )}
                                        >
                                          {attended ? (
                                            <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                                          ) : (
                                            <Circle size={12} className="shrink-0 text-muted-foreground" />
                                          )}
                                          <span className="truncate">
                                            {name}
                                            {pid === leaderId && (
                                              <span className="ml-1 text-[9px] text-amber-600">(리더)</span>
                                            )}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* 자료 업로드 */}
                              <div className="rounded-lg border bg-card p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="flex items-center gap-1.5 text-xs font-semibold">
                                    <Paperclip size={12} /> 자료 ({materials.length})
                                  </h4>
                                  {(isStaff || isLeader) && (
                                    <>
                                      <input
                                        ref={(el) => { fileInputRefs.current.set(p.id, el); }}
                                        type="file"
                                        className="hidden"
                                        onChange={async (e) => {
                                          const f = e.target.files?.[0];
                                          if (!f) return;
                                          setUploadingPid(p.id);
                                          try {
                                            const folder = `activities/${activityId}/week-${displayWeek}/materials`;
                                            const uploaded = await uploadToStorage(f, folder);
                                            const next = [...materials, uploaded];
                                            await activityProgressApi.update(p.id, { materials: next });
                                            await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                                            toast.success(`${f.name} 업로드 완료`);
                                          } catch (err) {
                                            console.error("[material/upload]", err);
                                            toast.error(err instanceof Error ? `업로드 실패: ${err.message}` : "업로드 실패");
                                          } finally {
                                            setUploadingPid(null);
                                            const ref = fileInputRefs.current.get(p.id);
                                            if (ref) ref.value = "";
                                          }
                                        }}
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-[10px]"
                                        disabled={isUploading}
                                        onClick={() => fileInputRefs.current.get(p.id)?.click()}
                                      >
                                        {isUploading ? (
                                          <Loader2 size={10} className="mr-1 animate-spin" />
                                        ) : (
                                          <Upload size={10} className="mr-1" />
                                        )}
                                        파일 업로드
                                      </Button>
                                    </>
                                  )}
                                </div>
                                {materials.length === 0 ? (
                                  <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
                                    아직 업로드된 자료가 없습니다.
                                  </p>
                                ) : (
                                  <ul className="space-y-1">
                                    {materials.map((m, mi) => (
                                      <li
                                        key={`${m.url}-${mi}`}
                                        className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5 text-[11px]"
                                      >
                                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                          <FileText size={11} className="shrink-0 text-muted-foreground" />
                                          <a
                                            href={m.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="truncate font-medium text-foreground hover:text-primary hover:underline"
                                          >
                                            {m.name}
                                          </a>
                                          {typeof m.size === "number" && (
                                            <span className="shrink-0 text-[9px] text-muted-foreground">
                                              {(m.size / 1024).toFixed(1)} KB
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0.5">
                                          <a
                                            href={m.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            download={m.name}
                                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                            title="다운로드"
                                          >
                                            <Download size={11} />
                                          </a>
                                          {(isStaff || isLeader) && (
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                if (!confirm("이 자료를 삭제하시겠습니까?")) return;
                                                const next = materials.filter((_, i) => i !== mi);
                                                try {
                                                  await activityProgressApi.update(p.id, { materials: next });
                                                  await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
                                                  toast.success("삭제되었습니다.");
                                                } catch (err) {
                                                  console.error("[material/delete]", err);
                                                  toast.error(err instanceof Error ? `삭제 실패: ${err.message}` : "삭제 실패");
                                                }
                                              }}
                                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                              title="삭제"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              {/* Sprint 1 — 회차 회고 (study/project 만) */}
                              {(type === "study" || type === "project") && (
                                <StudySessionReflectionCard
                                  activityId={activityId}
                                  activityProgressId={p.id}
                                  week={displayWeek}
                                  progressStatus={p.status}
                                  currentUserId={user?.id}
                                  currentUserName={user?.name}
                                  canViewAll={isStaff || isLeader}
                                  participantIds={participants}
                                />
                              )}

                              {/* Sprint 2 — 회차 과제 (study/project 만) */}
                              {(type === "study" || type === "project") && (
                                <StudySessionAssignmentsCard
                                  activityId={activityId}
                                  activityProgressId={p.id}
                                  week={displayWeek}
                                  currentUserId={user?.id}
                                  currentUserName={user?.name}
                                  canManage={isStaff || isLeader}
                                  participantIds={participants}
                                />
                              )}

                              {/* Sprint 4 — 회차 토론 노트 (study/project 만) */}
                              {(type === "study" || type === "project") && (
                                <StudySessionNotesCard
                                  activityId={activityId}
                                  activityProgressId={p.id}
                                  week={displayWeek}
                                  currentUserId={user?.id}
                                  currentUserName={user?.name}
                                  canModerate={isStaff || isLeader}
                                />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {(activeTab === "staff" || activeTab === "participants") && (() => {
            const renderRow = (pid: string) => {
              const m = memberMap.get(pid);
              const guest = guestMap.get(pid);
              const isGuest = isGuestPid(pid);
              const role = participantRoles[pid];
              const note = participantNotes[pid];
              const applicant = applicants.find((a) => a.userId === pid);
              const status = applicant?.status;
              const enrollment = (m?.enrollmentStatus as EnrollmentStatus | undefined);
              const isLeaderRow = leaderId === pid;
              return (
                <tr key={pid} className="hover:bg-muted/20">
                  <td className="px-3 py-2 align-top">
                    {isGuest ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">비회원</Badge>
                    ) : enrollment ? (
                      <Badge variant="secondary" className={cn(
                        "text-[10px]",
                        enrollment === "enrolled" && "bg-green-50 text-green-700",
                        enrollment === "on_leave" && "bg-amber-50 text-amber-700",
                        enrollment === "graduated" && "bg-slate-100 text-slate-700",
                      )}>
                        {ENROLLMENT_STATUS_LABELS[enrollment]}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{displayName(pid)}</span>
                      {m?.generation && <Badge variant="secondary" className="text-[10px]">{m.generation}기</Badge>}
                      {isLeaderRow && (
                        <Badge className="bg-amber-50 text-amber-700 text-[10px]">
                          {type === "study" ? "모임장" : "담당자"}
                        </Badge>
                      )}
                      {isGuest && guest && (
                        <span className="text-[10px] text-muted-foreground">
                          추가일 {new Date(guest.addedAt).toLocaleDateString("ko-KR")}
                        </span>
                      )}
                    </div>
                    {note && (
                      <p className="mt-1 text-[11px] text-muted-foreground italic">메모: {note}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {m?.studentId ?? (isGuest ? "비회원" : "-")}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {role ? (
                      <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    {m?.phone ?? "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground truncate max-w-[200px]">
                    {m?.email ?? "-"}
                  </td>
                  {canManageParticipants && (
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {/* 신청 상태 변경은 activity_applicants 클라이언트 트랜잭션을 쓰므로
                            staff 전용 (firestore.rules 상 비-staff 는 write 불가).
                            비-staff 모임장은 메모·제외만 가능. */}
                        {applicant && isStaff && (
                          <select
                            value={status ?? "pending"}
                            onChange={(e) => updateParticipantStatusMutation.mutate({
                              pid,
                              status: e.target.value as "approved" | "rejected" | "pending",
                            })}
                            className="rounded border bg-background px-1.5 py-1 text-[11px]"
                            title="신청 상태 변경"
                          >
                            <option value="pending">대기</option>
                            <option value="approved">승인</option>
                            <option value="rejected">거절</option>
                          </select>
                        )}
                        <button
                          onClick={() => {
                            setNoteInput(note ?? "");
                            setNoteDialog({ pid, name: displayName(pid) });
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-primary"
                          title="메모"
                        >
                          <Pencil size={13} />
                        </button>
                        {!isLeaderRow && (
                          <button
                            onClick={() => {
                              if (confirm("참여에서 제외하시겠습니까?")) removeParticipantMutation.mutate(pid);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-red-500"
                            title="제외"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            };

            const tableHead = (
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">신분유형</th>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">학번</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">핸드폰 번호</th>
                  <th className="px-3 py-2 font-medium">이메일</th>
                  {canManageParticipants && <th className="px-3 py-2 font-medium text-right">관리</th>}
                </tr>
              </thead>
            );

            if (activeTab === "staff") {
              return (
                <div className="space-y-3">
                  {/* 운영진 직접 추가 — 회원 검색 → 추가(기본 역할 "운영진" 자동 부여) → 역할 다이얼로그 자동 오픈 */}
                  {canManageParticipants && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
                      <h3 className="text-sm font-semibold flex items-center gap-1 text-amber-900">
                        <UserCog size={14} />운영진 추가
                      </h3>
                      <p className="text-xs text-amber-900/80">
                        {type === "external"
                          ? "학술대회 운영진(담당자·발표자·진행자·자원봉사 등)을 회원에서 검색하여 직접 추가합니다."
                          : "운영진(담당자·발표자·기록자 등)을 회원에서 검색하여 직접 추가합니다."}
                        {" "}추가 즉시 기본 역할 <strong>"운영진"</strong>이 자동 부여되며, 필요 시 세부 역할을 변경할 수 있습니다.
                      </p>
                      <MemberAutocomplete
                        value=""
                        onSelect={(m) => addStaffMutation.mutate(m.id)}
                        excludeIds={participants}
                        placeholder="회원 이름 또는 학번으로 검색하여 운영진 추가"
                      />
                      {/* 비회원 운영진 추가 — 회원 DB에 없는 외부 인사를 이름만으로 추가 */}
                      <div className="rounded-lg border border-amber-200 bg-card/70 p-3">
                        <p className="mb-2 text-xs font-medium text-amber-900">
                          회원으로 검색되지 않는 외부 인사 추가 (비회원)
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={guestStaffName}
                            onChange={(e) => setGuestStaffName(e.target.value)}
                            placeholder="예: 홍길동 교수 (외부 발표자)"
                            className="h-9 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && guestStaffName.trim()) {
                                e.preventDefault();
                                addGuestParticipantMutation.mutate({ name: guestStaffName, asStaff: true });
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            className="h-9 gap-1 whitespace-nowrap"
                            disabled={!guestStaffName.trim() || addGuestParticipantMutation.isPending}
                            onClick={() => addGuestParticipantMutation.mutate({ name: guestStaffName, asStaff: true })}
                          >
                            <UserPlus size={13} />이름만으로 추가
                          </Button>
                        </div>
                        <p className="mt-1.5 text-[11px] text-amber-900/70">
                          학번·이메일 등 추가 정보 없이 이름만 등록됩니다. 추가 후 메모 또는 역할에 추가 정보를 기재할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 기존 참여자에 역할 부여 — 참여자 탭에서 추가된 일반 참가자에게 역할을 부여하면 운영진으로 승격 */}
                  {canManageParticipants && participants.length > 0 && (
                    <div className="rounded-2xl border bg-card p-4">
                      <h3 className="mb-2 text-sm font-semibold flex items-center gap-1">
                        <Pencil size={14} />기존 참여자 역할 부여
                      </h3>
                      <p className="mb-2 text-xs text-muted-foreground">
                        참여자 탭에서 추가된 회원에게 역할을 부여하면 자동으로 <strong>운영진</strong>으로 분류됩니다.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {participants.map((pid) => {
                          const role = participantRoles[pid];
                          const isGuest = isGuestPid(pid);
                          return (
                            <button
                              key={`role-${pid}`}
                              onClick={() => {
                                setRoleInput(role ?? "");
                                setRoleDialog({ pid, name: displayName(pid) });
                              }}
                              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-muted/50"
                            >
                              <span className="font-medium">{displayName(pid)}</span>
                              {isGuest && <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px]">비회원</Badge>}
                              {role
                                ? <Badge variant="secondary" className="bg-sky-50 text-sky-700 text-[10px]">{role}</Badge>
                                : <span className="text-muted-foreground">+ 역할</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 운영진 테이블 */}
                  <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="flex items-center gap-2 border-b bg-amber-50/60 px-4 py-2.5">
                      <UserCog size={14} className="text-amber-700" />
                      <h3 className="text-sm font-semibold text-amber-900">운영진 ({staffPids.length})</h3>
                      <span className="text-[11px] text-muted-foreground">담당자 · 역할 보유자</span>
                    </div>
                    {staffPids.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">등록된 운영진이 없습니다.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                          {tableHead}
                          <tbody className="divide-y">{staffPids.map(renderRow)}</tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 연동된 운영 업무 — MyTodosWidget 학술활동 탭에서 추가된 admin_todos 표시 (양방향) */}
                  <ActivityConnectedTodos activityId={activityId} />
                </div>
              );
            }

            // activeTab === "participants" — 일반 참가자만
            return (
              <div className="space-y-3">
                {canManageParticipants && (
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1">
                      <UserPlus size={14} />참가자 추가
                    </h3>
                    <MemberAutocomplete
                      value=""
                      onSelect={(m) => addParticipantMutation.mutate(m.id)}
                      excludeIds={participants}
                      placeholder="회원 이름 또는 학번으로 검색"
                    />
                    <p className="text-xs text-muted-foreground">
                      {type === "study" && isLeader ? "모임장 권한으로 참여자를 추가할 수 있습니다." : "운영진 권한으로 참여자를 추가/제거할 수 있습니다. 역할을 부여하면 운영진 탭으로 이동합니다."}
                    </p>
                    {/* 비회원 참가자 추가 — 회원 DB에 없는 외부 인원을 이름만으로 추가 */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <p className="mb-2 text-xs font-medium text-slate-700">
                        회원으로 검색되지 않는 사람 추가 (비회원)
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={guestParticipantName}
                          onChange={(e) => setGuestParticipantName(e.target.value)}
                          placeholder="예: 김철수 (외부 참석자)"
                          className="h-9 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && guestParticipantName.trim()) {
                              e.preventDefault();
                              addGuestParticipantMutation.mutate({ name: guestParticipantName, asStaff: false });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 gap-1 whitespace-nowrap"
                          disabled={!guestParticipantName.trim() || addGuestParticipantMutation.isPending}
                          onClick={() => addGuestParticipantMutation.mutate({ name: guestParticipantName, asStaff: false })}
                        >
                          <UserPlus size={13} />이름만으로 추가
                        </Button>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        학번·이메일 등 추가 정보 없이 이름만 등록됩니다.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2.5">
                    <Users size={14} className="text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-700">일반 참가자 ({regularPids.length})</h3>
                  </div>
                  {regularPids.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">일반 참가자가 없습니다.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-sm">
                        {tableHead}
                        <tbody className="divide-y">{regularPids.map(renderRow)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Sprint 67: 내 일정 탭 — 외부 학술대회 본인 plans 모아보기 */}
          {activeTab === "my-sessions" && type === "external" && user && (
            <MyActivitySessionsTab activityId={activityId} userId={user.id} />
          )}

          {activeTab === "applicants" && (() => {
            const filtered = type === "external" && applicantsTypeFilter !== "all"
              ? applicants.filter((a) => (a.participantType ?? "attendee") === applicantsTypeFilter)
              : applicants;
            const counts = {
              all: applicants.length,
              speaker: applicants.filter((a) => a.participantType === "speaker").length,
              volunteer: applicants.filter((a) => a.participantType === "volunteer").length,
              attendee: applicants.filter((a) => (a.participantType ?? "attendee") === "attendee").length,
            };
            return (
            <div className="space-y-3">
              {type === "external" && applicants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-2xl border bg-card p-2">
                  {([
                    { v: "all" as const, label: "전체", count: counts.all },
                    { v: "speaker" as const, label: "발표자", count: counts.speaker },
                    { v: "volunteer" as const, label: "자원봉사자", count: counts.volunteer },
                    { v: "attendee" as const, label: "참석", count: counts.attendee },
                  ]).map((opt) => {
                    const active = applicantsTypeFilter === opt.v;
                    const colorCls = opt.v !== "all" ? EXTERNAL_PARTICIPANT_TYPE_COLORS[opt.v] : "";
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setApplicantsTypeFilter(opt.v)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? opt.v === "all"
                              ? "bg-primary text-primary-foreground"
                              : `${colorCls} ring-2 ring-current ring-offset-1`
                            : "text-slate-600 hover:bg-muted/60",
                        )}
                      >
                        {opt.label} <span className="ml-1 opacity-70">{opt.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {isStaff && filtered.length > 0 && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">총 {filtered.length}명</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      try {
                        // 신청현황 CSV — 이름·학번·이메일·핸드폰번호 + 폼 질문별 답변 컬럼 (가로형 1인 1행)
                        const questionFields: FormField[] = [];
                        const seenFieldIds = new Set<string>();
                        for (const f of [
                          ...applicationForm,
                          ...(Object.values(applicationFormByType).flat() as FormField[]),
                        ]) {
                          if (f.type === "section_break") continue;
                          if (seenFieldIds.has(f.id)) continue;
                          seenFieldIds.add(f.id);
                          questionFields.push(f);
                        }
                        const STATUS_LABEL: Record<string, string> = {
                          pending: "대기",
                          approved: "승인",
                          rejected: "거절",
                        };
                        const csvCell = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                        const fmtAnswer = (field: FormField, rawValue: unknown): string => {
                          if (rawValue === undefined || rawValue === null || rawValue === "") return "";

                          // schedule / datetime_slots — 다른 분기보다 먼저 처리해야
                          // 객체 배열 저장 케이스(레거시/직접 저장)에서 누락되지 않음.
                          if (field.type === "schedule" || field.type === "datetime_slots") {
                            if (rawValue === "__ALL__") return "전체 시간 가능";
                            if (rawValue === "__RESTRICTED__") return "참여 제한";

                            type Slot = { date?: string; start?: string; end?: string };
                            let slots: Slot[] = [];

                            if (typeof rawValue === "string") {
                              try {
                                const parsed = JSON.parse(rawValue);
                                if (Array.isArray(parsed)) slots = parsed as Slot[];
                                else return String(rawValue);
                              } catch {
                                return String(rawValue);
                              }
                            } else if (Array.isArray(rawValue)) {
                              slots = rawValue as Slot[];
                            } else {
                              return String(rawValue);
                            }

                            if (slots.length === 0) return "(선택된 시간 없음)";

                            return slots
                              .map((s) => {
                                const date = s.date ?? "";
                                const start = s.start ?? "";
                                const end = s.end ?? "";
                                if (!date && !start && !end) return "";
                                if (start && end) return `${date} ${start}-${end}`.trim();
                                return date.trim();
                              })
                              .filter(Boolean)
                              .join(" / ");
                          }

                          if (Array.isArray(rawValue)) {
                            if (rawValue.length === 0) return "";
                            if (typeof rawValue[0] === "object") {
                              return (rawValue as { name: string }[]).map((f) => f.name).join(" / ");
                            }
                            return (rawValue as string[]).join(", ");
                          }
                          return String(rawValue);
                        };
                        const headerCols = [
                          "이름",
                          "학번",
                          "이메일",
                          "핸드폰번호",
                          ...(type === "external" ? ["참석유형"] : []),
                          "상태",
                          "신청일",
                          ...questionFields.map((f) => f.label),
                        ];
                        const dataRows = filtered.map((a) => {
                          const cells = [
                            a.name,
                            a.studentId ?? "",
                            a.email ?? "",
                            a.phone ?? "",
                            ...(type === "external"
                              ? [
                                  EXTERNAL_PARTICIPANT_TYPE_LABELS[
                                    (a.participantType ?? "attendee") as ExternalParticipantType
                                  ],
                                ]
                              : []),
                            STATUS_LABEL[a.status] ?? a.status ?? "대기",
                            formatAppliedAt(a.appliedAt),
                            ...questionFields.map((f) =>
                              fmtAnswer(f, a.answers?.[f.id] ?? a.answers?.[f.label]),
                            ),
                          ];
                          return cells.map(csvCell).join(",");
                        });
                        const csv =
                          "﻿" + [headerCols.map(csvCell).join(","), ...dataRows].join("\r\n");
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const el = document.createElement("a");
                        const today = new Date().toISOString().slice(0, 10);
                        el.href = url;
                        el.download = `${activity?.title ?? "활동"}_신청현황_${today}.csv`;
                        // 일부 브라우저는 DOM에 붙지 않은 <a>.click() 을 무시함 — 명시적 append/remove
                        document.body.appendChild(el);
                        el.click();
                        el.remove();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("[csv-export]", err);
                        toast.error(`CSV 내보내기 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
                      }
                    }}
                  >
                    <Download size={13} />
                    CSV 내보내기
                  </Button>
                </div>
              )}
              <div className="rounded-2xl border bg-card">
              {/* Sprint UX-3: pending 일괄 선택 액션 바 */}
              {isStaff && (() => {
                const selectableKeys = filtered
                  .filter((a) => (a.status ?? "pending") !== "approved" && a.status !== "rejected" && (a.userId ?? a.guestKey))
                  .map((a) => (a.userId ?? a.guestKey) as string);
                if (selectableKeys.length === 0) return null;
                const allSelected = selectableKeys.every((k) => selectedApplicantKeys.includes(k));
                return (
                  <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={allSelected}
                        onChange={() =>
                          setSelectedApplicantKeys(allSelected ? [] : selectableKeys)
                        }
                      />
                      대기 전체 선택 ({selectableKeys.length}명)
                    </label>
                    {selectedApplicantKeys.length > 0 && (
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={bulkApplicantMutation.isPending}
                          onClick={() => {
                            if (!confirm(`선택한 ${selectedApplicantKeys.length}명을 일괄 승인하시겠습니까?`)) return;
                            bulkApplicantMutation.mutate({ keys: selectedApplicantKeys, status: "approved" });
                          }}
                        >
                          <CheckCircle size={12} />선택 {selectedApplicantKeys.length}명 승인
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs text-destructive"
                          disabled={bulkApplicantMutation.isPending}
                          onClick={() => {
                            const action = type === "external" ? "신청 취소" : "거절";
                            if (!confirm(`선택한 ${selectedApplicantKeys.length}명을 일괄 ${action} 처리하시겠습니까?`)) return;
                            bulkApplicantMutation.mutate({ keys: selectedApplicantKeys, status: "rejected" });
                          }}
                        >
                          <XCircle size={12} />선택 {type === "external" ? "취소" : "거절"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {applicants.length === 0 ? "신청 내역이 없습니다." : "해당 유형의 신청자가 없습니다."}
                </p>
              ) : (
                <div className="divide-y">
                  {filtered.map((a) => {
                    const key = a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`;
                    const isSpeaker = type === "external" && a.participantType === "speaker";
                    // status 필드가 없는 옛 신청 데이터는 "pending" 으로 간주 (승인 컨트롤이 누락되는 버그 방지)
                    const effectiveStatus: "approved" | "rejected" | "pending" =
                      a.status === "approved" || a.status === "rejected" ? a.status : "pending";
                    const selectableKey = a.userId ?? a.guestKey;
                    return (
                    <div key={key} className="flex flex-col gap-1.5 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        {isStaff && effectiveStatus === "pending" && selectableKey && (
                          <input
                            type="checkbox"
                            className="mr-2 h-4 w-4 translate-y-0.5 accent-primary"
                            aria-label={`${a.name} 선택`}
                            checked={selectedApplicantKeys.includes(selectableKey)}
                            onChange={(e) =>
                              setSelectedApplicantKeys((prev) =>
                                e.target.checked
                                  ? [...prev, selectableKey]
                                  : prev.filter((k) => k !== selectableKey),
                              )
                            }
                          />
                        )}
                        <span className="font-medium">{a.name}</span>
                        {type === "external" && (
                          <Badge variant="secondary" className={cn("ml-2 text-[10px]", EXTERNAL_PARTICIPANT_TYPE_COLORS[(a.participantType ?? "attendee") as ExternalParticipantType])}>
                            {EXTERNAL_PARTICIPANT_TYPE_LABELS[(a.participantType ?? "attendee") as ExternalParticipantType]}
                          </Badge>
                        )}
                        {isSpeaker && a.speakerSubmissionType && (
                          <Badge variant="secondary" className={cn("ml-1 text-[10px]", SPEAKER_SUBMISSION_TYPE_COLORS[a.speakerSubmissionType as SpeakerSubmissionType])}>
                            {SPEAKER_SUBMISSION_TYPE_LABELS[a.speakerSubmissionType as SpeakerSubmissionType]}
                          </Badge>
                        )}
                        {a.isGuest && <Badge variant="secondary" className="ml-2 bg-slate-100 text-[10px] text-slate-600">비회원</Badge>}
                        {a.studentId && <span className="ml-2 text-xs text-muted-foreground">{a.studentId}</span>}
                        {a.email && isStaff && <span className="ml-2 text-xs text-muted-foreground">{a.email}</span>}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatAppliedAt(a.appliedAt)}
                        </span>
                        {isSpeaker && a.speakerPaperTitle && (
                          <p className="mt-1 truncate text-xs text-slate-600">
                            <span className="font-medium text-slate-500">제목:</span> {a.speakerPaperTitle}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:self-start">
                        {isStaff && (
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => openEditApplication(a)}>
                            <Pencil size={12} />수정
                          </Button>
                        )}
                        {effectiveStatus === "pending" && isStaff && (
                          <>
                            <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => updateApplicantMutation.mutate({ key, status: "approved" })}>
                              <CheckCircle size={12} />승인
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-xs text-destructive"
                              onClick={() => {
                                if (type === "external") {
                                  if (!confirm(`${a.name}님의 신청을 취소하시겠습니까?\n신청현황에서 제거됩니다.`)) return;
                                }
                                updateApplicantMutation.mutate({ key, status: "rejected" });
                              }}
                            >
                              <XCircle size={12} />{type === "external" ? "신청 취소" : "거절"}
                            </Button>
                          </>
                        )}
                        {effectiveStatus === "approved" && (
                          <>
                            <Badge className="bg-green-50 text-green-700 text-[10px]">승인</Badge>
                            {isStaff && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs text-destructive"
                                onClick={() => {
                                  const msg = type === "external"
                                    ? `${a.name}님의 승인을 취소하시겠습니까?\n참여자 목록과 신청 현황에서 모두 제거됩니다.`
                                    : `${a.name}님의 승인을 취소하시겠습니까?\n참여자 목록에서 제거되고 신청은 거절 상태로 변경됩니다.`;
                                  if (!confirm(msg)) return;
                                  updateApplicantMutation.mutate({ key, status: "rejected" });
                                }}
                              >
                                <XCircle size={12} />승인 취소
                              </Button>
                            )}
                          </>
                        )}
                        {effectiveStatus === "rejected" && (
                          <>
                            <Badge className="bg-red-50 text-red-700 text-[10px]">거절</Badge>
                            {isStaff && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  if (!confirm(`${a.name}님의 거절 이력을 삭제하시겠습니까?\n신청현황에서 완전히 제거됩니다.`)) return;
                                  deleteApplicantMutation.mutate({ key });
                                }}
                              >
                                <Trash2 size={12} />이력 삭제
                              </Button>
                            )}
                          </>
                        )}
                        {effectiveStatus === "pending" && !isStaff && <Badge className="bg-amber-50 text-amber-700 text-[10px]">대기</Badge>}
                      </div>
                    </div>
                  );})}
                </div>
              )}
              </div>
            </div>
            );
          })()}

          {activeTab === "presenters" && (() => {
            // data-split: staff 는 실제 speaker applicants(PII 포함), 비-staff 는 publicSpeakers(비-PII).
            type PresenterRow = {
              name: string;
              studentId?: string;
              speakerSubmissionType?: SpeakerSubmissionType;
              speakerPaperTitle?: string;
              status?: "approved" | "rejected" | "pending";
            };
            const list: PresenterRow[] = isStaff
              ? speakerApplicants.map((a) => ({
                  name: a.name,
                  studentId: a.studentId,
                  speakerSubmissionType: a.speakerSubmissionType,
                  speakerPaperTitle: a.speakerPaperTitle,
                  status: a.status,
                }))
              : publicSpeakers.map((s) => ({
                  name: s.name,
                  speakerSubmissionType: s.submissionType,
                  speakerPaperTitle: s.paperTitle,
                }));
            const counts = {
              all: list.length,
              paper: list.filter((a) => (a.speakerSubmissionType ?? "paper") === "paper").length,
              poster: list.filter((a) => a.speakerSubmissionType === "poster").length,
              media: list.filter((a) => a.speakerSubmissionType === "media").length,
              approved: list.filter((a) => a.status === "approved").length,
              pending: list.filter((a) => a.status === "pending").length,
              rejected: list.filter((a) => a.status === "rejected").length,
            };
            const sorted = [...list].sort((a, b) => {
              const sa = a.speakerSubmissionType ?? "paper";
              const sb = b.speakerSubmissionType ?? "paper";
              if (sa !== sb) {
                const order: Record<SpeakerSubmissionType, number> = { paper: 0, poster: 1, media: 2 };
                return order[sa as SpeakerSubmissionType] - order[sb as SpeakerSubmissionType];
              }
              return (a.name || "").localeCompare(b.name || "");
            });
            // 발표 구분(논문·포스터·미디어전) 필터 적용
            const visible = sorted.filter(
              (a) =>
                presentersTypeFilter === "all" ||
                (a.speakerSubmissionType ?? "paper") === presentersTypeFilter,
            );
            return (
              <div className="space-y-3">
                <div className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
                    {([
                      { v: "all" as const, label: "전체", count: counts.all, cls: "bg-slate-100 text-slate-700" },
                      { v: "paper" as const, label: SPEAKER_SUBMISSION_TYPE_LABELS.paper, count: counts.paper, cls: SPEAKER_SUBMISSION_TYPE_COLORS.paper },
                      { v: "poster" as const, label: SPEAKER_SUBMISSION_TYPE_LABELS.poster, count: counts.poster, cls: SPEAKER_SUBMISSION_TYPE_COLORS.poster },
                      { v: "media" as const, label: SPEAKER_SUBMISSION_TYPE_LABELS.media, count: counts.media, cls: SPEAKER_SUBMISSION_TYPE_COLORS.media },
                    ]).map((opt) => {
                      const active = presentersTypeFilter === opt.v;
                      return (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setPresentersTypeFilter(opt.v)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-full px-2.5 py-1 font-medium transition-all",
                            opt.cls,
                            active ? "ring-2 ring-current ring-offset-1" : "opacity-55 hover:opacity-90",
                          )}
                        >
                          {opt.label} {opt.count}
                        </button>
                      );
                    })}
                    {isStaff && (
                      <span className="ml-auto text-muted-foreground">
                        승인 {counts.approved} · 대기 {counts.pending} · 반려 {counts.rejected}
                      </span>
                    )}
                  </div>
                  {sorted.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                      아직 발표자 신청이 없습니다.
                    </p>
                  ) : visible.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                      해당 발표 구분의 발표자가 없습니다.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                          <tr>
                            <th className="w-[110px] px-3 py-2 text-left font-medium">발표 구분</th>
                            <th className="w-[180px] px-3 py-2 text-left font-medium">발표자</th>
                            <th className="px-3 py-2 text-left font-medium">논문 제목</th>
                            {isStaff && <th className="w-[88px] px-3 py-2 text-left font-medium">상태</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {visible.map((a, idx) => {
                            const sub = (a.speakerSubmissionType ?? "paper") as SpeakerSubmissionType;
                            return (
                              <tr key={`presenter-${a.name}-${sub}-${idx}`} className="align-top hover:bg-muted/20">
                                <td className="px-3 py-2.5">
                                  <Badge className={`${SPEAKER_SUBMISSION_TYPE_COLORS[sub]} text-xs`}>
                                    {SPEAKER_SUBMISSION_TYPE_LABELS[sub]}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium leading-snug">{a.name || "익명"}</span>
                                    {a.studentId && (
                                      <span className="text-[11px] text-muted-foreground">{a.studentId}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  {a.speakerPaperTitle ? (
                                    <span className="leading-snug">{a.speakerPaperTitle}</span>
                                  ) : (
                                    <span className="text-muted-foreground">미제출</span>
                                  )}
                                </td>
                                {isStaff && (
                                  <td className="px-3 py-2.5">
                                    <Badge
                                      className={cn(
                                        "text-[11px]",
                                        a.status === "approved" && "bg-green-50 text-green-700",
                                        a.status === "pending" && "bg-amber-50 text-amber-700",
                                        a.status === "rejected" && "bg-red-50 text-red-700",
                                      )}
                                    >
                                      {a.status === "approved" ? "승인" : a.status === "pending" ? "대기" : "반려"}
                                    </Badge>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === "volunteers" && (() => {
            const list = volunteerApplicants;
            const counts = {
              all: list.length,
              approved: list.filter((a) => a.status === "approved").length,
              pending: list.filter((a) => a.status === "pending").length,
              rejected: list.filter((a) => a.status === "rejected").length,
            };
            const sorted = [...list].sort((a, b) => {
              const sa = a.status === "approved" ? 0 : a.status === "pending" ? 1 : 2;
              const sb = b.status === "approved" ? 0 : b.status === "pending" ? 1 : 2;
              if (sa !== sb) return sa - sb;
              return (a.appliedAt || "").localeCompare(b.appliedAt || "");
            });
            return (
              <div className="space-y-3">
                <div className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge className="bg-slate-100 text-slate-700">전체 {counts.all}</Badge>
                    <Badge className={EXTERNAL_PARTICIPANT_TYPE_COLORS.volunteer}>{EXTERNAL_PARTICIPANT_TYPE_LABELS.volunteer}</Badge>
                    <span className="ml-auto text-muted-foreground">
                      승인 {counts.approved} · 대기 {counts.pending} · 반려 {counts.rejected}
                    </span>
                  </div>
                  {sorted.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                      아직 자원봉사자 신청이 없습니다.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                          <tr>
                            <th className="w-[180px] px-3 py-2 text-left font-medium">자원봉사자</th>
                            <th className="w-[120px] px-3 py-2 text-left font-medium">학번</th>
                            <th className="px-3 py-2 text-left font-medium">신청일</th>
                            <th className="w-[88px] px-3 py-2 text-left font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sorted.map((a) => (
                            <tr key={`${a.userId ?? a.guestKey ?? a.email ?? a.name}-${a.appliedAt}`} className="align-top hover:bg-muted/20">
                              <td className="px-3 py-2.5">
                                <span className="font-medium leading-snug">{a.name || "익명"}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                {a.studentId ? (
                                  <span className="text-xs text-muted-foreground">{a.studentId}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground/60">—</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="text-xs text-muted-foreground">
                                  {formatAppliedAt(a.appliedAt)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge
                                  className={cn(
                                    "text-[11px]",
                                    a.status === "approved" && "bg-green-50 text-green-700",
                                    a.status === "pending" && "bg-amber-50 text-amber-700",
                                    a.status === "rejected" && "bg-red-50 text-red-700",
                                  )}
                                >
                                  {a.status === "approved" ? "승인" : a.status === "pending" ? "대기" : "반려"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === "form-settings" && isStaff && (
            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <div>
                <h3 className="font-semibold">신청 폼 빌더</h3>
                <p className="mt-1 text-xs text-muted-foreground">구글 폼처럼 단답·장문·객관식·체크박스·드롭다운·날짜·파일 업로드 등 다양한 질문을 구성할 수 있습니다.</p>
              </div>
              {type === "external" ? (
                <FormBuilderByType
                  commonForm={applicationForm}
                  onCommonChange={async (fields) => {
                    queryClient.setQueryData(["activity", activityId], (prev: unknown) => {
                      if (!prev || typeof prev !== "object") return prev;
                      return { ...(prev as Record<string, unknown>), applicationForm: fields };
                    });
                    try {
                      await activitiesApi.update(activityId, { applicationForm: fields });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "공통 폼 저장 실패");
                      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                    }
                  }}
                  enabledTypes={activity?.enabledParticipantTypes as ExternalParticipantType[] | undefined}
                  byType={(activity?.applicationFormByType ?? {}) as Partial<Record<ExternalParticipantType, FormField[]>>}
                  onByTypeChange={async (next) => {
                    queryClient.setQueryData(["activity", activityId], (prev: unknown) => {
                      if (!prev || typeof prev !== "object") return prev;
                      return { ...(prev as Record<string, unknown>), applicationFormByType: next };
                    });
                    try {
                      await activitiesApi.update(activityId, { applicationFormByType: next });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "유형별 폼 저장 실패");
                      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                    }
                  }}
                />
              ) : (
                <FormBuilder
                  value={applicationForm}
                  onChange={async (fields) => {
                    queryClient.setQueryData(["activity", activityId], (prev: unknown) => {
                      if (!prev || typeof prev !== "object") return prev;
                      return { ...(prev as Record<string, unknown>), applicationForm: fields };
                    });
                    try {
                      await activitiesApi.update(activityId, { applicationForm: fields });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "폼 저장 실패");
                      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                    }
                  }}
                />
              )}
            </div>
          )}

          {activeTab === "report" && isStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold">{reportStats.totalApplicants}</p>
                  <p className="text-xs text-muted-foreground">총 신청</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{reportStats.approved}</p>
                  <p className="text-xs text-muted-foreground">승인</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-red-500">{reportStats.rejected}</p>
                  <p className="text-xs text-muted-foreground">거절</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{reportStats.pending}</p>
                  <p className="text-xs text-muted-foreground">대기</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{reportStats.participants}</p>
                  <p className="text-xs text-muted-foreground">참여자</p>
                </div>
                <div className="rounded-lg border bg-card p-4 text-center">
                  <p className="text-2xl font-bold">{reportStats.approvalRate}%</p>
                  <p className="text-xs text-muted-foreground">승인율</p>
                </div>
              </div>

              {/* Sprint 67-AD: 후기 작성 진행률 + 통계 (external 만) */}
              {type === "external" && (
                <div className="rounded-2xl border bg-card p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">참석자 후기</p>
                    <p className="text-xs text-muted-foreground">
                      {attendeeReviews.length}건 / 참여자 {participants.length}명 (
                      {participants.length > 0
                        ? Math.round(
                            (attendeeReviews.length / participants.length) * 100,
                          )
                        : 0}
                      %)
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${
                          participants.length > 0
                            ? Math.min(
                                100,
                                Math.round(
                                  (attendeeReviews.length / participants.length) * 100,
                                ),
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  {attendeeReviews.length > 0 && (
                    <>
                      {/* 재참석 의사 분포 */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {(["yes", "maybe", "no"] as const).map((opt) => {
                          const count = attendeeReviews.filter(
                            (r) => r.willAttendAgain === opt,
                          ).length;
                          const labels = {
                            yes: { label: "꼭 다시", emoji: "🙌", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
                            maybe: { label: "기회되면", emoji: "🤔", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
                            no: { label: "당분간", emoji: "🥲", color: "bg-muted text-muted-foreground" },
                          } as const;
                          return (
                            <div
                              key={opt}
                              className={cn("rounded-md p-2 text-center text-xs", labels[opt].color)}
                            >
                              <p className="text-base">{labels[opt].emoji}</p>
                              <p className="font-semibold">{count}</p>
                              <p className="text-[10px] opacity-80">
                                {labels[opt].label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      {/* 평균 별점 */}
                      {(() => {
                        const ratings = attendeeReviews
                          .map((r) => r.overallRating)
                          .filter((v): v is number => typeof v === "number" && v > 0);
                        if (ratings.length === 0) return null;
                        const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
                        return (
                          <div className="flex items-center justify-between border-t pt-2 text-xs">
                            <span className="text-muted-foreground">평균 별점</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              ⭐ {avg.toFixed(1)} / 5 ({ratings.length}명 응답)
                            </span>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {type === "external" && applicants.length > 0 && (
                <div className="rounded-2xl border bg-card p-4">
                  <p className="mb-2 text-sm font-semibold">참석 유형별 신청</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["speaker", "volunteer", "attendee"] as const).map((t) => {
                      const count = applicants.filter((a) => (a.participantType ?? "attendee") === t).length;
                      return (
                        <div key={t} className={cn("rounded-lg p-3 text-center", EXTERNAL_PARTICIPANT_TYPE_COLORS[t])}>
                          <p className="text-xs">{EXTERNAL_PARTICIPANT_TYPE_LABELS[t]}</p>
                          <p className="text-xl font-bold">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {type === "external" && (() => {
                const speakers = applicants.filter((a) => a.participantType === "speaker");
                if (speakers.length === 0) return null;
                const subCounts = (["paper", "poster", "media"] as const).map((s) => ({
                  s, count: speakers.filter((a) => a.speakerSubmissionType === s).length,
                }));
                return (
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">발표자 신청 현황 ({speakers.length})</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {subCounts.map(({ s, count }) => (
                        <div key={s} className={cn("rounded-lg p-2.5 text-center", SPEAKER_SUBMISSION_TYPE_COLORS[s])}>
                          <p className="text-[11px]">{SPEAKER_SUBMISSION_TYPE_LABELS[s]}</p>
                          <p className="text-lg font-bold">{count}</p>
                        </div>
                      ))}
                    </div>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full min-w-[560px] text-xs">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr className="text-left">
                            <th className="px-3 py-2 font-medium">이름</th>
                            <th className="px-3 py-2 font-medium">발표 유형</th>
                            <th className="px-3 py-2 font-medium">제목</th>
                            <th className="px-3 py-2 font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {speakers.map((a) => {
                            const k = a.userId ?? a.guestKey ?? `${a.name}-${a.appliedAt}`;
                            return (
                              <tr key={k}>
                                <td className="px-3 py-2 font-medium">{a.name}</td>
                                <td className="px-3 py-2">
                                  {a.speakerSubmissionType
                                    ? <Badge variant="secondary" className={cn("text-[10px]", SPEAKER_SUBMISSION_TYPE_COLORS[a.speakerSubmissionType as SpeakerSubmissionType])}>{SPEAKER_SUBMISSION_TYPE_LABELS[a.speakerSubmissionType as SpeakerSubmissionType]}</Badge>
                                    : <span className="text-muted-foreground">미지정</span>}
                                </td>
                                <td className="px-3 py-2 text-slate-700">{a.speakerPaperTitle ?? <span className="text-muted-foreground">—</span>}</td>
                                <td className="px-3 py-2">{a.status === "approved" ? "승인" : a.status === "rejected" ? "거절" : "대기"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* 신청 답변 요약 — 공통 + 유형별 폼 모두 순회 (Sprint 70). 선택형은 그룹핑·카운트, 자유텍스트는 카드 */}
              {(() => {
                const allFormFields: FormField[] = [
                  ...applicationForm,
                  ...Object.values(applicationFormByType).flat() as FormField[],
                ];
                return allFormFields.length > 0 && applicants.length > 0;
              })() && (
                <div className="rounded-2xl border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">신청 답변 요약</h3>
                    <span className="text-xs text-muted-foreground">총 {applicants.length}명</span>
                  </div>
                  {[
                    ...applicationForm,
                    ...Object.values(applicationFormByType).flat() as FormField[],
                  ].map((field) => {
                    // 답변 추출 + 정규화
                    const rawAnswers = applicants
                      .map((a) => ({
                        name: a.name,
                        v: a.answers?.[field.id] ?? a.answers?.[field.label],
                      }))
                      .filter((x) => x.v !== undefined && x.v !== "");

                    // 그룹핑 가능 type: radio/select/checkbox
                    const isGroupable =
                      field.type === "radio" ||
                      field.type === "select" ||
                      field.type === "checkbox";

                    // 자유텍스트로 표시할 type
                    const isFreeText =
                      field.type === "short_text" ||
                      field.type === "long_text" ||
                      field.type === "email" ||
                      field.type === "phone" ||
                      field.type === "url";

                    // 답변별 그룹핑 (radio/select/checkbox)
                    type Group = { option: string; count: number; names: string[] };
                    let groups: Group[] = [];
                    if (isGroupable) {
                      const groupMap = new Map<string, Group>();
                      for (const a of rawAnswers) {
                        const values: string[] = Array.isArray(a.v)
                          ? (a.v as string[])
                          : [String(a.v)];
                        for (const opt of values) {
                          const key = opt;
                          const existing = groupMap.get(key);
                          if (existing) {
                            existing.count++;
                            existing.names.push(a.name);
                          } else {
                            groupMap.set(key, { option: key, count: 1, names: [a.name] });
                          }
                        }
                      }
                      groups = Array.from(groupMap.values()).sort((a, b) => b.count - a.count);
                    }

                    return (
                      <div key={field.id} className="mt-5 border-t border-border/60 pt-4 first:mt-3 first:border-t-0 first:pt-0">
                        <p className="text-sm font-semibold text-primary">{field.label}</p>
                        {rawAnswers.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">답변 없음</p>
                        ) : isGroupable ? (
                          <div className="mt-2 space-y-2">
                            {groups.map((g) => {
                              const ratio = Math.round((g.count / applicants.length) * 100);
                              return (
                                <div
                                  key={g.option}
                                  className="rounded-lg border bg-muted/30 p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium">{g.option}</span>
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-bold text-primary">
                                        {g.count}명
                                      </span>
                                      <span className="text-muted-foreground">{ratio}%</span>
                                    </span>
                                  </div>
                                  {/* 막대그래프 */}
                                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full bg-primary/70 transition-all"
                                      style={{ width: `${ratio}%` }}
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {g.names.map((n, i) => (
                                      <span
                                        key={`${n}-${i}`}
                                        className="inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] text-foreground"
                                      >
                                        {n}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : isFreeText ? (
                          <div className="mt-2 space-y-2">
                            {rawAnswers.map((a, i) => (
                              <div
                                key={i}
                                className="rounded-lg border-l-4 border-primary/40 bg-muted/30 px-3 py-2 text-sm"
                              >
                                <div className="mb-1 inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
                                  {a.name}
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                                  {String(a.v)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // 기타 type (date/time/file/schedule 등) — 기본 표시
                          <div className="mt-2 space-y-1">
                            {rawAnswers.map((a, i) => {
                              let display: string;
                              if (Array.isArray(a.v)) {
                                display = typeof (a.v as unknown[])[0] === "string"
                                  ? (a.v as string[]).join(", ")
                                  : `${(a.v as { name: string }[]).length}개 파일 첨부`;
                              } else if ((field.type === "schedule" || field.type === "datetime_slots") && typeof a.v === "string") {
                                if (a.v === "__ALL__") {
                                  display = "전체 시간 가능";
                                } else if (a.v === "__RESTRICTED__") {
                                  display = "참여 제한";
                                } else {
                                  try {
                                    const slots = JSON.parse(a.v) as { date: string; start: string; end: string }[];
                                    display = slots.length === 0
                                      ? "(선택 없음)"
                                      : slots.map((s) => `${s.date} ${s.start}-${s.end}`).join(", ");
                                  } catch {
                                    display = String(a.v);
                                  }
                                }
                              } else {
                                display = String(a.v);
                              }
                              return (
                                <div key={i} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                                  <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground">
                                    {a.name}
                                  </span>
                                  <span className="ml-2">{display}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 참여자 목록 CSV 내보내기 */}
              <Button variant="outline" size="sm" onClick={() => {
                try {
                  const bom = "\uFEFF";
                  const header = type === "external" ? "이름,학번,참석유형,발표유형,논문제목,상태,신청일\n" : "이름,학번,상태,신청일\n";
                  const rows = applicants.map((a) => type === "external"
                    ? `"${a.name}","${a.studentId ?? ""}","${EXTERNAL_PARTICIPANT_TYPE_LABELS[(a.participantType ?? "attendee") as ExternalParticipantType]}","${a.speakerSubmissionType ? SPEAKER_SUBMISSION_TYPE_LABELS[a.speakerSubmissionType as SpeakerSubmissionType] : ""}","${(a.speakerPaperTitle ?? "").replace(/"/g, '""')}","${a.status}","${formatAppliedAt(a.appliedAt)}"`
                    : `"${a.name}","${a.studentId ?? ""}","${a.status}","${formatAppliedAt(a.appliedAt)}"`).join("\n");
                  const blob = new Blob([bom + header + rows], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const el = document.createElement("a");
                  el.href = url;
                  el.download = `${activity?.title ?? "activity"}_리포트.csv`;
                  document.body.appendChild(el);
                  el.click();
                  el.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error("[csv-export]", err);
                  toast.error(`CSV 내보내기 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`);
                }
              }}>
                CSV 내보내기
              </Button>
            </div>
          )}

          {activeTab === "settings" && isStaff && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-6 space-y-4">
                <h3 className="font-semibold">참여자 등록 방식</h3>
                <select
                  value={registrationMethod}
                  onChange={async (e) => {
                    await activitiesApi.update(activityId, { registrationMethod: e.target.value as "open" | "manual" });
                    queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                    toast.success("등록 방식이 변경되었습니다.");
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="manual">수기 등록 (관리자/모임장이 직접 추가)</option>
                  <option value="open">공개 신청 (참가 신청을 받음)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  {registrationMethod === "open"
                    ? "공개 신청 모드: 참가 신청 버튼이 표시되며, 신청현황 탭에서 승인/거절할 수 있습니다."
                    : "수기 등록 모드: 참여자 탭에서 관리자 또는 모임장이 직접 회원을 추가합니다."}
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-6 space-y-3">
                <h3 className="font-semibold">완료 시 자동 발급</h3>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={activity.autoIssueCertificates !== false}
                    onChange={async (e) => {
                      try {
                        await activitiesApi.update(activityId, { autoIssueCertificates: e.target.checked });
                        queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
                        toast.success(e.target.checked ? "자동 발급이 켜졌습니다." : "자동 발급이 꺼졌습니다.");
                      } catch (err) {
                        console.error("[activity/auto-cert]", err);
                        toast.error(err instanceof Error ? `변경 실패: ${err.message}` : "변경에 실패했습니다.");
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium">
                      활동 종료 시 {type === "external" ? "참석확인서" : "수료증"} 자동 발급
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {type === "external"
                        ? "활동이 종료되면 승인된 신청자에게 참석확인서를 자동 발급합니다 (주관기관·일정 포함)."
                        : "활동이 종료되면 참여자에게 수료증을 자동 발급합니다 (활동 기간·역할 포함)."}
                      {" "}해제하면 운영자가 수동 발급해야 합니다.
                    </p>
                  </div>
                </label>
              </div>
              {/* 활동 정보 인라인 편집 (Sprint 67 요청) */}
              <ActivityInfoEditor
                activity={activity}
                isExternal={type === "external"}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["activity", activityId] })}
                onDeleted={() => router.push(backHref)}
              />
            </div>
          )}

          {/* Sprint 4 — 자료 아카이브 (study/project 전용) */}
          {activeTab === "archive" && (
            <StudyMaterialArchive progressList={progressList} />
          )}

          {/* Sprint 5 — 참여도 리포트 (study/project 전용, 운영진/리더) */}
          {activeTab === "study-report" && (isStaff || isLeader) && (
            <StudyParticipationReport
              activityId={activityId}
              activityTitle={activity.title}
              progressList={progressList}
              participantIds={participants}
              guestParticipants={guestParticipants}
              participantRoles={participantRoles}
              leaderId={leaderId}
            />
          )}
        </div>

        {/* 대외활동 참가 신청 Dialog — 섹션 단위 그룹화 + 여백 확대 */}
        <Dialog
          open={applyDialog}
          onOpenChange={(o) => {
            setApplyDialog(o);
            if (!o) setEditingApplicantKey(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold sm:text-xl">
                {editingApplicantKey ? "신청 정보 수정" : <>참가 신청{!user && " (비회원)"}</>}
              </DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">{activity?.title}</p>
            </DialogHeader>
            {!user && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-slate-700">
                비회원으로도 신청할 수 있습니다. 추후 <strong>동일한 학번(또는 이메일)</strong>으로 회원가입하시면 이번 신청 기록이 자동으로 회원 활동에 연동됩니다.
              </p>
            )}
            <div className="grid gap-4 sm:gap-5">
              {(() => {
                const allTypes = ["speaker", "volunteer", "attendee"] as const;
                const configured = activity?.enabledParticipantTypes;
                const enabledTypes = (configured && configured.length > 0)
                  ? allTypes.filter((t) => configured.includes(t))
                  : allTypes;
                const cols = enabledTypes.length === 1 ? "grid-cols-1" : enabledTypes.length === 2 ? "grid-cols-2" : "grid-cols-3";
                return (
                  <section>
                    <label className="mb-2.5 block text-sm font-semibold text-slate-800">참석 유형 <span className="text-red-500">*</span></label>
                    <div className={cn("grid gap-2", cols)}>
                      {enabledTypes.map((t) => {
                        const active = applyParticipantType === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setApplyParticipantType(t)}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-3.5 text-center transition-all",
                              active
                                ? `${EXTERNAL_PARTICIPANT_TYPE_COLORS[t]} border-current shadow-sm scale-[1.02]`
                                : "border-input bg-card text-slate-600 hover:border-primary/40 hover:bg-muted/50 dark:bg-card",
                            )}
                            aria-pressed={active}
                          >
                            <span className="text-sm font-bold sm:text-base">
                              {EXTERNAL_PARTICIPANT_TYPE_LABELS[t]}
                            </span>
                            {active && <span className="text-[10px]">선택됨</span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })()}

              {applyParticipantType === "speaker" && (
                <section className="space-y-4 rounded-2xl border-2 border-purple-200 bg-purple-50/40 p-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-800">
                      발표 유형 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["paper", "poster", "media"] as const).map((s) => {
                        const active = applySpeakerSubmissionType === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setApplySpeakerSubmissionType(s)}
                            className={cn(
                              "rounded-lg border-2 px-3 py-2.5 text-center text-sm font-medium transition-all",
                              active
                                ? `${SPEAKER_SUBMISSION_TYPE_COLORS[s]} border-current shadow-sm`
                                : "border-input bg-card text-slate-600 hover:border-primary/40",
                            )}
                            aria-pressed={active}
                          >
                            {SPEAKER_SUBMISSION_TYPE_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-800">
                      {applySpeakerSubmissionType === "media" ? "작품 제목" : "논문 제목"} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={applySpeakerPaperTitle}
                      onChange={(e) => setApplySpeakerPaperTitle(e.target.value)}
                      placeholder={applySpeakerSubmissionType === "media" ? "예: AI 기반 학습환경 인터랙션 데모" : "예: 교육공학 전공 대학원생의 학업 몰입 요인 탐색"}
                    />
                    <p className="text-[11px] text-muted-foreground">발표/심사 진행을 위한 식별용 제목입니다. 추후 운영진이 일괄 확인합니다.</p>
                  </div>
                </section>
              )}

              <section className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-slate-800">신청자 정보</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">이름 <span className="text-red-500">*</span></label>
                    <Input value={applyName} onChange={(e) => setApplyName(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">학번 {!user && <span className="text-red-500">*</span>}</label>
                    <Input value={applyStudentId} onChange={(e) => setApplyStudentId(e.target.value)} placeholder={!user ? "예: 2023432001" : undefined} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">이메일 {!user && <span className="text-red-500">*</span>}</label>
                    <Input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} placeholder="name@example.com" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-600">연락처</label>
                    <Input value={applyPhone} onChange={(e) => setApplyPhone(e.target.value)} placeholder="010-0000-0000" />
                  </div>
                </div>
              </section>

              {combinedApplicationFields.length > 0 && (
                <section className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold text-slate-800">
                    추가 질문
                    {type === "external" && typeSpecificForm.length > 0 && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        선택 유형: {applyParticipantType === "speaker" ? "발표자" : applyParticipantType === "volunteer" ? "자원봉사자" : "참석자"} 추가 질문 포함
                      </span>
                    )}
                  </h3>
                  <FormRenderer
                    fields={combinedApplicationFields}
                    value={applyAnswers}
                    onChange={(id, v) => setApplyAnswers((prev) => ({ ...prev, [id]: v }))}
                    scheduleDefaults={{
                      startDate: activity?.date,
                      endDate: activity?.endDate || activity?.date,
                    }}
                  />
                </section>
              )}
            </div>
            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => { setApplyDialog(false); setEditingApplicantKey(null); }}
                className="h-12 flex-1 text-base sm:h-8 sm:flex-none sm:text-sm"
              >
                취소
              </Button>
              <Button
                size="lg"
                className="h-12 flex-1 text-base font-semibold sm:h-9 sm:flex-none sm:text-sm"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || !applyName.trim() || (!user && (!applyEmail.trim() || !applyStudentId.trim())) || (applyParticipantType === "speaker" && !applySpeakerPaperTitle.trim())}
              >
                {applyMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
                {editingApplicantKey ? "수정 저장" : "신청 제출"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 신청현황 조회 Dialog — 이름+학번으로 본인 신청 내역 확인 (비회원 포함) */}
        <Dialog
          open={lookupDialog}
          onOpenChange={(o) => {
            setLookupDialog(o);
            if (!o) setLookupResult(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg font-bold sm:text-xl">신청현황 조회</DialogTitle>
              <p className="mt-1 text-xs text-muted-foreground">{activity?.title}</p>
            </DialogHeader>
            <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-slate-700">
              신청 시 입력한 <strong>이름과 학번</strong>으로 본인의 신청 내역만 조회할 수 있습니다.
            </p>
            <div className="grid gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  이름 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={lookupName}
                  onChange={(e) => setLookupName(e.target.value)}
                  placeholder="신청 시 입력한 이름"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  학번 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={lookupStudentId}
                  onChange={(e) => setLookupStudentId(e.target.value)}
                  placeholder="예: 2023432001"
                />
              </div>
            </div>

            {lookupResult === "notfound" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                입력하신 이름·학번과 일치하는 신청 내역을 찾을 수 없습니다. 입력값을 다시 확인해 주세요.
              </div>
            )}
            {lookupResult && lookupResult !== "notfound" && lookupResult !== "loading" && (() => {
              const r = lookupResult;
              const statusLabel =
                r.status === "approved" ? "승인 완료"
                : r.status === "rejected" ? "신청 취소 / 거절"
                : "신청 대기중";
              const statusCls =
                r.status === "approved" ? "bg-green-50 text-green-700"
                : r.status === "rejected" ? "bg-rose-50 text-rose-700"
                : "bg-amber-50 text-amber-700";
              const ptype = (r.participantType ?? "attendee") as ExternalParticipantType;
              return (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{r.name}</span>
                    <Badge className={cn("text-xs", statusCls)}>{statusLabel}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">참석유형</span>
                      <p className="font-medium">{EXTERNAL_PARTICIPANT_TYPE_LABELS[ptype]}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">신청일</span>
                      <p className="font-medium">
                        {r.appliedAt ? new Date(r.appliedAt).toLocaleDateString("ko-KR") : "-"}
                      </p>
                    </div>
                    {r.speakerPaperTitle && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">제목</span>
                        <p className="font-medium">{r.speakerPaperTitle}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    신청 내용을 수정하시려면 운영진에게 문의해 주세요.
                  </p>
                </div>
              );
            })()}

            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setLookupDialog(false)}
                className="h-12 flex-1 text-base sm:h-8 sm:flex-none sm:text-sm"
              >
                닫기
              </Button>
              <Button
                size="lg"
                className="h-12 flex-1 text-base font-semibold sm:h-9 sm:flex-none sm:text-sm"
                disabled={!lookupName.trim() || !lookupStudentId.trim() || lookupResult === "loading"}
                onClick={async () => {
                  const name = lookupName.trim();
                  const sid = lookupStudentId.trim();
                  setLookupResult("loading");
                  try {
                    const res = await fetch(
                      `/api/activities/${activityId}/application-lookup`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, studentId: sid }),
                      },
                    );
                    if (!res.ok) {
                      setLookupResult("notfound");
                      return;
                    }
                    const json = (await res.json()) as { found: PublicLookupResult | null };
                    setLookupResult(json.found ?? "notfound");
                  } catch {
                    setLookupResult("notfound");
                  }
                }}
              >
                <Search size={14} className="mr-1" />
                {lookupResult === "loading" ? "조회 중…" : "조회"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 역할 등록 Dialog */}
        <Dialog open={!!roleDialog} onOpenChange={(open) => { if (!open) setRoleDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="space-y-3 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCog size={18} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <DialogTitle className="text-base">역할 등록</DialogTitle>
                  <p className="text-xs text-muted-foreground">{roleDialog?.name}님의 활동 내 역할을 지정합니다.</p>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">자주 쓰는 역할</label>
                <div className="flex flex-wrap gap-1.5">
                  {["발표자", "진행자", "기록자", "총무", "자료조사", "디자인", "영상", "자원봉사"].map((r) => {
                    const active = roleInput === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleInput(r)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-slate-200 bg-card text-slate-700 hover:border-primary/40 hover:bg-primary/5",
                        )}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">직접 입력</label>
                <Input
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  placeholder="예: 발표자, 기록자, 총무"
                  className="h-10"
                  autoFocus
                />
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <X size={11} /> 비워두고 저장하면 역할이 제거됩니다.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRoleDialog(null)} className="flex-1 sm:flex-none">취소</Button>
              <Button
                onClick={() => roleDialog && updateRoleMutation.mutate({ pid: roleDialog.pid, role: roleInput })}
                disabled={updateRoleMutation.isPending}
                className="flex-1 sm:flex-none"
              >
                {updateRoleMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 메모 Dialog */}
        <Dialog open={!!noteDialog} onOpenChange={(open) => { if (!open) setNoteDialog(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>메모 — {noteDialog?.name}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="참여자에 대한 메모를 입력하세요"
                className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">비워두고 저장하면 메모가 삭제됩니다.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialog(null)}>취소</Button>
              <Button
                onClick={() => noteDialog && updateNoteMutation.mutate({ pid: noteDialog.pid, note: noteInput })}
                disabled={updateNoteMutation.isPending}
              >
                저장
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 비회원 신청 후 회원가입 유도 — 모바일에서 내용 크기에 맞춰 중앙 정렬(전체 높이 점유 방지) */}
        <Dialog open={signupCtaOpen} onOpenChange={setSignupCtaOpen}>
          <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 sm:max-w-md">
            <DialogHeader><DialogTitle>신청이 완료되었습니다 🎉</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm text-slate-700">
              <p>신청이 접수되었습니다. 운영진 승인 후 참가가 확정되며, 신청 상태는 활동 페이지의 <strong>&lsquo;신청현황 조회&rsquo;</strong>에서 이름·학번으로 확인할 수 있습니다.</p>
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="font-medium text-primary">회원가입하면 이런 점이 좋아요</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                  <li>신청 내역과 승인 상태를 마이페이지에서 실시간 확인</li>
                  <li>후속 세미나·스터디 일정 자동 알림</li>
                  <li>같은 이메일로 가입하면 이번 신청이 <strong>자동 연결</strong>됩니다</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSignupCtaOpen(false)}>나중에</Button>
              <Link
                href={`/signup?email=${encodeURIComponent(applyEmail)}&name=${encodeURIComponent(applyName)}`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                회원가입하고 기록 연결하기
              </Link>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
