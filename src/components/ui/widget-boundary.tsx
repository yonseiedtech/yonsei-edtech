"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

/**
 * WidgetBoundary — 위젯 단위 클라이언트 에러 경계 (v17 L2 디버깅, 2026-07-27 / v18-M4 fallback UX).
 *
 * Next.js 의 error.tsx(라우트 경계)는 한 위젯이 render 중 throw 하면 /mypage 서브트리
 * "전체"를 폴백으로 대체한다 → 마이페이지 화면 전체 붕괴(SectionError). 개별 대시보드
 * 위젯을 이 경계로 감싸면 한 위젯의 크래시가 그 자리에서만 조용히 폴백되고 나머지
 * 페이지(프로필·탭·다른 위젯)는 그대로 살아 있는다.
 *
 * React 는 함수형 error boundary 를 제공하지 않으므로 반드시 class 컴포넌트여야 한다.
 * 클라이언트 render/커밋 단계의 throw 만 잡는다(비동기 fetch 실패는 react-query 가 흡수).
 *
 * fallback UX (v18-M4):
 *   - 기본: 조용히 숨김(null) — 대시보드 위젯은 없어도 페이지가 성립한다.
 *   - fallback prop: 커스텀 폴백 노드.
 *   - retryable: 최소 카드(라벨 + 다시 시도 버튼) 표시. 일시적 크래시를 사용자가 복구.
 */
interface Props {
  children: ReactNode;
  /** 폴백 노출 노드. 기본은 조용히 숨김(null). retryable 이 켜져 있으면 이 값이 우선. */
  fallback?: ReactNode;
  /** true 면 크래시 자리에 "다시 시도" 최소 카드를 노출(fallback 미지정 시). */
  retryable?: boolean;
  /** 재시도 카드에 노출할 사람이 읽는 이름(예: "이번 주 목표"). 없으면 label 사용. */
  title?: string;
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

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    if (!this.props.retryable) return null;

    const name = this.props.title ?? this.props.label ?? "위젯";
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
        <AlertCircle size={18} className="text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          {name}을(를) 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw size={12} /> 다시 시도
        </button>
      </div>
    );
  }
}
