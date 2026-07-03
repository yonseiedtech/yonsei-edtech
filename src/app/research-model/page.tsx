"use client";

/**
 * 연구 모형 그리기 페이지 (사이클 92, 신규)
 *
 * 석사과정 학생이 자기 연구의 변인 간 관계를 시각적으로 그리는 독립 라우트.
 * (마이페이지 연구 활동에 통합 예정이나, 우선 독립 페이지로 제공)
 *
 * 로드: researchModelsApi.get(uid) → 저장된 모형 복원.
 * 저장: researchModelsApi.save(uid, model) (doc id = uid, 1인 1개).
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Save, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import ResearchModelEditor from "@/features/research/ResearchModelEditor";
import ModelWizard from "@/features/research/ModelWizard";
import {
  useEnsureResearchReport,
  useUpdateResearchReport,
} from "@/features/research/useResearchReport";
import { EMPTY_RESEARCH_MODEL, type ResearchModelData } from "@/types/research-model";
import { researchModelsApi } from "@/lib/research-models-api";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import SkeletonWidget from "@/components/ui/skeleton-widget";

function ResearchModelContent() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [model, setModel] = useState<ResearchModelData>(EMPTY_RESEARCH_MODEL);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const ensureReport = useEnsureResearchReport();
  const updateReport = useUpdateResearchReport();

  const { data, isLoading } = useQuery({
    queryKey: ["research-model", user?.id],
    queryFn: () => researchModelsApi.get(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // 저장된 모형 복원 (최초 1회) — QA-v2: dirty 해제 순간 옛 캐시로 되감기던 롤백 수정
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (data?.data && !hydratedRef.current) {
      hydratedRef.current = true;
      setModel(data.data);
    }
  }, [data]);

  if (!user) return null;

  async function handleApplyQuestions(questions: string[]) {
    if (!user) return;
    try {
      const report = await ensureReport.mutateAsync(user.id);
      await updateReport.mutateAsync({
        id: report.id,
        data: { researchQuestions: questions },
      });
      toast.success("연구 보고서 ‘2-4. 연구문제’에 반영했습니다.");
    } catch {
      toast.error("연구 보고서 반영에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await researchModelsApi.save(user.id, model);
      // QA-v2: 저장분을 캐시에 반영 — 보고서/계획서 동기화 패널이 stale 모형을 쓰지 않도록
      queryClient.setQueryData(["research-model", user.id], (prev: unknown) =>
        prev && typeof prev === "object" ? { ...(prev as object), data: model } : { data: model },
      );
      void queryClient.invalidateQueries({ queryKey: ["research-model", user.id] });
      setDirty(false);
      toast.success("연구 모형을 저장했습니다.");
    } catch {
      toast.error("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={FlaskConical}
        title="연구 모형 그리기"
        description="연구의 변인(독립·종속·매개·조절·통제)과 관계(인과·상관)를 다이어그램으로 그려보세요. 핸들을 끌어 변인을 연결하고, 가설 라벨(H1 등)을 붙일 수 있습니다."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-1.5">
              <Wand2 size={14} />
              마법사로 만들기
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        }
      />

      {!isLoading && model.nodes.length === 0 && (
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wand2 size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold">처음이라면 마법사로 시작하세요</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              변인 이름 몇 개만 입력하면 배치·화살표·가설 라벨(H1…)까지 자동으로 그려드립니다. 템플릿 5종도 준비되어 있어요.
            </span>
          </span>
        </button>
      )}

      <ModelWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        hasExisting={model.nodes.length > 0}
        onApply={(m) => {
          setModel(m);
          setDirty(true);
        }}
      />

      <div className="mt-6">
        {isLoading ? (
          <SkeletonWidget rows={6} />
        ) : (
          <ResearchModelEditor
            value={model}
            onChange={(next) => {
              setModel(next);
              setDirty(true);
            }}
            onApplyQuestions={handleApplyQuestions}
          />
        )}
      </div>
    </PageContainer>
  );
}

export default function ResearchModelPage() {
  return (
    <AuthGuard>
      <ResearchModelContent />
    </AuthGuard>
  );
}
