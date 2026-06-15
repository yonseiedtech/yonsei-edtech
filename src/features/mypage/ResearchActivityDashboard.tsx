"use client";

/**
 * ResearchActivityDashboard — 연구활동 전용 대시보드 (사이클 123)
 *
 * /mypage/research (연구 타이머 탭)에서 사용. 학습 잔디 전체가 아닌
 * "연구활동(research) 영역만" 필터링한 매트릭스 대시보드를 보여준다.
 *  - 데이터: useGradActivityData(본인) — 논문 작성·읽기·아카이브 열람·학습 타이머·진단평가
 *  - 헤더 우측: 연구 타이머 compact(현재 세션·정지·오늘 누적)
 *  - 활동(습관) 커스터마이징 지원(localStorage)
 */

import GradActivityDashboard from "./GradActivityDashboard";
import ResearchTimerCompact from "./ResearchTimerCompact";
import { useGradActivityData } from "./useGradActivityData";

export default function ResearchActivityDashboard({ userId }: { userId: string }) {
  const { activityByDay, isLoading } = useGradActivityData(userId);

  return (
    <div>
      {isLoading && (
        <p className="mb-2 text-[11px] text-muted-foreground" role="status">
          연구활동 데이터를 불러오는 중...
        </p>
      )}
      <GradActivityDashboard
        activityByDay={activityByDay}
        userId={userId}
        areas={["research"]}
        enableCustomize
        storageKey={`mypage.researchHabitKeys.${userId}`}
        title="연구활동 대시보드"
        description="논문 작성·읽기·아카이브 열람·학습 타이머·진단평가를 한눈에 추적하세요."
        headerExtra={<ResearchTimerCompact />}
      />
    </div>
  );
}
