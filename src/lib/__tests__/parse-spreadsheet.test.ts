import { describe, it, expect, beforeAll } from "vitest";
import {
  extractSheetId,
  getSheetCsvUrl,
  parseCSVText,
} from "../parse-spreadsheet";

// parseCSVText 는 이제 xlsx 를 지연(dynamic) import 한다. 최초 호출 시 대용량 모듈을
// 로드/트랜스폼하는 비용(수 초)이 발생하므로, 테스트 전에 한 번 예열해 캐시를 채운다.
// (개별 테스트는 캐시된 모듈을 재사용해 기본 타임아웃 내에 실행된다.)
beforeAll(async () => {
  await parseCSVText("이름", ["이름"]);
}, 60000);

describe("extractSheetId", () => {
  it("표준 공유 URL 에서 ID 추출", () => {
    const url = "https://docs.google.com/spreadsheets/d/1abc_DEF-123/edit";
    expect(extractSheetId(url)).toBe("1abc_DEF-123");
  });

  it("쿼리·해시 포함 URL 에서도 ID 추출", () => {
    const url = "https://docs.google.com/spreadsheets/d/AbCdEf123_-/edit#gid=0";
    expect(extractSheetId(url)).toBe("AbCdEf123_-");
  });

  it("export URL 에서도 ID 추출", () => {
    const url = "https://docs.google.com/spreadsheets/d/X9Y8Z7/export?format=csv";
    expect(extractSheetId(url)).toBe("X9Y8Z7");
  });

  it("/spreadsheets/d/ 가 없으면 null", () => {
    expect(extractSheetId("https://docs.google.com/document/d/abc/edit")).toBeNull();
    expect(extractSheetId("https://example.com/abc")).toBeNull();
  });

  it("빈 문자열은 null", () => {
    expect(extractSheetId("")).toBeNull();
  });
});

describe("getSheetCsvUrl", () => {
  it("표준 CSV export URL 생성", () => {
    expect(getSheetCsvUrl("ABC123")).toBe(
      "https://docs.google.com/spreadsheets/d/ABC123/gviz/tq?tqx=out:csv",
    );
  });

  it("특수문자 포함 ID 도 그대로 반영", () => {
    expect(getSheetCsvUrl("a-b_c")).toContain("a-b_c");
  });
});

describe("parseCSVText", () => {
  it("간단한 헤더 + 행 파싱", async () => {
    const csv = "이름,학번\n홍길동,2026001\n김철수,2026002";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows).toHaveLength(2);
    expect(rows[0].이름).toBe("홍길동");
    expect(rows[0].학번).toBe("2026001");
    expect(rows[1].이름).toBe("김철수");
  });

  it("빈 행은 스킵", async () => {
    const csv = "이름,학번\n홍길동,2026001\n,\n김철수,2026002";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows).toHaveLength(2);
  });

  it("첫 번째 열(이름) 없는 행은 제외", async () => {
    const csv = "이름,학번\n홍길동,2026001\n,2026003\n김철수,2026002";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.이름 === "")).toBeUndefined();
  });

  it("동의어 매칭 — '성명' 헤더를 '이름' 컬럼에 매핑", async () => {
    const csv = "성명,studentId\n홍길동,2026001";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].이름).toBe("홍길동");
    expect(rows[0].학번).toBe("2026001");
  });

  it("동의어 매칭 — '이메일'/'email'/'메일' 모두 인식", async () => {
    const csv = "이름,email\n홍길동,test@example.com";
    const rows = await parseCSVText(csv, ["이름", "이메일"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].이메일).toBe("test@example.com");
  });

  it("헤더에 번호·괄호 정규화 — '1. 이름 (필수)' → '이름'", async () => {
    const csv = "1. 이름 (필수),2. 학번\n홍길동,2026001";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows).toHaveLength(1);
    expect(rows[0].이름).toBe("홍길동");
  });

  it("값 trim 적용", async () => {
    const csv = "이름,학번\n  홍길동  ,  2026001  ";
    const rows = await parseCSVText(csv, ["이름", "학번"]);
    expect(rows[0].이름).toBe("홍길동");
    expect(rows[0].학번).toBe("2026001");
  });

  it("매칭 안 되는 컬럼은 빈 문자열 반환", async () => {
    const csv = "이름,학번\n홍길동,2026001";
    const rows = await parseCSVText(csv, ["이름", "학번", "관심분야"]);
    expect(rows[0].관심분야).toBe("");
  });

  it("빈 CSV — 빈 배열", async () => {
    expect(await parseCSVText("", ["이름"])).toEqual([]);
  });

  it("헤더만 있는 CSV — 빈 배열", async () => {
    expect(await parseCSVText("이름,학번", ["이름", "학번"])).toEqual([]);
  });
});
