/**
 * research-analytics/shared.ts 단위 테스트 (Sprint 67-AR — 테스트 커버리지 보강)
 *
 * 키워드 정규화·연도 추출·시대 버킷은 키워드 클라우드·연구 계보·N-gram 트렌드의
 * 핵심 데이터 파이프라인. 오류 시 차트 전체가 왜곡됨.
 */

import { describe, expect, it } from "vitest";
import {
  normalizeKeyword,
  yearFrom,
  thesesYearRange,
  isStaffUser,
  dynamicEras,
  bucketIndexOf,
} from "@/features/research-analytics/shared";
import type { AlumniThesis } from "@/types";

function mkThesis(partial: Partial<AlumniThesis> = {}): AlumniThesis {
  return {
    id: "t_1",
    title: "테스트 논문",
    awardedYearMonth: "2026-02",
    ...partial,
  } as unknown as AlumniThesis;
}

// ── normalizeKeyword ──────────────────────────────────────────────────────────

describe("normalizeKeyword", () => {
  it("공백 제거", () => {
    expect(normalizeKeyword("AI 교육")).toBe("AI교육");
  });

  it("중간점(·) 제거", () => {
    expect(normalizeKeyword("이러닝·모바일")).toBe("이러닝모바일");
  });

  it("쉼표·괄호·인용부호 제거", () => {
    expect(normalizeKeyword("(MOOC)")).toBe("MOOC");
    expect(normalizeKeyword('"키워드"')).toBe("키워드");
    expect(normalizeKeyword("「영역」")).toBe("영역");
    expect(normalizeKeyword("『제목』")).toBe("제목");
    expect(normalizeKeyword("[분류]")).toBe("분류");
  });

  it("이미 깔끔한 키워드는 그대로", () => {
    expect(normalizeKeyword("교육공학")).toBe("교육공학");
    expect(normalizeKeyword("AI")).toBe("AI");
  });

  it("앞뒤 공백 trim", () => {
    expect(normalizeKeyword("  키워드  ")).toBe("키워드");
  });

  it("빈 문자열 → 빈 문자열", () => {
    expect(normalizeKeyword("")).toBe("");
  });
});

// ── yearFrom ──────────────────────────────────────────────────────────────────

describe("yearFrom", () => {
  it("YYYY-MM 형식 → 연도 추출", () => {
    expect(yearFrom(mkThesis({ awardedYearMonth: "2026-02" }))).toBe(2026);
    expect(yearFrom(mkThesis({ awardedYearMonth: "2020-08" }))).toBe(2020);
  });

  it("awardedYearMonth 없음(undefined) → null", () => {
    expect(yearFrom(mkThesis({ awardedYearMonth: undefined }))).toBeNull();
  });

  it("빈 문자열 → null", () => {
    expect(yearFrom(mkThesis({ awardedYearMonth: "" }))).toBeNull();
  });

  it("잘못된 형식 → null", () => {
    expect(yearFrom(mkThesis({ awardedYearMonth: "abc" }))).toBeNull();
  });
});

// ── thesesYearRange ───────────────────────────────────────────────────────────

describe("thesesYearRange", () => {
  it("정상 논문 목록 → min/max 연도", () => {
    const theses = [
      mkThesis({ awardedYearMonth: "2010-02" }),
      mkThesis({ awardedYearMonth: "2020-08" }),
      mkThesis({ awardedYearMonth: "2015-02" }),
    ];
    expect(thesesYearRange(theses)).toEqual({ min: 2010, max: 2020 });
  });

  it("빈 배열 → fallback 반환", () => {
    const fallback = { min: 2000, max: 2025 };
    expect(thesesYearRange([], fallback)).toEqual(fallback);
  });

  it("연도 없는 논문 필터 제외 후 계산", () => {
    const theses = [
      mkThesis({ awardedYearMonth: undefined }),
      mkThesis({ awardedYearMonth: "2018-08" }),
    ];
    expect(thesesYearRange(theses)).toEqual({ min: 2018, max: 2018 });
  });
});

