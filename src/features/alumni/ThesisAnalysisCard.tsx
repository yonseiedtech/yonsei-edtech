"use client";

/**
 * 졸업생 논문 — 연구 분석 프로필 카드 (사이클 52)
 *
 * 사이클 43 자동 추출(제목+초록 휴리스틱) 결과를 보여주고,
 * 운영진(staff+)은 인라인으로 보정·추가할 수 있다.
 *   · 저장 시 extractedBy 를 `manual:{uid}` 로 갱신 → 라벨이 "운영진 검수됨"으로 전환
 *   · 자동 추출이 실패한(분석 없음) 논문도 운영진에게는 "분석 추가" 버튼 노출
 * 통계·연구방법 칩은 아카이브 가이드 ?q= 딥링크 유지.
 */

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { alumniThesesApi } from "@/lib/bkend";
import type { AlumniThesis, ThesisAnalysisProfile } from "@/types";

interface Props {
  thesis: AlumniThesis;
  canEdit: boolean;
  onSaved: (fresh: AlumniThesis) => void;
}

const FIELD_DEFS: { key: keyof EditState; label: string; placeholder: string }[] = [
  { key: "subjects", label: "연구대상", placeholder: "대학생, 교사 (콤마 구분)" },
  { key: "independent", label: "독립변인", placeholder: "플립러닝, 협력학습 전략" },
  { key: "dependent", label: "종속변인", placeholder: "학업성취도, 학습몰입" },
  { key: "statMethods", label: "통계방법", placeholder: "ANCOVA (공분산분석), t-test (독립/대응표본)" },
  { key: "researchMethods", label: "연구방법", placeholder: "준실험연구, 개발연구" },
];

interface EditState {
  subjects: string;
  independent: string;
  dependent: string;
  statMethods: string;
  researchMethods: string;
}

function toEditState(a?: ThesisAnalysisProfile): EditState {
  return {
    subjects: (a?.subjects ?? []).join(", "),
    independent: (a?.independent ?? []).join(", "),
    dependent: (a?.dependent ?? []).join(", "),
    statMethods: (a?.statMethods ?? []).join(", "),
    researchMethods: (a?.researchMethods ?? []).join(", "),
  };
}

function splitCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function hasAnyValue(a?: ThesisAnalysisProfile): boolean {
  if (!a) return false;
  return (
    (a.subjects?.length ?? 0) > 0 ||
    (a.independent?.length ?? 0) > 0 ||
    (a.dependent?.length ?? 0) > 0 ||
    (a.statMethods?.length ?? 0) > 0 ||
    (a.researchMethods?.length ?? 0) > 0
  );
}

export default function ThesisAnalysisCard({ thesis, canEdit, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditState>(() => toEditState(thesis.analysis));
  const [saving, setSaving] = useState(false);

  const a = thesis.analysis;
  const reviewed = a?.extractedBy?.startsWith("manual:") ?? false;
  const showCard = hasAnyValue(a) || canEdit;
  if (!showCard) return null;

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const next: ThesisAnalysisProfile = {
        ...thesis.analysis,
        subjects: splitCsv(form.subjects),
        independent: splitCsv(form.independent),
        dependent: splitCsv(form.dependent),
        statMethods: splitCsv(form.statMethods),
        researchMethods: splitCsv(form.researchMethods),
        extractedFrom: thesis.analysis?.extractedFrom ?? "manual",
        extractedAt: new Date().toISOString(),
        extractedBy: "manual:staff-review",
      };
      await alumniThesesApi.update(thesis.id, {
        analysis: next as unknown as Record<string, unknown>,
        updatedAt: new Date().toISOString(),
      });
      onSaved({ ...thesis, analysis: next });
      setEditing(false);
      toast.success("연구 분석 프로필을 저장했습니다 — '운영진 검수됨'으로 표시됩니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          연구 분석 프로필{" "}
          {reviewed ? (
            <span className="rounded bg-success/10 px-1.5 py-px text-[10px] font-medium text-success">
              운영진 검수됨
            </span>
          ) : (
            <span className="text-[10px] font-normal text-muted-foreground">
              제목·초록 자동 추출 — 참고용
            </span>
          )}
        </h2>
        {canEdit && !editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setForm(toEditState(thesis.analysis));
              setEditing(true);
            }}
          >
            <Pencil size={12} className="mr-1" />
            {hasAnyValue(a) ? "보정" : "분석 추가"}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2.5">
          {FIELD_DEFS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{f.label}</label>
              <Input
                value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-8 text-xs"
              />
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            콤마(,)로 구분해 입력하세요. 통계·연구방법은 아카이브 가이드 이름과 같게 쓰면 딥링크가 정확해집니다.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={() => void save()}>
              <Check size={12} className="mr-1" />
              {saving ? "저장 중…" : "저장"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              <X size={12} className="mr-1" />
              취소
            </Button>
          </div>
        </div>
      ) : !hasAnyValue(a) ? (
        <p className="mt-2.5 text-xs text-muted-foreground">
          아직 분석 정보가 없습니다 — &lsquo;분석 추가&rsquo;로 직접 입력할 수 있습니다.
        </p>
      ) : (
        <dl className="mt-2.5 space-y-2 text-sm">
          {(a!.subjects?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">연구대상</dt>
              <dd className="flex flex-wrap gap-1">
                {a!.subjects!.map((sv) => (
                  <span key={sv} className="rounded-full bg-card px-2 py-0.5 text-xs">{sv}</span>
                ))}
              </dd>
            </div>
          )}
          {(a!.independent?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">독립변인</dt>
              <dd className="text-xs text-foreground/85">{a!.independent!.join(" · ")}</dd>
            </div>
          )}
          {(a!.dependent?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">종속변인</dt>
              <dd className="text-xs text-foreground/85">{a!.dependent!.join(" · ")}</dd>
            </div>
          )}
          {(a!.statMethods?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">통계방법</dt>
              <dd className="flex flex-wrap gap-1">
                {a!.statMethods!.map((sv) => (
                  <Link
                    key={sv}
                    href={`/archive/statistical-methods?q=${encodeURIComponent(sv.split(" ")[0])}`}
                    className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {sv}
                  </Link>
                ))}
              </dd>
            </div>
          )}
          {(a!.researchMethods?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="w-16 shrink-0 text-xs font-semibold text-muted-foreground">연구방법</dt>
              <dd className="flex flex-wrap gap-1">
                {a!.researchMethods!.map((sv) => (
                  <Link
                    key={sv}
                    href={`/archive/research-methods?q=${encodeURIComponent(sv)}`}
                    className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {sv}
                  </Link>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
