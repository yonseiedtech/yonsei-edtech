import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";

export const maxDuration = 30;

/**
 * 학기별 로드맵 초기 6단계 시드 1-click 등록 API (Sprint 67-AR)
 *
 * 운영진이 수동으로 6단계를 1건씩 입력하는 부담을 제거.
 * Idempotent — 이미 stage 가 등록되어 있으면 중복 생성하지 않음.
 *
 * 권한: staff 이상
 * 응답: { created: number, skipped: number, total: number }
 */

const DEFAULT_STAGES = [
  {
    order: 1,
    matchSemester: 1,
    title: "1학기차 — 적응과 시작",
    shortTag: "정착",
    colorPreset: "blue",
    isAlumni: false,
    items: [
      "신입생 OT 참여 + 학회 가입 신청",
      "지도교수님 정하기 (1학기 말 권장)",
      "교육공학 핵심 과목 (교수설계론·학습이론) 수강",
      "세미나 정기 참여 — 학회 분위기 익히기",
      "동기 명함 교환 + 네트워크 형성",
    ],
  },
  {
    order: 2,
    matchSemester: 2,
    title: "2학기차 — 연구주제 모색",
    shortTag: "탐색",
    colorPreset: "emerald",
    isAlumni: false,
    items: [
      "관심 분야 키워드·연구 주제 명확화 (마이페이지)",
      "지도교수 연구실 합류 또는 프로젝트 참여",
      "교육공학 학술대회 1회 이상 참석 (춘·추계)",
      "분석 노트로 본인 연구 자산 누적 시작",
      "선배·졸업생 인터뷰 참여 — 진로 정보 수집",
    ],
  },
  {
    order: 3,
    matchSemester: 3,
    title: "3학기차 — 본격 연구",
    shortTag: "본격",
    colorPreset: "amber",
    isAlumni: false,
    items: [
      "논문 주제 1차 구체화 + 지도교수 협의",
      "관련 선행연구 정리 — 에듀테크 아카이브 활용",
      "학술대회 포스터·발표 신청 도전",
      "필요 시 IRB 신청 준비 시작",
      "프로젝트·스터디 1개 이상 적극 참여",
    ],
  },
  {
    order: 4,
    matchSemester: 4,
    title: "4학기차 — 논문 집필",
    shortTag: "집필",
    colorPreset: "rose",
    isAlumni: false,
    items: [
      "학위논문 초고 작성 (지도교수와 격주 미팅 권장)",
      "데이터 수집·분석 완료",
      "학술대회 본 발표 1회 이상 권장",
      "디펜스 연습 도구로 사전 점검 시작",
      "졸업 행정 일정 캘린더에 등록",
    ],
  },
  {
    order: 5,
    matchSemester: 5,
    title: "디펜스 학기 — 심사 준비",
    shortTag: "심사",
    colorPreset: "purple",
    isAlumni: false,
    items: [
      "디펜스 연습 (음성 채점·따라 읽기) 매주 1회",
      "심사위원 구성 + 사전 발표",
      "최종 논문 제출 + 심사 일정 확정",
      "디펜스 발표 자료 5회 이상 리허설",
      "졸업 후 진로 — 동문 네트워크 활용",
    ],
  },
  {
    order: 6,
    matchSemester: 7,
    title: "졸업 후 — 동문 단계",
    shortTag: "동문",
    colorPreset: "slate",
    isAlumni: true,
    items: [
      "졸업생 회원으로 전환 + 본인 학위논문 등록",
      "후배 세미나·인터뷰 참여 — 멘토로",
      "학술대회 동문 참석 — 네트워크 유지",
      "관심 분야 채용·강연 정보 학회를 통해 공유",
      "후배 멘토링 신청 받기 (네트워킹 Map 활용)",
    ],
  },
] as const;

export async function POST(req: NextRequest) {
  const authUser = await verifyAuth(req).catch(() => null);
  if (!authUser) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const allowedRoles = ["staff", "president", "admin", "sysadmin"];
  if (!allowedRoles.includes(authUser.role ?? "")) {
    return Response.json(
      { error: "운영진(staff 이상)만 사용 가능합니다." },
      { status: 403 },
    );
  }

  try {
    const db = getAdminDb();
    const collRef = db.collection("roadmap_stages");

    // 기존 등록된 단계 (order 기준)
    const existingSnap = await collRef.get();
    const existingOrders = new Set<number>();
    for (const d of existingSnap.docs) {
      const data = d.data() as { order?: number };
      if (typeof data.order === "number") existingOrders.add(data.order);
    }

    const now = new Date().toISOString();
    let created = 0;
    let skipped = 0;

    for (const stage of DEFAULT_STAGES) {
      if (existingOrders.has(stage.order)) {
        skipped++;
        continue;
      }
      const docRef = collRef.doc();
      await docRef.set({
        ...stage,
        published: true,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return Response.json({
      ok: true,
      created,
      skipped,
      total: DEFAULT_STAGES.length,
      message:
        created > 0
          ? `${created}개 단계 신규 등록, ${skipped}개 기존 유지`
          : "모든 단계가 이미 등록되어 있어 추가 작업 없음",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
