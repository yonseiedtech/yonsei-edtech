import { Skeleton } from "@/components/ui/skeleton";

/**
 * 라우트 레벨 로딩 셸 (Phase 1 체감속도) — 각 구간 loading.tsx 에서 재사용.
 * 서버 컴포넌트: 번들 다운로드·하이드레이션 동안 즉시 스트리밍되는 첫 화면.
 * 페이지 공통 골격(헤더 + 카드 그리드)만 흉내 내는 중립 스켈레톤.
 */
export default function RouteLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8" aria-busy="true" aria-label="불러오는 중">
      {/* 페이지 헤더 */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {/* 상단 요약/탭 줄 */}
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      {/* 본문 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}
