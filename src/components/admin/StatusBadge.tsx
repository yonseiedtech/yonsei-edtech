import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ── 역할 ── */
const ROLE_COLORS: Record<string, string> = {
  sysadmin: "bg-rose-100 text-rose-700 border-rose-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  president: "bg-blue-100 text-blue-700 border-blue-200",
  staff: "bg-sky-100 text-sky-700 border-sky-200",
  advisor: "bg-teal-100 text-teal-700 border-teal-200",
  alumni: "bg-slate-100 text-slate-600 border-slate-200",
  member: "bg-gray-100 text-gray-600 border-gray-200",
};

const ROLE_LABELS: Record<string, string> = {
  sysadmin: "시스템 관리자",
  admin: "관리자",
  president: "학회장",
  staff: "운영진",
  advisor: "지도교수",
  alumni: "졸업생",
  member: "일반회원",
};

/* ── 승인 상태 ── */
const APPROVAL_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

/* ── 문의 상태 ── */
const INQUIRY_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  replied: "bg-green-50 text-green-700 border-green-200",
};

/* ── 세미나 상태 ── */
const SEMINAR_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  ongoing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

/* ── 게시글 카테고리 ── */
const POST_CATEGORY_COLORS: Record<string, string> = {
  notice: "bg-primary/10 text-primary border-primary/20",
  seminar: "bg-amber-50 text-amber-700 border-amber-200",
  promotion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  general: "bg-gray-100 text-gray-600 border-gray-200",
};

type Category = "role" | "approval" | "inquiry" | "seminar" | "postCategory";

const COLOR_MAP: Record<Category, Record<string, string>> = {
  role: ROLE_COLORS,
  approval: APPROVAL_COLORS,
  inquiry: INQUIRY_COLORS,
  seminar: SEMINAR_COLORS,
  postCategory: POST_CATEGORY_COLORS,
};

interface Props {
  category: Category;
  value: string;
  /** 표시 라벨 (미제공 시 value 그대로 표시) */
  label?: string;
  className?: string;
}

export default function StatusBadge({ category, value, label, className }: Props) {
  const colors = COLOR_MAP[category]?.[value] ?? "bg-gray-100 text-gray-600 border-gray-200";
  const displayLabel = category === "role" ? (label ?? ROLE_LABELS[value] ?? value) : (label ?? value);

  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", colors, className)}>
      {displayLabel}
    </Badge>
  );
}

export { ROLE_COLORS, ROLE_LABELS, APPROVAL_COLORS, INQUIRY_COLORS, SEMINAR_COLORS, POST_CATEGORY_COLORS };
