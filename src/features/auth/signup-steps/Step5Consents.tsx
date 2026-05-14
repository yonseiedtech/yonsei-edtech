"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONSENT_LABELS,
  CONSENT_LINKS,
  CONSENT_SUMMARIES,
  buildFreshConsents,
  type ConsentKey,
  type UserConsents,
} from "@/lib/legal";

interface Step5ConsentsProps {
  consents: UserConsents;
  setConsents: (next: UserConsents) => void;
}

const REQUIRED_KEYS: ConsentKey[] = ["terms", "privacy", "collection"];
const ALL_KEYS: ConsentKey[] = [...REQUIRED_KEYS, "marketing"];

function toBoolMap(c: UserConsents) {
  return {
    terms: !!c.terms?.agreed,
    privacy: !!c.privacy?.agreed,
    collection: !!c.collection?.agreed,
    marketing: !!c.marketing?.agreed,
  };
}

export default function Step5Consents({
  consents,
  setConsents,
}: Step5ConsentsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const map = toBoolMap(consents);

  const allRequiredOk = REQUIRED_KEYS.every((k) => map[k]);
  const allChecked = allRequiredOk && map.marketing;

  function toggleAll() {
    const next = !allChecked;
    setConsents(
      buildFreshConsents({
        terms: next,
        privacy: next,
        collection: next,
        marketing: next,
      }),
    );
  }

  function toggleOne(key: ConsentKey) {
    const nextMap = { ...map, [key]: !map[key] };
    setConsents(buildFreshConsents(nextMap));
  }

  function toggleExpand(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">약관 동의</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          가입을 위해 필수 약관에 동의해주세요. 마케팅 수신은 선택입니다.
        </p>
      </header>

      {/* 전체 동의 */}
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
          allChecked
            ? "border-primary bg-primary/5"
            : "border-input bg-card hover:bg-muted/50",
        )}
        aria-pressed={allChecked}
      >
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
            allChecked ? "border-primary bg-primary" : "border-input",
          )}
        >
          {allChecked && (
            <Check size={12} className="text-primary-foreground" />
          )}
        </span>
        <span className="font-semibold">전체 동의 (마케팅 수신 포함)</span>
      </button>

      {/* 개별 약관 */}
      <ul className="space-y-2">
        {ALL_KEYS.map((key) => {
          const required = key !== "marketing";
          const checked = map[key];
          const isOpen = !!expanded[key];
          const summary = CONSENT_SUMMARIES[key];
          const link = CONSENT_LINKS[key];
          return (
            <li key={key} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleOne(key)}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    checked
                      ? "border-primary bg-primary"
                      : "border-input hover:border-primary/50",
                  )}
                  aria-pressed={checked}
                  aria-label={`${CONSENT_LABELS[key]} ${checked ? "해제" : "동의"}`}
                >
                  {checked && (
                    <Check size={12} className="text-primary-foreground" />
                  )}
                </button>
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {required && (
                      <span className="text-destructive">[필수] </span>
                    )}
                    {!required && (
                      <span className="text-muted-foreground">[선택] </span>
                    )}
                    {CONSENT_LABELS[key]}
                  </span>
                </div>
                {link && (
                  <Link
                    href={link}
                    target="_blank"
                    className="text-xs text-primary hover:underline"
                  >
                    전문
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => toggleExpand(key)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label="요약 펼침"
                >
                  {isOpen ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              </div>
              {isOpen && (
                <div className="border-t px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {summary.oneLine}
                  </p>
                  <p className="mt-1.5">{summary.body}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!allRequiredOk && (
        <p className="text-xs text-muted-foreground">
          * 필수 항목 모두 동의 시 &quot;가입 완료&quot; 버튼이 활성화됩니다.
        </p>
      )}
    </section>
  );
}
