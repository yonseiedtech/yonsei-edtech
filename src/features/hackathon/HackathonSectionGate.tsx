"use client";

/**
 * 해커톤 허브 영역 공개 게이트 (visibility-gate, 2026-07-22)
 *
 * 운영진이 콘솔 "당일 운영" 탭의 영역 공개 토글로 켜야만 노출되는 세 섹션을 묶는
 * 클라이언트 래퍼. 서버 컴포넌트(hackathon/page.tsx)에서 클라이언트 훅을 직접 쓸 수 없어
 * 이 컴포넌트가 가시성 판단을 담당한다.
 *
 * 기본값(필드 부재·null): 전부 비공개 — 로딩 중엔 렌더 없이 대기(깜빡임 없음).
 *
 * 공개 순서 안내: 팀 현황 → 산출물 제출 → 수상작
 */

import { Trophy, Users } from "lucide-react";
import HackathonAwards from "./HackathonAwards";
import HackathonTeamView from "./HackathonTeamView";
import HackathonSubmissions from "./HackathonSubmissions";
import { useHackathonOps } from "./useHackathonOps";

export default function HackathonSectionGate() {
  const { sectionVisibility, isLoading } = useHackathonOps();

  // 로딩 중: 비공개 기본값과 동일하게 미렌더 (hydration 깜빡임 없음)
  if (isLoading) return null;

  return (
    <>
      {/* ── 수상작 (행사 전: 예정 안내, 심사 중: 심사 중 안내, 이후: 공개 갤러리) ── */}
      {sectionVisibility.awards && <HackathonAwards />}

      {/* ── 팀 현황 ── */}
      {sectionVisibility.teams && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Users size={18} className="text-primary" />
            팀 현황
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            확정된 팀과 팀원을 찾는 중인 아이디어를 한눈에 볼 수 있어요.
            아이디어 보드에서 합류 희망을 표시하고 팀을 만들어 보세요.
          </p>
          <div className="mt-5">
            <HackathonTeamView />
          </div>
        </section>
      )}

      {/* ── 산출물 제출 ── */}
      {sectionVisibility.submissions && (
        <section className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Trophy size={18} className="text-primary" />
            산출물 제출
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            우리 팀의 결과물을 제목·설명·링크와 함께 남기세요. 발표 후 심사를
            거쳐 수상작이 선정됩니다.
          </p>
          <div className="mt-5">
            <HackathonSubmissions />
          </div>
        </section>
      )}
    </>
  );
}
