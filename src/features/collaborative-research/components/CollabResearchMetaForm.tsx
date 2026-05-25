"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLABORATION_TYPE_LABELS,
  METHODOLOGY_KIND_LABELS,
  METHODOLOGY_DESIGN_LABELS,
  IRB_STATUS_LABELS,
} from "../lib/research-status";
import type {
  CollaborativeResearch,
  CollaborationType,
  CreateCollabResearchInput,
  UpdateCollabResearchInput,
  IrbStatus,
  MethodologyDesign,
  MethodologyKind,
} from "@/types";

interface CreateProps {
  mode: "create";
  leaderId: string;
  onSubmit: (input: CreateCollabResearchInput) => Promise<unknown>;
  submitting?: boolean;
}

interface EditProps {
  mode: "edit";
  research: CollaborativeResearch;
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
  researchQuestionsRaw: string; // 줄바꿈 구분
  expectedOutcome: string;
  startDate: string;
  targetEndDate: string;
  tagsRaw: string; // 콤마 구분
  methodologyKind: MethodologyKind | "";
  methodologyDesign: MethodologyDesign | "";
  samplingPlan: string;
  dataCollectionPlan: string;
  analysisMethodPlan: string;
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
    researchQuestionsRaw: "",
    expectedOutcome: "",
    startDate: new Date().toISOString().slice(0, 10),
    targetEndDate: "",
    tagsRaw: "",
    methodologyKind: "",
    methodologyDesign: "",
    samplingPlan: "",
    dataCollectionPlan: "",
    analysisMethodPlan: "",
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
    researchQuestionsRaw: (r.researchQuestions ?? []).join("\n"),
    expectedOutcome: r.expectedOutcome ?? "",
    startDate: r.startDate ?? "",
    targetEndDate: r.targetEndDate ?? "",
    tagsRaw: (r.tags ?? []).join(", "),
    methodologyKind: r.methodology?.kind ?? "",
    methodologyDesign: r.methodology?.design ?? "",
    samplingPlan: r.methodology?.sampling ?? "",
    dataCollectionPlan: r.methodology?.dataCollection ?? "",
    analysisMethodPlan: r.methodology?.analysisMethod ?? "",
    ethicsNote: r.methodology?.ethicsNote ?? "",
    irbRequired: r.irbStatus?.required ?? false,
    irbStatus: r.irbStatus?.status ?? "",
    irbApprovalNumber: r.irbStatus?.approvalNumber ?? "",
    irbApprovalDate: r.irbStatus?.approvalDate ?? "",
  };
}

export default function CollabResearchMetaForm(props: Props) {
  const [state, setState] = useState<FormState>(
    props.mode === "edit" ? fromResearch(props.research) : emptyState(),
  );

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const buildPayload = () => {
    const questions = state.researchQuestionsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
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
          ...(state.dataCollectionPlan
            ? { dataCollection: state.dataCollectionPlan }
            : {}),
          ...(state.analysisMethodPlan
            ? { analysisMethod: state.analysisMethodPlan }
            : {}),
          ...(state.ethicsNote ? { ethicsNote: state.ethicsNote } : {}),
        }
      : undefined;

    const irbStatus = state.irbRequired || state.irbStatus
      ? {
          required: state.irbRequired,
          ...(state.irbStatus ? { status: state.irbStatus as IrbStatus } : {}),
          ...(state.irbApprovalNumber
            ? { approvalNumber: state.irbApprovalNumber }
            : {}),
          ...(state.irbApprovalDate
            ? { approvalDate: state.irbApprovalDate }
            : {}),
        }
      : undefined;

    return {
      title: state.title.trim(),
      shortTitle: state.shortTitle.trim() || undefined,
      collaborationType: state.collaborationType,
      researchTopic: state.researchTopic.trim(),
      researchPurpose: state.researchPurpose.trim(),
      researchQuestions: questions.length ? questions : undefined,
      expectedOutcome: state.expectedOutcome.trim() || undefined,
      startDate: state.startDate,
      targetEndDate: state.targetEndDate || undefined,
      tags,
      methodology,
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
      await props.onSubmit(input);
    } else {
      const patch: UpdateCollabResearchInput = payload;
      await props.onSubmit(patch);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
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
              <p className="mt-1 text-xs text-zinc-500">
                society 발주는 운영진(staff+)이 자동 read 권한을 가집니다.
              </p>
            </div>
            <div>
              <Label htmlFor="collab-tags">태그 (콤마 구분)</Label>
              <Input
                id="collab-tags"
                value={state.tagsRaw}
                onChange={(e) => update("tagsRaw", e.target.value)}
                placeholder="예: 메타분석, 학습몰입"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. 연구 내용 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. 연구 내용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="collab-questions">연구 문제 (한 줄에 한 개)</Label>
            <Textarea
              id="collab-questions"
              value={state.researchQuestionsRaw}
              onChange={(e) => update("researchQuestionsRaw", e.target.value)}
              rows={3}
              placeholder="RQ1. ...&#10;RQ2. ..."
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

      {/* 3. 방법론 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. 연구 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <div>
            <Label htmlFor="collab-sampling">표집 전략</Label>
            <Textarea
              id="collab-sampling"
              value={state.samplingPlan}
              onChange={(e) => update("samplingPlan", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="collab-datacoll">자료 수집 계획</Label>
            <Textarea
              id="collab-datacoll"
              value={state.dataCollectionPlan}
              onChange={(e) => update("dataCollectionPlan", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="collab-analysis">분석 방법</Label>
            <Textarea
              id="collab-analysis"
              value={state.analysisMethodPlan}
              onChange={(e) => update("analysisMethodPlan", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="collab-ethics">윤리적 고려사항</Label>
            <Textarea
              id="collab-ethics"
              value={state.ethicsNote}
              onChange={(e) => update("ethicsNote", e.target.value)}
              rows={2}
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
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="collab-start">시작일</Label>
            <Input
              id="collab-start"
              type="date"
              value={state.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              required
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
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={props.submitting}>
          <Save size={14} className="mr-1" />
          {props.mode === "create" ? "팀 생성" : "저장"}
        </Button>
      </div>
    </form>
  );
}
