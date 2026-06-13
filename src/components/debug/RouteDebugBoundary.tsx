"use client";

// 사이클 97 진단(임시): 마이페이지·콘솔 "eb.filter is not a function" 의 정확한 위치를
// 화면에 노출하는 공통 ErrorBoundary. error.stack(chunks/xxx.js:줄:칼럼)·componentStack 을
// 그대로 보여줘 사용자가 F12 없이 캡처만 하면 되도록. 원인 확정 후 제거.

import { Component, type ReactNode } from "react";

interface State {
  msg: string | null;
  errStack: string;
  componentStack: string;
}

export default class RouteDebugBoundary extends Component<
  { children: ReactNode; label?: string },
  State
> {
  state: State = { msg: null, errStack: "", componentStack: "" };

  static getDerivedStateFromError(e: Error): Partial<State> {
    return { msg: e?.message ?? String(e) };
  }

  componentDidCatch(e: Error, info: { componentStack: string }) {
    this.setState({
      msg: e?.message ?? String(e),
      errStack: e?.stack ?? "",
      componentStack: info?.componentStack ?? "",
    });
  }

  render() {
    if (this.state.msg) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="mb-2 text-lg font-bold text-rose-600">
            {this.props.label ?? "페이지"} 진단 정보 (운영진 전달용)
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            아래 내용을 통째로 캡처하거나 복사해 전달해 주세요. 원인 확인 후 정상화됩니다.
          </p>
          <pre className="overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed">
            {"message: "}
            {this.state.msg}
            {"\n\nerror.stack:\n"}
            {this.state.errStack}
            {"\n\ncomponentStack:"}
            {this.state.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
