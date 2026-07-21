"use client";

import { use } from "react";
import { useEffect } from "react";
import { AlertCircle, Users, Pencil, Target, FlaskConical, Calendar } from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useCollabResearch,
  useCollabMembers,
} from "@/features/collaborative-research/api/useCollabResearch";
import CollabResearchHeader from "@/features/collaborative-research/components/CollabResearchHeader";
import { collabResearchApi } from "@/lib/bkend";

interface PageProps {
  params: Promise<{ researchId: string }>;
}

export default function CollabResearchDashboardPage({ params }: PageProps) {
  const { researchId } = use(params);
  return (
    <AuthGuard>
      <DashboardContent researchId={researchId} />
    </AuthGuard>
  );
}

function DashboardContent({ researchId }: { researchId: string }) {
  const { user } = useAuthStore();
  const { data: research, isLoading } = useCollabResearch(researchId);
  const { data: members = [] } = useCollabMembers(researchId);

  // leader 진입 시 collaboratorIds denorm 동기화 (Phase 1 한정 client-side reconcile)
  useEffect(() => {
    if (user?.id && research && user.id === research.leaderId) {
      void collabResearchApi.reconcileCollaborators(research.id);
    }
  }, [user?.id, research]);

  if (isLoading) {
    return (
      <PageContainer>
        <p className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</p>
      </PageContainer>
    );
  }

  if (!research) {
    return (
      <PageContainer>
        <BackButton href="/collab" label="공동 연구 목록" />
        <Card className="border-destructive/20 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="text-destructive" />
            <p className="text-sm">연구를 찾을 수 없습니다.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const myMember = members.find((m) => m.userId === user?.id);
  const isLeader = user?.id === research.leaderId;

  return (
    <PageContainer>
      <BackButton href="/collab" label="공동 연구 목록" />
      <CollabResearchHeader
        research={research}
        myRole={myMember?.role}
        isLeader={isLeader}
        activeTab="dashboard"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* 좌측 2/3: 진도 요약 */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target size={16} /> 연구 목적
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {research.researchPurpose}
              </p>
            </CardContent>
          </Card>

          {research.researchQuestions && research.researchQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">연구 문제</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {research.researchQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {research.methodology?.kind && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical size={16} /> 연구 방법
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">유형:</span>{" "}
                  {research.methodology.kind === "quantitative"
                    ? "양적"
                    : research.methodology.kind === "qualitative"
                      ? "질적"
                      : "혼합"}
                  {research.methodology.design && ` · ${research.methodology.design}`}
                </p>
                {research.methodology.sampling && (
                  <p>
                    <span className="text-muted-foreground">표집:</span>{" "}
                    {research.methodology.sampling}
                  </p>
                )}
                {research.methodology.analysisMethod && (
                  <p>
                    <span className="text-muted-foreground">분석:</span>{" "}
                    {research.methodology.analysisMethod}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {research.irbStatus?.required && (
            <Card className="border-warning/20 bg-warning/10">
              <CardHeader>
                <CardTitle className="text-base">IRB 심의 상태</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <p>
                  <span className="text-muted-foreground">상태:</span>{" "}
                  {research.irbStatus.status ?? "미입력"}
                </p>
                {research.irbStatus.approvalNumber && (
                  <p>
                    <span className="text-muted-foreground">승인번호:</span>{" "}
                    {research.irbStatus.approvalNumber}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 우측 1/3: 멤버 요약 + 다음 액션 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users size={16} /> 멤버 ({members.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.userId.slice(0, 8)}…</span>
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </div>
              ))}
              {members.length > 5 && (
                <p className="text-xs text-muted-foreground">+ {members.length - 5}명</p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = `/collab/${research.id}/members`)}
              >
                멤버 관리
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar size={16} /> 일정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">시작:</span> {research.startDate}
              </p>
              {research.targetEndDate && (
                <p>
                  <span className="text-muted-foreground">목표:</span> {research.targetEndDate}
                </p>
              )}
            </CardContent>
          </Card>

          {(isLeader || myMember) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">다음 액션</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => (window.location.href = `/collab/${research.id}/meta`)}
                >
                  <Pencil size={14} className="mr-1" /> 연구 메타 편집
                </Button>
                {/* Phase 2~3 액션은 추후 추가: 챕터·미팅·마일스톤·출판 */}
                <p className="text-xs text-muted-foreground">
                  공동 작성·연구지 출판 기능은 곧 출시됩니다 (Phase 2~3).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
