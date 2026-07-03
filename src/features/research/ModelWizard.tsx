"use client";

/**
 * 연구 모형 마법사 (2026-07-03 — 사용자 요청)
 *
 * "연구모형 그리기가 어렵다"는 피드백 대응:
 *  1) 질문으로 만들기 — 변인 이름 몇 개만 입력하면 표준 배치·관계까지 자동 생성
 *  2) 템플릿에서 시작 — 대표 모형 5종(기본 인과·매개·조절·조절된 매개·다중 독립)
 * 생성 결과는 ResearchModelData 로 반환 — 이후 캔버스에서 자유롭게 수정.
 */

import { useMemo, useState } from "react";
import { Wand2, LayoutTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  ResearchModelData, ResearchModelNode, ResearchModelEdge, VariableKind,
} from "@/types/research-model";

function nid(prefix: string, i: number): string {
  return `${prefix}-${Date.now().toString(36)}-${i}`;
}

/** 쉼표/줄바꿈 구분 입력 → 이름 배열 */
function parseNames(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * 변인 목록으로 표준 배치 모형 생성.
 * 배치: 독립(좌) → 매개(중) → 종속(우), 조절(중앙 상단), 통제(좌측 하단).
 * 관계: X→M, M→Y, X→Y(직접), W⇢Y(조절, 점선), C⇢Y(통제, 점선).
 */
export function buildModel(vars: {
  independents: string[];
  dependents: string[];
  mediator?: string;
  moderator?: string;
  controls?: string[];
}): ResearchModelData {
  const nodes: ResearchModelNode[] = [];
  const edges: ResearchModelEdge[] = [];
  const X = vars.independents.length ? vars.independents : ["독립변인"];
  const Y = vars.dependents.length ? vars.dependents : ["종속변인"];

  const xIds: string[] = [];
  X.forEach((label, i) => {
    const id = nid("x", i);
    xIds.push(id);
    nodes.push({ id, type: "independent", label, x: 40, y: 180 + i * 110 });
  });

  let mId: string | null = null;
  if (vars.mediator) {
    mId = nid("m", 0);
    const midY = 180 + ((X.length - 1) * 110) / 2;
    nodes.push({ id: mId, type: "mediator", label: vars.mediator, x: 330, y: midY });
  }

  const yIds: string[] = [];
  Y.forEach((label, i) => {
    const id = nid("y", i);
    yIds.push(id);
    nodes.push({ id, type: "dependent", label, x: 620, y: 180 + i * 110 });
  });

  if (vars.moderator) {
    const wId = nid("w", 0);
    // QA-v2: 음수 y 는 기본 뷰포트 밖 — 상단 여백(양수) 안에 배치
    nodes.push({ id: wId, type: "moderator", label: vars.moderator, x: 330, y: 30 });
    yIds.forEach((yId, i) =>
      edges.push({ id: nid("ew", i), source: wId, target: yId, relation: "correlational", label: "조절" }),
    );
  }

  (vars.controls ?? []).forEach((label, i) => {
    const cId = nid("c", i);
    nodes.push({ id: cId, type: "control", label, x: 40, y: 180 + (X.length + i) * 110 + 60 });
    yIds.forEach((yId, j) =>
      edges.push({ id: nid("ec", i * 10 + j), source: cId, target: yId, relation: "correlational", label: "통제" }),
    );
  });

  let h = 1;
  xIds.forEach((xId, i) => {
    if (mId) {
      edges.push({ id: nid("exm", i), source: xId, target: mId, relation: "causal", label: `H${h++}` });
    }
    yIds.forEach((yId, j) => {
      edges.push({ id: nid("exy", i * 10 + j), source: xId, target: yId, relation: "causal", label: `H${h++}` });
    });
  });
  if (mId) {
    yIds.forEach((yId, j) => {
      edges.push({ id: nid("emy", j), source: mId!, target: yId, relation: "causal", label: `H${h++}` });
    });
  }

  return { nodes, edges };
}

/** 대표 모형 템플릿 5종 — 자리표시 라벨로 생성 후 캔버스에서 이름만 바꾸면 됨 */
const TEMPLATES: { key: string; name: string; desc: string; build: () => ResearchModelData }[] = [
  {
    key: "basic",
    name: "기본 인과 모형",
    desc: "X → Y (+통제변인)",
    build: () => buildModel({ independents: ["독립변인 X"], dependents: ["종속변인 Y"], controls: ["통제변인"] }),
  },
  {
    key: "mediation",
    name: "매개 모형",
    desc: "X → M → Y (직접경로 포함)",
    build: () => buildModel({ independents: ["독립변인 X"], dependents: ["종속변인 Y"], mediator: "매개변인 M" }),
  },
  {
    key: "moderation",
    name: "조절 모형",
    desc: "X → Y, W가 관계를 조절",
    build: () => buildModel({ independents: ["독립변인 X"], dependents: ["종속변인 Y"], moderator: "조절변인 W" }),
  },
  {
    key: "modmed",
    name: "조절된 매개",
    desc: "X → M → Y + 조절변인 W",
    build: () =>
      buildModel({ independents: ["독립변인 X"], dependents: ["종속변인 Y"], mediator: "매개변인 M", moderator: "조절변인 W" }),
  },
  {
    key: "multi",
    name: "다중 독립변인",
    desc: "X1·X2 → Y (비교·상대효과)",
    build: () => buildModel({ independents: ["독립변인 X1", "독립변인 X2"], dependents: ["종속변인 Y"] }),
  },
];

export default function ModelWizard({
  open,
  onOpenChange,
  hasExisting,
  onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** 기존 모형(노드 1개 이상)이 있으면 덮어쓰기 확인 */
  hasExisting: boolean;
  onApply: (model: ResearchModelData) => void;
}) {
  const [mode, setMode] = useState<"wizard" | "template">("wizard");
  const [xRaw, setXRaw] = useState("");
  const [yRaw, setYRaw] = useState("");
  const [mediator, setMediator] = useState("");
  const [moderator, setModerator] = useState("");
  const [cRaw, setCRaw] = useState("");

  const canGenerate = useMemo(
    () => parseNames(xRaw).length > 0 && parseNames(yRaw).length > 0,
    [xRaw, yRaw],
  );

  function apply(model: ResearchModelData) {
    if (hasExisting && !confirm("기존 모형을 덮어씁니다. 계속할까요?")) return;
    onApply(model);
    onOpenChange(false);
  }

  function generate() {
    if (!canGenerate) return;
    apply(
      buildModel({
        independents: parseNames(xRaw),
        dependents: parseNames(yRaw),
        mediator: mediator.trim() || undefined,
        moderator: moderator.trim() || undefined,
        controls: parseNames(cRaw),
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 size={16} className="text-primary" />
            연구 모형 만들기
          </DialogTitle>
        </DialogHeader>

        {/* 모드 선택 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("wizard")}
            className={cn(
              "rounded-xl border p-3 text-left text-sm transition-colors",
              mode === "wizard" ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted",
            )}
          >
            <Wand2 size={14} className="mb-1 text-primary" />
            질문으로 만들기
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              변인 이름만 넣으면 배치·관계 자동 생성
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("template")}
            className={cn(
              "rounded-xl border p-3 text-left text-sm transition-colors",
              mode === "template" ? "border-primary bg-primary/5 font-semibold" : "hover:bg-muted",
            )}
          >
            <LayoutTemplate size={14} className="mb-1 text-primary" />
            템플릿에서 시작
            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
              대표 모형 5종 중 선택 후 이름만 수정
            </span>
          </button>
        </div>

        {mode === "wizard" ? (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="font-semibold">① 원인이 되는 변인 (독립변인)</span>
              <span className="ml-1 text-xs text-muted-foreground">쉼표로 여러 개 (최대 4)</span>
              <Input
                className="mt-1"
                value={xRaw}
                onChange={(e) => setXRaw(e.target.value)}
                placeholder="예: AI 피드백 활용"
              />
            </label>
            <label className="block">
              <span className="font-semibold">② 결과가 되는 변인 (종속변인)</span>
              <Input
                className="mt-1"
                value={yRaw}
                onChange={(e) => setYRaw(e.target.value)}
                placeholder="예: 쓰기 능력, 쓰기 동기"
              />
            </label>
            <label className="block">
              <span className="font-semibold">③ 둘 사이를 설명하는 변인 (매개변인)</span>
              <span className="ml-1 text-xs text-muted-foreground">선택 — X가 Y에 영향을 주는 '경로'</span>
              <Input
                className="mt-1"
                value={mediator}
                onChange={(e) => setMediator(e.target.value)}
                placeholder="예: 학습 몰입 (없으면 비워두세요)"
              />
            </label>
            <label className="block">
              <span className="font-semibold">④ 관계의 강도를 바꾸는 변인 (조절변인)</span>
              <span className="ml-1 text-xs text-muted-foreground">선택 — '누구에게 더 효과적인가'</span>
              <Input
                className="mt-1"
                value={moderator}
                onChange={(e) => setModerator(e.target.value)}
                placeholder="예: 사전 성취 수준 (없으면 비워두세요)"
              />
            </label>
            <label className="block">
              <span className="font-semibold">⑤ 영향을 제거하고 싶은 변인 (통제변인)</span>
              <span className="ml-1 text-xs text-muted-foreground">선택 · 쉼표로 여러 개</span>
              <Input
                className="mt-1"
                value={cRaw}
                onChange={(e) => setCRaw(e.target.value)}
                placeholder="예: 사전 점수, 학년"
              />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => apply(t.build())}
                className="rounded-xl border p-3 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="font-semibold">{t.name}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          {mode === "wizard" && (
            <Button onClick={generate} disabled={!canGenerate}>
              <Wand2 size={14} className="mr-1.5" />
              모형 생성
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
