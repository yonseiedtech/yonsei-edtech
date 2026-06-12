import { describe, it, expect } from "vitest";
import {
  computeThesisProgress,
  chapterCharCount,
  levelOf,
  formatMinutes,
  chapterBalance,
} from "../thesis-progress";
import type { WritingPaper } from "@/types";

function paperWithChapters(chapters: Partial<Record<string, string>>): Pick<WritingPaper, "chapters" | "sections"> {
  return { chapters: chapters as WritingPaper["chapters"], sections: undefined };
}

const text = (n: number) => "가".repeat(n);

describe("levelOf", () => {
  it("경계값: 0/50/800/3000", () => {
    expect(levelOf(0)).toBe(0);
    expect(levelOf(49)).toBe(0);
    expect(levelOf(50)).toBe(1);
    expect(levelOf(799)).toBe(1);
    expect(levelOf(800)).toBe(2);
    expect(levelOf(2999)).toBe(2);
    expect(levelOf(3000)).toBe(3);
  });
});

describe("chapterCharCount", () => {
  it("sections(구조화)가 있으면 단락 합산을 우선한다", () => {
    const paper: Pick<WritingPaper, "chapters" | "sections"> = {
      chapters: { intro: text(10) },
      sections: {
        intro: [
          {
            id: "s1",
            heading: "연구의 필요성",
            paragraphs: [
              { id: "p1", text: text(100) },
              { id: "p2", text: text(50) },
            ],
          },
        ],
      },
    };
    expect(chapterCharCount(paper, "intro")).toBe(150);
  });

  it("sections 없으면 평문 chapters 길이로 폴백", () => {
    expect(chapterCharCount(paperWithChapters({ intro: text(120) }), "intro")).toBe(120);
  });

  it("paper 가 없으면 0", () => {
    expect(chapterCharCount(null, "intro")).toBe(0);
  });
});

describe("computeThesisProgress — activityStage 신호", () => {
  it("빈 논문 + 계획서 없음 → 1단계, 0%", () => {
    const r = computeThesisProgress({ paper: null, hasProposal: false });
    expect(r.activityStage).toBe(1);
    expect(r.percent).toBe(0);
    expect(r.totalChars).toBe(0);
  });

  it("이론적 배경 시작(또는 총 300자) → 2단계", () => {
    const r = computeThesisProgress({
      paper: paperWithChapters({ background: text(100) }),
      hasProposal: false,
    });
    expect(r.activityStage).toBe(2);
  });

  it("계획서 작성됨 → 본문이 비어도 3단계", () => {
    const r = computeThesisProgress({ paper: null, hasProposal: true });
    expect(r.activityStage).toBe(3);
  });

  it("연구방법 진행(800자↑) + 결과 시작 → 4단계", () => {
    const r = computeThesisProgress({
      paper: paperWithChapters({ method: text(1000), results: text(100) }),
      hasProposal: true,
    });
    expect(r.activityStage).toBe(4);
  });

  it("결론 진행(800자↑) → 5단계", () => {
    const r = computeThesisProgress({
      paper: paperWithChapters({ conclusion: text(900) }),
      hasProposal: true,
    });
    expect(r.activityStage).toBe(5);
  });

  it("전 장 본궤도(3000자↑) → 100%", () => {
    const r = computeThesisProgress({
      paper: paperWithChapters({
        intro: text(3000),
        background: text(3000),
        method: text(3000),
        results: text(3000),
        conclusion: text(3000),
      }),
      hasProposal: true,
    });
    expect(r.percent).toBe(100);
    expect(r.activityStage).toBe(5);
  });
});

describe("computeThesisProgress — 미반영 지도·집필 시간 합산", () => {
  it("pendingFeedbackByChapter 합산 (general 포함)", () => {
    const r = computeThesisProgress({
      paper: null,
      hasProposal: false,
      pendingFeedbackByChapter: { intro: 2, method: 1, general: 3 },
    });
    expect(r.pendingFeedbackTotal).toBe(6);
  });

  it("writingMinutes 전달", () => {
    const r = computeThesisProgress({ paper: null, hasProposal: false, writingMinutes: 95 });
    expect(r.writingMinutes).toBe(95);
  });
});

describe("formatMinutes", () => {
  it("60분 미만은 분, 이상은 시간+분, 정시는 시간만", () => {
    expect(formatMinutes(45)).toBe("45분");
    expect(formatMinutes(95)).toBe("1시간 35분");
    expect(formatMinutes(120)).toBe("2시간");
  });
});

describe("chapterBalance — 장별 분량 균형", () => {
  it("권장 범위 내/외 status 판정", () => {
    const chapters = [
      { key: "intro" as const, chars: 1000 },        // 10% → ok (8~15)
      { key: "background" as const, chars: 5000 },   // 50% → high (25~40)
      { key: "method" as const, chars: 2000 },       // 20% → ok (15~25)
      { key: "results" as const, chars: 1500 },      // 15% → ok (15~30)
      { key: "conclusion" as const, chars: 500 },    // 5% → low (10~20)
    ];
    const out = chapterBalance(chapters, 10000);
    const byKey = Object.fromEntries(out.map((b) => [b.key, b]));
    expect(byKey.intro.status).toBe("ok");
    expect(byKey.background.status).toBe("high");
    expect(byKey.conclusion.status).toBe("low");
    expect(byKey.background.pct).toBe(50);
  });

  it("총 0자 — 빈 배열", () => {
    expect(chapterBalance([], 0)).toHaveLength(0);
  });
});
