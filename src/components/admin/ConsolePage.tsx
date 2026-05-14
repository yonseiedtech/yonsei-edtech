import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import ConsolePageHeader from "./ConsolePageHeader";

/**
 * 운영 콘솔 화면 표준 래퍼 (Sprint 70 UI 통일).
 *
 * 모든 /console 하위 화면이 동일한 헤더·간격 체계를 갖도록 단일 진입점 제공.
 * - 헤더: ConsolePageHeader (아이콘 + 제목 + 설명 + 우측 actions)
 * - root 간격: space-y-6 (헤더와 본문, 본문 카드 간 일관)
 *
 * console layout 이 이미 외곽 컨테이너(max-w-7xl px-4 py-16 + sidebar)를 제공하므로
 * 화면 컴포넌트는 ConsolePage 안에서 content 만 렌더한다. 자체 외곽 padding/max-width 추가 금지.
 *
 * 사용 예:
 *   <ConsolePage icon={Users} title="회원 관리" description="...">
 *     <StatCards />
 *     <MemberTable />
 *   </ConsolePage>
 */

interface ConsolePageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** 헤더 우측 액션 영역 (버튼 등) */
  actions?: ReactNode;
  children: ReactNode;
}

export default function ConsolePage({
  icon,
  title,
  description,
  actions,
  children,
}: ConsolePageProps) {
  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={icon}
        title={title}
        description={description}
        actions={actions}
      />
      {children}
    </div>
  );
}