// ── isStaffUser ───────────────────────────────────────────────────────────────

describe("isStaffUser", () => {
  it("staff → true", () => expect(isStaffUser({ role: "staff" })).toBe(true));
  it("president → true", () => expect(isStaffUser({ role: "president" })).toBe(true));
  it("admin → true", () => expect(isStaffUser({ role: "admin" })).toBe(true));
  it("sysadmin → true", () => expect(isStaffUser({ role: "sysadmin" })).toBe(true));
  it("advisor → true", () => expect(isStaffUser({ role: "advisor" })).toBe(true));
  it("member → false", () => expect(isStaffUser({ role: "member" })).toBe(false));
  it("alumni → false", () => expect(isStaffUser({ role: "alumni" })).toBe(false));
  it("null → false", () => expect(isStaffUser(null)).toBe(false));
  it("undefined → false", () => expect(isStaffUser(undefined)).toBe(false));
  it("role undefined → false", () => expect(isStaffUser({})).toBe(false));
});

// ── dynamicEras ───────────────────────────────────────────────────────────────

describe("dynamicEras", () => {
  it("step=1 → 매년 1개씩", () => {
    const eras = dynamicEras(2020, 2022, 1);
    expect(eras).toHaveLength(3);
    expect(eras[0]).toEqual({ label: "2020", from: 2020, to: 2020 });
    expect(eras[2]).toEqual({ label: "2022", from: 2022, to: 2022 });
  });

  it("step=5 → 5년 단위 버킷, 라벨 'YYYY–YY' 형식", () => {
    const eras = dynamicEras(2000, 2009, 5);
    expect(eras).toHaveLength(2);
    expect(eras[0].label).toBe("2000–04");
    expect(eras[1].label).toBe("2005–09");
  });

  it("step=10 → 10년 단위", () => {
    const eras = dynamicEras(2000, 2019, 10);
    expect(eras).toHaveLength(2);
    expect(eras[0]).toEqual({ label: "2000–09", from: 2000, to: 2009 });
    expect(eras[1]).toEqual({ label: "2010–19", from: 2010, to: 2019 });
  });

  it("yearMax < yearMin → 빈 배열", () => {
    expect(dynamicEras(2020, 2019, 1)).toHaveLength(0);
  });

  it("step=3 → 3년 단위, 라벨 'YYYY–YYYY' 형식", () => {
    const eras = dynamicEras(2000, 2005, 3);
    expect(eras[0].label).toBe("2000–2002");
    expect(eras[1].label).toBe("2003–2005");
  });

  it("마지막 버킷 to는 yearMax로 클램프", () => {
    // 2000~2023, step=10 → 마지막 버킷 2020-2029 but yearMax=2023 → to=2023
    const eras = dynamicEras(2000, 2023, 10);
    const last = eras[eras.length - 1];
    expect(last.to).toBe(2023);
  });
});

// ── bucketIndexOf ─────────────────────────────────────────────────────────────

describe("bucketIndexOf", () => {
  const buckets = [
    { label: "2000–04", from: 2000, to: 2004 },
    { label: "2005–09", from: 2005, to: 2009 },
    { label: "2010–14", from: 2010, to: 2014 },
  ];

  it("범위 내 → 해당 인덱스", () => {
    expect(bucketIndexOf(buckets, 2000)).toBe(0);
    expect(bucketIndexOf(buckets, 2004)).toBe(0);
    expect(bucketIndexOf(buckets, 2007)).toBe(1);
    expect(bucketIndexOf(buckets, 2010)).toBe(2);
    expect(bucketIndexOf(buckets, 2014)).toBe(2);
  });

  it("범위 밖 → -1", () => {
    expect(bucketIndexOf(buckets, 1999)).toBe(-1);
    expect(bucketIndexOf(buckets, 2015)).toBe(-1);
  });

  it("빈 배열 → -1", () => {
    expect(bucketIndexOf([], 2010)).toBe(-1);
  });
});
