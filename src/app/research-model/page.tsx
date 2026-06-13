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

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import ResearchModelEditor from "@/features/research/ResearchModelEditor";
import { EMPTY_RESEARCH_MODEL, type ResearchModelData } from "@/types/research-model";
import { researchModelsApi } from "@/lib/research-models-api";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import SkeletonWidget from "@/components/ui/skeleton-widget";

function ResearchModelContent() {
  const { user } = useAuthStore();
  const [model, setModel] = useState<ResearchModelData>(EMPTY_RESEARCH_MODEL);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["research-model", user?.id],
    queryFn: () => researchModelsApi.get(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // 저장된 모형 복원 (최초 1회 — 사용자가 편집 시작하면 덮어쓰지 않음)
  useEffect(() => {
    if (data?.data && !dirty) {
      setModel(data.data);
    }
  }, [data, dirty]);

  if (!user) return null;

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await researchModelsApi.save(user.id, model);
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
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "저장 중…" : "저장"}
          </Button>
        }
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
