"use client";

/**
 * 연구윤리 체크리스트 패널 (R2, 2026-07-03)
 *
 * 연구 방법 장 하단에 노출. 석사논문 심사에서 확인하는 연구윤리 요건
 * (동의·IRB·개인정보·보관·철회권·보고)을 체크리스트로 점검하고,
 * 체크한 항목의 표준 보고 문형을 조합해 '연구 윤리' 절에 삽입한다.
 * 체크 상태는 WritingPaper.ethicsChecked 로 저장(문서 단위 영속).
 */

import { ShieldCheck, ChevronRight, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface EthicsItem {
  id: string;
  label: string;
  hint: string;
  /** 보고 문형 — 체크 시 '문형 삽입' 조합에 포함 (없으면 점검 전용 항목) */
  phrase?: string;
}

export const ETHICS_ITEMS: EthicsItem[] = [
  {
    id: "consent",
    label: "자발적 참여 동의 확보",
    hint: "연구 목적·절차·소요 시간을 설명하고 서면(또는 온라인) 동의를 받았는지",
    phrase:
      "연구 참여자에게 연구의 목적과 절차를 사전에 설명하고 자발적 참여 동의를 받았다.",
  },
  {
    id: "minor",
    label: "미성년 참여자 — 법정대리인 동의 (해당 시)",
    hint: "초·중·고 학생 대상 연구는 본인 동의 외에 보호자(법정대리인) 동의가 필요",
    phrase: "미성년 참여자의 경우 법정대리인의 동의를 함께 받았다.",
  },
  {
    id: "irb",
    label: "기관생명윤리위원회(IRB) 심의·승인 또는 면제 확인",
    hint: "사람 대상 연구는 소속 기관 IRB 심의 대상인지 먼저 확인 — 학교 현장 연구도 예외가 아님",
    phrase:
      "본 연구는 ___대학교 기관생명윤리위원회(IRB)의 승인(승인번호: ___)을 받아 수행되었다.",
  },
  {
    id: "privacy",
    label: "개인정보 최소 수집·익명(가명) 처리",
    hint: "이름 대신 식별코드 사용, 수집 항목은 연구에 필요한 최소한으로",
    phrase:
      "수집한 자료는 개인을 식별할 수 없도록 익명 처리하였으며 연구 목적으로만 사용하였다.",
  },
  {
    id: "storage",
    label: "자료 보안·보관 기간·폐기 계획",
    hint: "잠금 장치가 있는 저장소 보관, 보관 기간(통상 3년) 경과 후 폐기 계획 명시",
    phrase: "연구 자료는 잠금 장치가 있는 저장소에 보관하며, 보관 기간 경과 후 안전하게 폐기할 예정이다.",
  },
  {
    id: "withdraw",
    label: "불참·중도 철회 시 불이익 없음 고지",
    hint: "참여를 거부하거나 중단해도 성적 등 어떠한 불이익이 없음을 안내했는지",
    phrase: "참여자에게는 연구 참여를 언제든지 중단할 수 있으며 이로 인한 불이익이 없음을 안내하였다.",
  },
  {
    id: "report",
    label: "방법 장에 동의·승인 절차 보고",
    hint: "위 절차를 논문 연구 방법 장에 1~2문장으로 보고 — 아래 '보고 문형 삽입'으로 시작",
  },
];

export default function EthicsChecklistPanel({
  checked,
  readOnly,
  onChange,
  onInsert,
}: {
  checked: string[];
  readOnly?: boolean;
  onChange: (next: string[]) => void;
  /** 체크한 항목의 보고 문형을 조합해 방법 장 '연구 윤리' 절에 삽입 */
  onInsert: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const done = checked.filter((id) => ETHICS_ITEMS.some((it) => it.id === id)).length;

  function toggle(id: string) {
    if (readOnly) return;
    onChange(checked.includes(id) ? checked.filter((x) => x !== id) : [...checked, id]);
  }

  const phrases = ETHICS_ITEMS.filter((it) => it.phrase && checked.includes(it.id)).map(
    (it) => it.phrase!,
  );

  return (
    <div className="mt-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-800/50 dark:bg-emerald-950/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <ShieldCheck size={13} />
          연구윤리 체크리스트
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              done === ETHICS_ITEMS.length
                ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
            )}
          >
            {done}/{ETHICS_ITEMS.length}
          </span>
          <span className="font-normal text-emerald-700/80 dark:text-emerald-300/80">
            동의·IRB·개인정보 — 심사 전 필수 점검
          </span>
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-emerald-700/70 transition-transform dark:text-emerald-300/70",
            open && "rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="space-y-2 border-t border-emerald-200/60 px-3.5 py-3 dark:border-emerald-800/40">
          <ul className="space-y-1.5">
            {ETHICS_ITEMS.map((it) => {
              const on = checked.includes(it.id);
              return (
                <li key={it.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                      on
                        ? "border-emerald-300 bg-emerald-100/50 dark:border-emerald-700 dark:bg-emerald-900/20"
                        : "border-dashed bg-card/50 hover:border-emerald-300/70",
                      readOnly && "cursor-default",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(it.id)}
                      disabled={readOnly}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-emerald-600"
                    />
                    <span className="min-w-0 text-xs leading-relaxed">
                      <span className={cn("font-medium", on && "text-emerald-900 dark:text-emerald-100")}>
                        {it.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{it.hint}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {!readOnly && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <p className="text-[10px] text-muted-foreground">
                체크한 항목의 표준 문형을 조합해 &lsquo;연구 윤리&rsquo; 절에 삽입합니다 — 기관명·승인번호 빈칸(___)은 직접 채우세요.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 shrink-0 text-xs"
                disabled={phrases.length === 0}
                onClick={() => onInsert(phrases.join(" "))}
              >
                <ListPlus size={13} className="mr-1" />
                보고 문형 삽입 ({phrases.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
