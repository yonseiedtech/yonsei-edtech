/**
 * 연구 설계 에디터 폼 상태 타입·헬퍼 (2026-07-13, M1 리팩터에서 분리)
 *
 * ResearchDesignEditor 와 섹션 서브컴포넌트가 공유하는 FormState·초기값·매핑 헬퍼.
 * 저장 로직·완성도 계산·초안 조립이 이 매핑을 재사용한다. (동작 불변)
 */

import {
  EMPTY_PARTICIPANTS,
  EMPTY_PROGRAM,
  EMPTY_DESIGN_CONDITIONS,
  type ResearchDesignApproach,
  type ResearchDesignInstrument,
  type ResearchDesignParticipants,
  type ResearchDesignProcedureStep,
  type ResearchDesignProgram,
  type DesignConditions,
} from "@/types/research-design";
import type { ResearchDesign } from "@/types";

export interface FormState {
  approach: ResearchDesignApproach;
  methodName: string;
  approachRationale: string;
  modelId: string;
  participants: ResearchDesignParticipants;
  procedureSteps: ResearchDesignProcedureStep[];
  instruments: ResearchDesignInstrument[];
  qualInstruments: string;
  programDesign: ResearchDesignProgram;
  dataCollection: string;
  dataAnalysis: string;
  selectedStatMethods: string[];
  designConditions: DesignConditions;
  ethicsChecked: string[];
}

export const EMPTY_FORM: FormState = {
  approach: "",
  methodName: "",
  approachRationale: "",
  modelId: "",
  participants: { ...EMPTY_PARTICIPANTS },
  procedureSteps: [],
  instruments: [],
  qualInstruments: "",
  programDesign: { ...EMPTY_PROGRAM },
  dataCollection: "",
  dataAnalysis: "",
  selectedStatMethods: [],
  designConditions: { ...EMPTY_DESIGN_CONDITIONS },
  ethicsChecked: [],
};

export function fromDesign(d: ResearchDesign | null | undefined): FormState {
  if (!d)
    return {
      ...EMPTY_FORM,
      participants: { ...EMPTY_PARTICIPANTS },
      programDesign: { ...EMPTY_PROGRAM },
      designConditions: { ...EMPTY_DESIGN_CONDITIONS },
    };
  return {
    approach: d.approach ?? "",
    methodName: d.methodName ?? "",
    approachRationale: d.approachRationale ?? "",
    modelId: d.modelId ?? "",
    participants: { ...EMPTY_PARTICIPANTS, ...(d.participants ?? {}) },
    procedureSteps: d.procedureSteps ?? [],
    instruments: d.instruments ?? [],
    qualInstruments: d.qualInstruments ?? "",
    programDesign: { ...EMPTY_PROGRAM, ...(d.programDesign ?? {}) },
    dataCollection: d.dataCollection ?? "",
    dataAnalysis: d.dataAnalysis ?? "",
    selectedStatMethods: d.selectedStatMethods ?? [],
    designConditions: { ...EMPTY_DESIGN_CONDITIONS, ...(d.designConditions ?? {}) },
    ethicsChecked: d.ethicsChecked ?? [],
  };
}

/** FormState → ResearchDesign 부분 (progress 계산·초안 조립 재사용) */
export function toDesign(form: FormState, base: ResearchDesign): ResearchDesign {
  return {
    ...base,
    approach: form.approach,
    methodName: form.methodName,
    approachRationale: form.approachRationale,
    modelId: form.modelId,
    participants: form.participants,
    procedureSteps: form.procedureSteps,
    instruments: form.instruments,
    qualInstruments: form.qualInstruments,
    programDesign: form.programDesign,
    dataCollection: form.dataCollection,
    dataAnalysis: form.dataAnalysis,
    selectedStatMethods: form.selectedStatMethods,
    designConditions: form.designConditions,
    ethicsChecked: form.ethicsChecked,
  };
}

export function nid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
