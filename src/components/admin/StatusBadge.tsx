import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_CHIP, type StatusVariant } from "@/lib/design-tokens";

/* ── 역할 ── */
const ROLE_COLORS: Record<string, string> = {
  sysadmin: "bg-destructive/10 text-destructive border-destructive/20",
  admin: "bg-info/10 text-info border-info/20",
  president: "bg-info/10 text-info border-info/20",
  staff: "bg-info/10 text-info border-info/20",
  advisor: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900",
  alumni: "bg-muted text-muted-foreground border-muted-foreground/20",
  member: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
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

/*
 * ── 상태 색 단일 소스 ──
 * 승인/문의/세미나/카테고리 상태는 SEMANTIC chip 토큰(STATUS_CHIP)을 참조한다.
 * 기존 리터럴(`bg-amber-50 ... border-amber-200 dark:...`)과 농도 동일 → 시각 회귀 없음.
 * 색을 바꿀 땐 design-tokens 의 SEMANTIC.*.chip 만 수정하면 전역 반영된다.
 */

/* ── 승인 상태 ── */
const APPROVAL_COLORS: Record<string, string> = {
  pending: STATUS_CHIP.warning,
  approved: STATUS_CHIP.success,
  rejected: STATUS_CHIP.danger,
};

/* ── 문의 상태 ── */
const INQUIRY_COLORS: Record<string, string> = {
  pending: STATUS_CHIP.warning,
  replied: STATUS_CHIP.success,
};

/* ── 세미나 상태 ── */
const SEMINAR_COLORS: Record<string, string> = {
  draft: STATUS_CHIP.neutral,
  upcoming: STATUS_CHIP.info,
  ongoing: STATUS_CHIP.warning,
  completed: STATUS_CHIP.success,
  cancelled: STATUS_CHIP.danger,
};

/* ── 게시글 카테고리 ── */
const POST_CATEGORY_COLORS: Record<string, string> = {
  notice: "bg-primary/10 text-primary border-primary/20",
  seminar: STATUS_CHIP.warning,
  promotion: STATUS_CHIP.success,
  general: STATUS_CHIP.neutral,
};

type Category = "role" | "approval" | "inquiry" | "seminar" | "postCategory";

const COLOR_MAP: Record<Category, Record<string, string>> = {
  role: ROLE_COLORS,
  approval: APPROVAL_COLORS,
  inquiry: INQUIRY_COLORS,
  seminar: SEMINAR_COLORS,
  postCategory: POST_CATEGORY_COLORS,
};

interface CategoryProps {
  /** 도메인별 상태 매핑(승인/문의/세미나/카테고리/역할). value 로 색·라벨을 조회. */
  category: Category;
  value: string;
  variant?: never;
  /** 표시 라벨 (미제공 시 value 그대로 표시) */
  label?: string;
  className?: string;
}

interface VariantProps {
  /**
   * 전역 상태 색 variant — SEMANTIC chip 토큰 직접 참조.
   * 도메인 매핑 없이 의미색만 필요할 때 사용(success/danger/warning/info/neutral).
   */
  variant: StatusVariant;
  category?: never;
  value?: never;
  /** 표시 라벨 */
  label?: string;
  className?: string;
}

type Props = CategoryProps | VariantProps;

/**
 * StatusBadge — 전역 상태 배지 표준 컴포넌트.
 *
 * 두 가지 사용 방식:
 *  1. `<StatusBadge variant="success" label="승인됨" />` — 의미색 직접 지정(권장, 단일 소스).
 *  2. `<StatusBadge category="approval" value="approved" />` — 도메인 상태값 매핑(라벨 자동).
 *
 * 색은 모두 design-tokens 의 STATUS_CHIP(SEMANTIC.*.chip) 단일 소스에서 온다(role 제외).
 */
export default function StatusBadge(props: Props) {
  const { label, className } = props;

  let colors: string;
  let displayLabel: string;

  if (props.variant) {
    colors = STATUS_CHIP[props.variant];
    displayLabel = label ?? props.variant;
  } else {
    const { category, value } = props;
    colors = COLOR_MAP[category]?.[value] ?? STATUS_CHIP.neutral;
    displayLabel = category === "role" ? (label ?? ROLE_LABELS[value] ?? value) : (label ?? value);
  }

  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", colors, className)}>
      {displayLabel}
    </Badge>
  );
}

export { ROLE_COLORS, ROLE_LABELS, APPROVAL_COLORS, INQUIRY_COLORS, SEMINAR_COLORS, POST_CATEGORY_COLORS };
