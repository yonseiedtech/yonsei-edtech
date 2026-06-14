"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            retry: 1,
            // 창 포커스 복귀 시 전체 쿼리 자동 refetch 비활성화 — 설정 페이지 등에서
            // 다른 창 다녀오면 화면이 깜빡이며 "스스로 새로고침"되는 체감 제거 (사용자 보고).
            // staleTime(1분) + 라우트 이동 시 refetch 는 유지되어 데이터 신선도는 보존.
            refetchOnWindowFocus: false,
          },
          mutations: {
            onError: (error) => {
              toast.error(error instanceof Error ? error.message : "요청에 실패했습니다.");
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
