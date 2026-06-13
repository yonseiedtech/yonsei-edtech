// 연구 모형(research model) 저장 API — research_models 컬렉션 (사이클 92)
//
// 1인 1개 모형: doc id = userId. 저장은 upsert, 조회는 get(404 시 null).
// dataApi(Firebase 클라이언트 SDK 직접 호출)를 재사용하므로 firestore.rules 에
// research_models 규칙이 필요하다 (본인 read/write + staff read).

import { dataApi } from "./bkend";
import type { ResearchModelData } from "@/types/research-model";

export interface ResearchModelDoc {
  id: string;
  userId: string;
  title: string;
  data: ResearchModelData;
  createdAt: string;
  updatedAt: string;
}

export const researchModelsApi = {
  /** 본인 연구 모형 (doc id = userId, 1인 1개). 아직 없으면 null. */
  get: async (userId: string): Promise<ResearchModelDoc | null> => {
    try {
      return await dataApi.get<ResearchModelDoc>("research_models", userId);
    } catch {
      return null; // 404 — 아직 저장한 모형이 없음
    }
  },
  /** 저장(upsert) — doc id = userId 로 고정. */
  save: (userId: string, data: ResearchModelData, title = "내 연구 모형") =>
    dataApi.upsert<ResearchModelDoc>("research_models", userId, {
      userId,
      data,
      title,
    }),
};
