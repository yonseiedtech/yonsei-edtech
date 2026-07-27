"use client";

import { Component, type ReactNode } from "react";

/**
 * WidgetBoundary — 위젯 단위 클라이언트 에러 경계 (v17 L2 디버깅, 2026-07-27).
 *
 * Next.js 의 error.tsx(라우트 경계)는 한 위젯이 render 중 throw 하면 /mypage 서브트리
 * "전체"를 폴백으로 대체한다 → 마이페이지 화면 전체 붕괴(SectionError). 개별 대시보드
 * 위젯을 이 경계로 감싸면 한 위젯의 크래시가 그 자리에서만 조용히 폴백되고 나머지
 * 페이지(프로필·탭·다른 위젯)는 그대로 살아 있는다.
 *
 * React 는 함수형 error boundary 를 제공하지 않으므로 반드시 class 컴포넌트여야 한다.
 * 클라이언트 render/커밋 단계의 throw 만 잡는다(비동기 fetch 실패는 react-query 가 흡수).
 */
interface Props {
  children: ReactNode;
  /** 폴백 노출 노드. 기본은 조용히 숨김(null) — 대시보드 위젯은 없어도 페이지가 성립한다. */
  fallback?: ReactNode;
  /** console.error 태그용 라벨(어느 위젯이 죽었는지 식별) */
  label?: string;
}

interface State {
  hasError: boolean;
}

export default class WidgetBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(
      `[widget-boundary${this.props.label ? `:${this.props.label}` : ""}]`,
      error,
    );
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
