import { describe, it, expect } from "vitest";
import {
  EXTERNAL_PARTICIPANT_TYPE_LABELS,
  EXTERNAL_PARTICIPANT_TYPE_COLORS,
  SPEAKER_SUBMISSION_TYPE_LABELS,
  SPEAKER_SUBMISSION_TYPE_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  CONFERENCE_SESSION_CATEGORY_COLORS,
  SESSION_SELECTION_REASONS,
  type ExternalParticipantType,
  type SpeakerSubmissionType,
  type ConferenceSessionCategory,
} from "../academic";

describe("EXTERNAL_PARTICIPANT_TYPE_LABELS", () => {
  it("3개 유형 모두 한국어 라벨 보유", () => {
    expect(EXTERNAL_PARTICIPANT_TYPE_LABELS.speaker).toBe("발표자");
    expect(EXTERNAL_PARTICIPANT_TYPE_LABELS.volunteer).toBe("자원봉사자");
    expect(EXTERNAL_PARTICIPANT_TYPE_LABELS.attendee).toBe("참석");
  });

  it("키와 컬러 매핑이 1:1", () => {
    const labelKeys = Object.keys(EXTERNAL_PARTICIPANT_TYPE_LABELS).sort();
    const colorKeys = Object.keys(EXTERNAL_PARTICIPANT_TYPE_COLORS).sort();
    expect(labelKeys).toEqual(colorKeys);
  });

  it("color 클래스가 비어있지 않음", () => {
    const types: ExternalParticipantType[] = ["speaker", "volunteer", "attendee"];
    for (const t of types) {
      expect(EXTERNAL_PARTICIPANT_TYPE_COLORS[t]).toBeTruthy();
      expect(EXTERNAL_PARTICIPANT_TYPE_COLORS[t]).toContain("text-");
    }
  });

  it("유형별 색상 구분 — 모두 다른 계열", () => {
    expect(EXTERNAL_PARTICIPANT_TYPE_COLORS.speaker).toContain("purple");
    expect(EXTERNAL_PARTICIPANT_TYPE_COLORS.volunteer).toContain("emerald");
    expect(EXTERNAL_PARTICIPANT_TYPE_COLORS.attendee).toContain("slate");
  });
});

describe("SPEAKER_SUBMISSION_TYPE_LABELS", () => {
  it("3개 발표 트랙 (paper/poster/media) 라벨 보유", () => {
    expect(SPEAKER_SUBMISSION_TYPE_LABELS.paper).toBe("논문");
    expect(SPEAKER_SUBMISSION_TYPE_LABELS.poster).toBe("포스터");
    expect(SPEAKER_SUBMISSION_TYPE_LABELS.media).toBe("미디어전");
  });

  it("라벨·컬러 매핑 1:1", () => {
    expect(Object.keys(SPEAKER_SUBMISSION_TYPE_LABELS).sort()).toEqual(
      Object.keys(SPEAKER_SUBMISSION_TYPE_COLORS).sort(),
    );
  });

  it("color 클래스 비어있지 않음", () => {
    const types: SpeakerSubmissionType[] = ["paper", "poster", "media"];
    for (const t of types) {
      expect(SPEAKER_SUBMISSION_TYPE_COLORS[t]).toBeTruthy();
    }
  });
});

describe("CONFERENCE_SESSION_CATEGORY_LABELS", () => {
  const REQUIRED: ConferenceSessionCategory[] = [
    "keynote", "symposium", "panel", "paper", "poster", "media",
    "workshop", "networking", "ceremony", "break", "other",
  ];

  it("11개 카테고리 모두 라벨 보유", () => {
    for (const c of REQUIRED) {
      expect(CONFERENCE_SESSION_CATEGORY_LABELS[c]).toBeTruthy();
      expect(typeof CONFERENCE_SESSION_CATEGORY_LABELS[c]).toBe("string");
    }
  });

  it("라벨·컬러 매핑 1:1", () => {
    expect(Object.keys(CONFERENCE_SESSION_CATEGORY_LABELS).sort()).toEqual(
      Object.keys(CONFERENCE_SESSION_CATEGORY_COLORS).sort(),
    );
  });

  it("모든 컬러 클래스에 dark: 다크모드 변형 포함", () => {
    for (const c of REQUIRED) {
      expect(CONFERENCE_SESSION_CATEGORY_COLORS[c]).toContain("dark:");
    }
  });

  it("주요 카테고리 한국어 라벨 확인", () => {
    expect(CONFERENCE_SESSION_CATEGORY_LABELS.keynote).toBe("기조강연");
    expect(CONFERENCE_SESSION_CATEGORY_LABELS.paper).toBe("논문 발표");
    expect(CONFERENCE_SESSION_CATEGORY_LABELS.workshop).toBe("워크숍");
  });
});

describe("SESSION_SELECTION_REASONS", () => {
  it("11개 선택 이유 (다중 선택용)", () => {
    expect(SESSION_SELECTION_REASONS).toHaveLength(11);
  });

  it("모두 비어있지 않은 문자열", () => {
    for (const r of SESSION_SELECTION_REASONS) {
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    }
  });

  it("'기타' 포함 (fallback 옵션)", () => {
    expect(SESSION_SELECTION_REASONS).toContain("기타");
  });

  it("중복 없음", () => {
    const set = new Set(SESSION_SELECTION_REASONS);
    expect(set.size).toBe(SESSION_SELECTION_REASONS.length);
  });
});
