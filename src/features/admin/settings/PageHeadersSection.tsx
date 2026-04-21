"use client";

/**
 * 페이지 헤더(타이틀/설명) 일괄 편집기.
 *
 * - 사이트 주요 페이지의 상단 헤더 텍스트를 운영자가 직접 수정 가능.
 * - 빈 값으로 저장하면 페이지에 하드코딩된 fallback 텍스트가 표시된다.
 */

import { useState, useEffect } from "react";
import {
  usePageHeaders,
  useUpdatePageHeaders,
  PAGE_HEADER_META,
  type PageHeaderKey,
  type PageHeadersMap,
} from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const PAGE_KEYS = Object.keys(PAGE_HEADER_META) as PageHeaderKey[];

const FALLBACKS: Record<PageHeaderKey, { title: string; description: string }> = {
  seminars: {
    title: "세미나",
    description: "매주 교육공학/에듀테크 관련 최신 논문이나 트렌드를 발제하고 토론합니다.",
  },
  activities: {
    title: "활동 소개",
    description: "세미나, 프로젝트, 스터디를 통해 교육공학의 이론과 실천을 연결합니다.",
  },
  research: {
    title: "연세교육공학 연구 분석",
    description:
      "연세대학교 교육대학원 교육공학전공 졸업생 학위논문의 키워드·제목·시대별 흐름·연구 계보를 시각화합니다.",
  },
  calendar: {
    title: "학술 캘린더",
    description: "세미나, 프로젝트, 스터디, 대외활동 일정을 한눈에 확인하세요.",
  },
};

export default function PageHeadersSection() {
  const { value, recordId, isLoading } = usePageHeaders();
  const updateMutation = useUpdatePageHeaders();
  const [form, setForm] = useState<PageHeadersMap>(value);

  useEffect(() => {
    if (!isLoading) setForm(value);
  }, [isLoading, value]);

  function setField(key: PageHeaderKey, field: "title" | "description", v: string) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { title: "", description: "" }), [field]: v },
    }));
  }

  function handleSave() {
    // 양쪽 모두 빈 항목은 저장에서 제거 (fallback 사용)
    const cleaned: PageHeadersMap = {};
    for (const k of PAGE_KEYS) {
      const v = form[k];
      if (!v) continue;
      const t = v.title?.trim() ?? "";
      const d = v.description?.trim() ?? "";
      if (t || d) cleaned[k] = { title: t, description: d };
    }
    updateMutation.mutate(
      { recordId, value: cleaned },
      {
        onSuccess: () => toast.success("페이지 헤더가 저장되었습니다."),
        onError: () => toast.error("저장 실패"),
      },
    );
  }

  if (isLoading) {
    return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <Section title="페이지 헤더">
      <p className="mb-4 text-xs text-muted-foreground">
        각 페이지의 상단 타이틀과 설명문을 직접 수정할 수 있습니다. 빈 값으로 저장하면 기본 문구가 표시됩니다.
      </p>
      <div className="space-y-5">
        {PAGE_KEYS.map((key) => {
          const meta = PAGE_HEADER_META[key];
          const fb = FALLBACKS[key];
          const cur = form[key] ?? { title: "", description: "" };
          return (
            <div key={key} className="rounded-lg border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold">{meta.label}</span>
                  <span className="ml-2 font-mono text-[11px] text-muted-foreground">{meta.route}</span>
                </div>
                <Link
                  href={meta.route}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  미리보기 <ExternalLink size={12} />
                </Link>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    타이틀 (기본값: <span className="font-mono">{fb.title}</span>)
                  </label>
                  <Input
                    value={cur.title ?? ""}
                    onChange={(e) => setField(key, "title", e.target.value)}
                    placeholder={fb.title}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    설명문 (기본값: <span className="font-mono">{fb.description}</span>)
                  </label>
                  <textarea
                    value={cur.description ?? ""}
                    onChange={(e) => setField(key, "description", e.target.value)}
                    placeholder={fb.description}
                    rows={2}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "전체 저장"}
      </Button>
    </Section>
  );
}
