"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import {
  buildFreshConsents,
  CONSENT_LABELS,
  CONSENT_LINKS,
  CONSENT_SUMMARIES,
  type UserConsents,
} from "@/lib/legal";
import { cn } from "@/lib/utils";

export interface ConsentStepsProps {
  initialConsents?: UserConsents;
  mode: "signup" | "regate";
  /** 최종 확인 단계의 "사이트 이용하기" 또는 "확인 후 계속" 클릭 시 호출 */
  onComplete: (consents: UserConsents) => void | Promise<void>;
  /** 좌측 하단 취소 버튼(로그아웃 또는 뒤로가기) */
  onCancel?: () => void;
  cancelLabel?: string;
  submitting?: boolean;
}

type StepKey = 1 | 2 | 3 | 4 | 5;

interface ConsentItem {
  key: "terms" | "privacy" | "collection" | "marketing";
  required: boolean;
}

const STEP_ITEMS: Record<1 | 2 | 3 | 4, ConsentItem> = {
  1: { key: "terms", required: true },
  2: { key: "privacy", required: true },
  3: { key: "collection", required: true },
  4: { key: "marketing", required: false },
};

export default function ConsentSteps({
  initialConsents,
  mode,
  onComplete,
  onCancel,
  cancelLabel,
  submitting,
}: ConsentStepsProps) {
  const [step, setStep] = useState<StepKey>(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [agree, setAgree] = useState({
    terms: !!initialConsents?.terms?.agreed,
    privacy: !!initialConsents?.privacy?.agreed,
    collection: !!initialConsents?.collection?.agreed,
    marketing: !!initialConsents?.marketing?.agreed,
  });

  const isFinal = step === 5;
  const currentItem = step >= 1 && step <= 4 ? STEP_ITEMS[step as 1 | 2 | 3 | 4] : null;

  const canProceed = useMemo(() => {
    if (!currentItem) return true;
    if (!currentItem.required) return true;
    return agree[currentItem.key];
  }, [currentItem, agree]);

  function goNext() {
    if (step < 5) setStep((step + 1) as StepKey);
  }
  function goPrev() {
    if (step > 1) setStep((step - 1) as StepKey);
  }

  async function handleFinal() {
    const consents = buildFreshConsents({
      terms: agree.terms,
      privacy: agree.privacy,
      collection: agree.collection,
      marketing: agree.marketing,
    });
    await onComplete(consents);
  }

  const nextLabel = step <= 3 ? "다음 →" : step === 4 ? "확인" : "이어서 가입하기";

  return (
    <div className="flex flex-col gap-4">
      {/* Stepper indicator */}
      <div className="flex items-center justify-between gap-1 text-xs">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {step} / 5 단계
      </p>

      {/* Step content */}
      {currentItem && (
        <StepConsentBlock
          itemKey={currentItem.key}
          required={currentItem.required}
          checked={agree[currentItem.key]}
          onCheck={(v) => setAgree((a) => ({ ...a, [currentItem.key]: v }))}
          expanded={!!expanded[currentItem.key]}
          onToggle={() =>
            setExpanded((e) => ({ ...e, [currentItem.key]: !e[currentItem.key] }))
          }
        />
      )}

      {isFinal && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h3 className="mb-2 text-sm font-semibold">동의 항목 확인</h3>
          <ul className="space-y-2 text-sm">
            {([
              { k: "terms", required: true },
              { k: "privacy", required: true },
              { k: "collection", required: true },
              { k: "marketing", required: false },
            ] as const).map(({ k, required }) => (
              <li key={k} className="flex items-center gap-2">
                <Check
                  size={16}
                  className={cn(
                    agree[k] ? "text-primary" : "text-muted-foreground/40",
                  )}
                />
                <span className={cn(agree[k] ? "" : "text-muted-foreground/70")}>
                  [{required ? "필수" : "선택"}] {CONSENT_LABELS[k]}
                  {!agree[k] && <span className="ml-1 text-xs text-muted-foreground">(동의 안 함)</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {mode === "signup"
              ? "아래 버튼을 누르면 가입 정보 입력 단계로 이동합니다."
              : "아래 버튼을 누르면 동의 내역이 저장되고 사이트를 계속 이용하실 수 있습니다."}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={submitting}>
            {cancelLabel ?? (mode === "regate" ? "로그아웃" : "취소")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={goPrev}
            disabled={step === 1 || submitting}
          >
            ← 이전
          </Button>
          {isFinal ? (
            <Button type="button" onClick={handleFinal} disabled={submitting}>
              {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              {nextLabel}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={!canProceed || submitting}>
              {nextLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepConsentBlock({
  itemKey,
  required,
  checked,
  onCheck,
  expanded,
  onToggle,
}: {
  itemKey: "terms" | "privacy" | "collection" | "marketing";
  required: boolean;
  checked: boolean;
  onCheck: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const summary = CONSENT_SUMMARIES[itemKey];
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold">
          [{required ? "필수" : "선택"}] {CONSENT_LABELS[itemKey]}
        </h3>
        <Link
          href={CONSENT_LINKS[itemKey]}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary hover:underline"
        >
          전체 보기
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">{summary.oneLine}</p>

      <button
        type="button"
        onClick={onToggle}
        className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? (
          <>
            <ChevronUp size={14} /> 요약 접기
          </>
        ) : (
          <>
            <ChevronDown size={14} /> 요약 펼쳐서 보기
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md bg-card p-3 text-xs leading-relaxed text-foreground/80">
          {summary.body}
        </div>
      )}

      <label className="mt-4 flex cursor-pointer items-center gap-2 border-t pt-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-sm">
          위 내용에 동의합니다{required ? " (필수)" : " (선택)"}
        </span>
      </label>
    </div>
  );
}
