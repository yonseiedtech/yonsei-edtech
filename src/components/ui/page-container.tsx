import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 일반 사용자 서비스 화면 표준 외곽 컨테이너 (Sprint 70 UI 통일).
 *
 * 루트 layout(`src/app/layout.tsx`)이 외곽 컨테이너를 제공하지 않아 각 페이지가
 * 자율적으로 max-w·py 를 정의 → 본문 폭(2xl~7xl)·여백(py-1~20) 제각각.
 * 본 컴포넌트로 섹션별 규격을 고정해 통일.
 *
 * width 규격:
 * - narrow (max-w-4xl): 텍스트 중심 — 게시판 글·약관·문의
 * - default (max-w-6xl): 콘텐츠 중심 — 학회 소개·디딤판·활동·마이페이지
 * - wide (max-w-7xl): 그리드·매거진 — 뉴스레터 매거진 등
 *
 * 표준 패딩: px-4 py-8 sm:py-14 (운영 콘솔 py-16 보다 약간 작게, 사용자 서비스는 여유).
 */

type ContainerWidth = "narrow" | "default" | "wide";

const WIDTH_MAP: Record<ContainerWidth, string> = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

interface PageContainerProps {
  width?: ContainerWidth;
  /** 추가 className (드물게 — 가급적 width prop 으로 제어) */
  className?: string;
  children: ReactNode;
}

export default function PageContainer({
  width = "default",
  className,
  children,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto px-4 py-8 sm:py-14", WIDTH_MAP[width], className)}>
      {children}
    </div>
  );
}
