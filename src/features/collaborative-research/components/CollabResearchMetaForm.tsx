"use client";

import { useMemo, useState } from "react";
import { Save, Info, Crown, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StringListEditor from "./StringListEditor";
import CheckpointEditor from "./CheckpointEditor";
import InviteDraftPicker, { type InviteDraft } from "./InviteDraftPicker";
import {
  COLLABORATION_TYPE_LABELS,
  METHODOLOGY_KIND_LABELS,
  METHODOLOGY_DESIGN_LABELS,
  IRB_STATUS_LABELS,
} from "../lib/research-status";
import {
  METHODOLOGY_KIND_INFO,
  METHODOLOGY_DESIGN_INFO,
  getAnalysisOptionsByKind,
} from "../lib/methodology-info";
import type {
  CollaborativeResearch,
  CollaborationType,
  CreateCollabResearchInput,
  UpdateCollabResearchInput,
  IrbStatus,
  MethodologyDesign,
  MethodologyKind,
  ScheduleMilestone,
} from "@/types";

interface CreateProps {
  mode: "create";
  leaderId: string;
  leaderName?: string;
  onSubmit: (
    input: CreateCollabResearchInput,
    invites: InviteDraft[],
  ) => Promise<unknown>;
  submitting?: boolean;
}

interface EditProps {
  mode: "edit";
  research: CollaborativeResearch;
  leaderName?: string;
  onSubmit: (patch: UpdateCollabResearchInput) => Promise<unknown>;
  submitting?: boolean;
}

type Props = CreateProps | EditProps;

interface FormState {
  title: string;
  shortTitle: string;
  collaborationType: CollaborationType;
  researchTopic: string;
  researchPurpose: string;
  researchQuestions: string[];
  audience: string[];
  expectedOutcome: string;
  startDate: string;
  targetEndDate: string;
  kickoffDate: string;
  checkpoints: ScheduleMilestone[];
  tagsRaw: string;
  methodologyKind: MethodologyKind | "";
  methodologyDesign: MethodologyDesign | "";
  samplingPlan: string;
  dataCollectionPlan: string;
  analysisMethodPlan: string;
  experimentalGroupPlan: string;
  controlGroupPlan: string;
  ethicsNote: string;
  irbRequired: boolean;
  irbStatus: IrbStatus | "";
  irbApprovalNumber: string;
  irbApprovalDate: string;
}

function emptyState(): FormState {
  return {
    title: "",
    shortTitle: "",
    collaborationType: "peer",
    researchTopic: "",
    researchPurpose: "",
    researchQuestions: [],
    audience: [],
    expectedOutcome: "",
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: "",
    kickoffDate: "",
    checkpoints: [],
    tagsRaw: "",
    methodologyKind: "",
    methodologyDesign: "",
    samplingPlan: "",
    dataCollectionPlan: "",
    analysisMethodPlan: "",
    experimentalGroupPlan: "",
    controlGroupPlan: "",
    ethicsNote: "",
    irbRequired: false,
    irbStatus: "",
    irbApprovalNumber: "",
    irbApprovalDate: "",
  };
}

function fromResearch(r: CollaborativeResearch): FormState {
  return {
    title: r.title ?? "",
    shortTitle: r.shortTitle ?? "",
    collaborationType: r.collaborationType,
    researchTopic: r.researchTopic ?? "",
    researchPurpose: r.researchPurpose ?? "",
    researchQuestions: r.researchQuestions ?? [],
    audience: r.audience ?? [],
    expectedOutcome: r.expectedOutcome ?? "",
    startDate: r.startDate ?? "",
    targetEndDate: r.targetEndDate ?? "",
    kickoffDate: r.kickoffDate ?? "",
    checkpoints: r.checkpoints ?? [],
    tagsRaw: (r.tags ?? []).join(", "),
    methodologyKind: r.methodology?.kind ?? "",
    methodologyDesign: r.methodology?.design ?? "",
    samplingPlan: r.methodology?.sampling ?? "",
    dataCollectionPlan: r.methodology?.dataCollection ?? "",
    analysisMethodPlan: r.methodology?.analysisMethod ?? "",
    experimentalGroupPlan: r.experimentalGroupPlan ?? "",
    controlGroupPlan: r.controlGroupPlan ?? "",
    ethicsNote: r.methodology?.ethicsNote ?? "",
    irbRequired: r.irbStatus?.required ?? false,
    irbStatus: r.irbStatus?.status ?? "",
    irbApprovalNumber: r.irbStatus?.approvalNumber ?? "",
    irbApprovalDate: r.irbStatus?.approvalDate ?? "",
  };
}

const COLLABORATION_TYPE_DESCRIPTIONS: Record<CollaborationType, { title: string; detail: string }> = {
  peer: {
    title: "동료 자율 (peer)",
    detail:
      "동기·선후배가 자발적으로 모여 진행하는 일반적인 공동 연구입니다. 학회 운영진의 개입 없이 팀 내부에서 자율적으로 운영되며, 데이터·진행 상황은 팀 멤버만 볼 수 있습니다.",
  },
  society: {
    title: "학회 배정 (society)",
    detail:
      "학회 차원에서 공식적으로 배정한 연구입니다. 학회 운영진(staff·운영진·회장·관리자)이 진행 상황을 감리할 수 있도록 자동으로 read 권한을 받습니다. " +
      "즉, 운영진은 연구 메타·멤버·진도를 볼 수 있지만 수정은 여전히 팀 리더만 가능합니다. 학회 연감·공식 리포트 등 공동 의사결정이 필요한 연구에 적합합니다.",
  },
};

const SHOWS_GROUP_PLAN: MethodologyDesign[] = ["experimental", "quasi_experimental"];

export default function CollabResearchMetaForm(props: Props) {
  const [state, setState] = useState<FormState>(
    props.mode === "edit" ? fromResearch(props.research) : emptyState(),
  );
  const [inviteDrafts, setInviteDrafts] = useState<InviteDraft[]>([]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const kindInfo = state.methodologyKind ? METHODOLOGY_KIND_INFO[state.methodologyKind] : null;
  const designInfo = state.methodologyDesign
    ? METHODOLOGY_DESIGN_INFO[state.methodologyDesign]
    : null;
  const analysisOptions = useMemo(
    () => getAnalysisOptionsByKind(state.methodologyKind),
    [state.methodologyKind],
  );
  const showsGroupPlan = state.methodologyDesign && SHOWS_GROUP_PLAN.includes(state.methodologyDesign);

  const buildPayload = () => {
    const tags = state.tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const methodology = state.methodologyKind
      ? {
          kind: state.methodologyKind as MethodologyKind,
          ...(state.methodologyDesign
            ? { design: state.methodologyDesign as MethodologyDesign }
            : {}),
          ...(state.samplingPlan ? { sampling: state.samplingPlan } : {}),
          ...(state.dataCollectionPlan ? { dataCollection: state.dataCollectionPlan } : {}),
          ...(state.analysisMethodPlan ? { analysisMethod: state.analysisMethodPlan } : {}),
          ...(state.ethicsNote ? { ethicsNote: state.ethicsNote } : {}),
        }
      : undefined;

    const irbStatus =
      state.irbRequired || state.irbStatus
        ? {
            required: state.irbRequired,
            ...(state.irbStatus ? { status: state.irbStatus as IrbStatus } : {}),
            ...(state.irbApprovalNumber ? { approvalNumber: state.irbApprovalNumber } : {}),
            ...(state.irbApprovalDate ? { approvalDate: state.irbApprovalDate } : {}),
          }
        : undefined;

    return {
      title: state.title.trim(),
      shortTitle: state.shortTitle.trim() || undefined,
      collaborationType: state.collaborationType,
      researchTopic: state.researchTopic.trim(),
      researchPurpose: state.researchPurpose.trim(),
      researchQuestions: state.researchQuestions.length ? state.researchQuestions : undefined,
      audience: state.audience.length ? state.audience : undefined,
      expectedOutcome: state.expectedOutcome.trim() || undefined,
      startDate: state.startDate,
      targetEndDate: state.targetEndDate || undefined,
      kickoffDate: state.kickoffDate || undefined,
      checkpoints: state.checkpoints.length ? state.checkpoints : undefined,
      tags,
      methodology,
      experimentalGroupPlan: showsGroupPlan && state.experimentalGroupPlan
        ? state.experimentalGroupPlan
        : undefined,
      controlGroupPlan: showsGroupPlan && state.controlGroupPlan
        ? state.controlGroupPlan
        : undefined,
      irbStatus,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload.title || !payload.researchTopic || !payload.researchPurpose) {
      alert("연구 제목·주제·목적은 필수 항목입니다.");
      return;
    }

    if (props.mode === "create") {
      const input: CreateCollabResearchInput = {
        ...payload,
        status: "planning",
        leaderId: props.leaderId,
        conceptIds: [],
        methodIds: [],
        workspaceVisibility: "members_only",
        createdBy: props.leaderId,
      };
      await props.onSubmit(input, inviteDrafts);
    } else {
      const patch: UpdateCollabResearchInput = payload;
      await props.onSubmit(patch);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 책임연구자 안내 (생성 모드 한정) */}
      {props.mode === "create" && (
        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="flex items-start gap-3 p-4 text-sm">
            <Crown className="mt-0.5 shrink-0 text-violet-600" size={18} />
            <div>
              <p className="font-medium text-violet-900">
                책임연구자(leader): <span className="font-semibold">{props.leaderName ?? "본인"}</span>
              </p>
              <p className="mt-1 text-xs text-violet-700">
                팀을 생성한 사용자가 자동으로 책임연구자가 됩니다. 다른 회원에게 책임 이양은
                Phase 4 (v2)에서 별도 워크플로우로 지원될 예정입니다. 지금은 공동연구자
                (co-researcher) 역할로 추가하여 함께 운영하실 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. 기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="collab-title">
              연구 제목 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="collab-title"
              value={state.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="예: 마이크로러닝이 학습몰입에 미치는 효과 메타분석"
              required
            />
          </div>
          <div>
            <Label htmlFor="collab-shortTitle">짧은 제목 (목록 카드용, 선택)</Label>
            <Input
              id="collab-shortTitle"
              value={state.shortTitle}
              onChange={(e) => update("shortTitle", e.target.value)}
              maxLength={30}
              placeholder="30자 이내"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="collab-type">협업 형태</Label>
            <select
              id="collab-type"
              value={state.collaborationType}
              onChange={(e) =>
                update("collaborationType", e.target.value as CollaborationType)
              }
              className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="peer">{COLLABORATION_TYPE_LABELS.peer}</option>
              <option value="society">{COLLABORATION_TYPE_LABELS.society}</option>
            </select>
            <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="mb-1 font-semibold">
                {COLLABORATION_TYPE_DESCRIPTIONS[state.collaborationType].title}
              </p>
              <p className="leading-relaxed">
                {COLLABORATION_TYPE_DESCRIPTIONS[state.collaborationType].detail}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="collab-tags">태그 (콤마 구분)</Label>
            <Input
              id="collab-tags"
              value={state.tagsRaw}
              onChange={(e) => update("tagsRaw", e.target.value)}
              placeholder="예: 메타분석, 학습몰입, 마이크로러닝"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. 연구 내용 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 연구 내용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="collab-topic">
              연구 주제 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="collab-topic"
              value={state.researchTopic}
              onChange={(e) => update("researchTopic", e.target.value)}
              rows={2}
              required
            />
          </div>
          <div>
            <Label htmlFor="collab-purpose">
              연구 목적 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="collab-purpose"
              value={state.researchPurpose}
              onChange={(e) => update("researchPurpose", e.target.value)}
              rows={3}
              required
            />
          </div>

          <div>
            <Label>연구 문제 (Research Questions)</Label>
            <StringListEditor
              value={state.researchQuestions}
              onChange={(v) => update("researchQuestions", v)}
              placeholder="예: 마이크로러닝의 효과는 학습자 특성에 따라 어떻게 다른가?"
              itemPrefix="RQ"
              emptyLabel="문제 단위로 추가·삭제할 수 있습니다."
            />
          </div>

          <div>
            <Label>연구 대상 (Participants)</Label>
            <StringListEditor
              value={state.audience}
              onChange={(v) => update("audience", v)}
              placeholder="예: 서울 소재 4년제 대학원생 50명, 초등 5학년 두 학급"
              emptyLabel="연구 참여자의 집단·특성을 항목별로 입력하세요."
            />
          </div>

          <div>
            <Label htmlFor="collab-outcome">기대 산출물</Label>
            <Textarea
              id="collab-outcome"
              value={state.expectedOutcome}
              onChange={(e) => update("expectedOutcome", e.target.value)}
              rows={2}
              placeholder="예: 학회 연구지 1편, 학술대회 발표 1건"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. 연구 방법 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. 연구 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="collab-method-kind">연구 유형</Label>
              <select
                id="collab-method-kind"
                value={state.methodologyKind}
                onChange={(e) =>
                  update("methodologyKind", e.target.value as MethodologyKind | "")
                }
                className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">선택</option>
                {Object.entries(METHODOLOGY_KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="collab-method-design">연구 설계</Label>
              <select
                id="collab-method-design"
                value={state.methodologyDesign}
                onChange={(e) =>
                  update("methodologyDesign", e.target.value as MethodologyDesign | "")
                }
                className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">선택</option>
                {Object.entries(METHODOLOGY_DESIGN_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 동적 정의·유의점 */}
          {kindInfo && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Info size={13} />
                연구 유형: {METHODOLOGY_KIND_LABELS[state.methodologyKind as MethodologyKind]}
              </p>
              <p className="mt-1 text-xs text-emerald-900">{kindInfo.definition}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-emerald-900">
                {kindInfo.cautions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              {kindInfo.examples && (
                <p className="mt-1 text-xs text-emerald-700">
                  💡 예시: {kindInfo.examples.join(" · ")}
                </p>
              )}
            </div>
          )}
          {designInfo && (
            <div className="rounded border border-blue-200 bg-blue-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                <Info size={13} />
                연구 설계: {METHODOLOGY_DESIGN_LABELS[state.methodologyDesign as MethodologyDesign]}
              </p>
              <p className="mt-1 text-xs text-blue-900">{designInfo.definition}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-blue-900">
                {designInfo.cautions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
              {designInfo.examples && (
                <p className="mt-1 text-xs text-blue-700">
                  💡 예시: {designInfo.examples.join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* 실험/통제집단 (실험연구·준실험연구에서만) */}
          {showsGroupPlan && (
            <div className="space-y-3 rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                실험집단·통제집단 구성 계획 ({METHODOLOGY_DESIGN_LABELS[state.methodologyDesign as MethodologyDesign]})
              </p>
              <div>
                <Label htmlFor="collab-exp-group" className="text-xs">
                  실험집단 (처치를 받는 집단)
                </Label>
                <Textarea
                  id="collab-exp-group"
                  rows={2}
                  value={state.experimentalGroupPlan}
                  onChange={(e) => update("experimentalGroupPlan", e.target.value)}
                  placeholder="예: 대학원생 25명, 4주간 마이크로러닝 영상 + 형성평가 제공"
                />
              </div>
              <div>
                <Label htmlFor="collab-ctrl-group" className="text-xs">
                  통제집단 (비교 기준이 되는 집단)
                </Label>
                <Textarea
                  id="collab-ctrl-group"
                  rows={2}
                  value={state.controlGroupPlan}
                  onChange={(e) => update("controlGroupPlan", e.target.value)}
                  placeholder="예: 대학원생 25명, 동일 기간 동안 기존 강의식 영상만 제공"
                />
              </div>
              <p className="text-xs text-amber-800">
                💡 무작위 할당(실험연구) 또는 사전검사 동질성 확보(준실험연구)로 두 집단의 비교가 가능해야 합니다.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="collab-sampling">표집 전략</Label>
            <Textarea
              id="collab-sampling"
              value={state.samplingPlan}
              onChange={(e) => update("samplingPlan", e.target.value)}
              rows={2}
              placeholder="예: 편의표집, 의도적 표집, 무작위 추출 등"
            />
          </div>

          <div>
            <Label htmlFor="collab-datacoll">자료 수집 계획</Label>
            <Textarea
              id="collab-datacoll"
              value={state.dataCollectionPlan}
              onChange={(e) => update("dataCollectionPlan", e.target.value)}
              rows={2}
              placeholder="예: 사전·사후 설문, 학습 로그, 반구조화 인터뷰 30분 × 10명"
            />
          </div>

          <div>
            <Label htmlFor="collab-analysis">분석 방법</Label>
            <Textarea
              id="collab-analysis"
              value={state.analysisMethodPlan}
              onChange={(e) => update("analysisMethodPlan", e.target.value)}
              rows={3}
              placeholder="구체적인 분석 절차를 기술하세요. (어떤 변인을 어떤 검정으로 분석할지, 분석 도구는 무엇인지 등)"
            />
            {analysisOptions.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="flex items-center gap-1 text-xs font-medium text-zinc-600">
                  <Lightbulb size={12} /> 추천 분석 기법 (클릭하면 위 텍스트에 추가됩니다)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {analysisOptions.map((opt) => (
                    <button
                      key={opt.name}
                      type="button"
                      title={opt.desc}
                      onClick={() =>
                        update(
                          "analysisMethodPlan",
                          state.analysisMethodPlan
                            ? `${state.analysisMethodPlan}\n• ${opt.name} — ${opt.desc}`
                            : `• ${opt.name} — ${opt.desc}`,
                        )
                      }
                      className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs hover:border-primary hover:bg-primary/5"
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="collab-ethics">윤리적 고려사항</Label>
            <Textarea
              id="collab-ethics"
              value={state.ethicsNote}
              onChange={(e) => update("ethicsNote", e.target.value)}
              rows={2}
              placeholder="동의서 절차, 익명화, 데이터 보관·폐기 계획 등"
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. IRB */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. 연구윤리(IRB) 추적</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={state.irbRequired}
              onChange={(e) => update("irbRequired", e.target.checked)}
            />
            <span className="text-sm">IRB 심의가 필요한 연구입니다</span>
          </label>
          {state.irbRequired && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="collab-irb-status">심의 상태</Label>
                  <select
                    id="collab-irb-status"
                    value={state.irbStatus}
                    onChange={(e) => update("irbStatus", e.target.value as IrbStatus | "")}
                    className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="">선택</option>
                    {Object.entries(IRB_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="collab-irb-num">승인 번호</Label>
                  <Input
                    id="collab-irb-num"
                    value={state.irbApprovalNumber}
                    onChange={(e) => update("irbApprovalNumber", e.target.value)}
                    placeholder="예: 연세대 IRB-2026-1234"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="collab-irb-date">승인일</Label>
                <Input
                  id="collab-irb-date"
                  type="date"
                  value={state.irbApprovalDate}
                  onChange={(e) => update("irbApprovalDate", e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. 일정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. 일정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="collab-start">
                시작일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="collab-start"
                type="date"
                value={state.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="collab-kickoff">킥오프 미팅</Label>
              <Input
                id="collab-kickoff"
                type="date"
                value={state.kickoffDate}
                onChange={(e) => update("kickoffDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="collab-target">목표 종료일</Label>
              <Input
                id="collab-target"
                type="date"
                value={state.targetEndDate}
                onChange={(e) => update("targetEndDate", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>중간 점검·발표 일정 (마일스톤)</Label>
            <CheckpointEditor
              value={state.checkpoints}
              onChange={(v) => update("checkpoints", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. 팀원 동시 초대 (생성 모드 한정) */}
      {props.mode === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">6. 팀원 초대 (선택)</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteDraftPicker
              value={inviteDrafts}
              onChange={setInviteDrafts}
              excludeUserIds={[props.leaderId]}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={props.submitting}>
          <Save size={14} className="mr-1" />
          {props.mode === "create"
            ? inviteDrafts.length > 0
              ? `팀 생성 + ${inviteDrafts.length}명 초대`
              : "팀 생성"
            : "저장"}
        </Button>
      </div>
    </form>
  );
}
