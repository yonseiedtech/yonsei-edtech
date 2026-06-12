import { describe, it, expect } from "vitest";
import { parseClipboard } from "../data-parse";

describe("parseClipboard — 엑셀/CSV 붙여넣기 파서", () => {
  it("탭 구분 + 헤더 + 타입 추론", () => {
    const d = parseClipboard("집단\t사전\t사후\n실험\t3.2\t4.1\n통제\t3.1\t3.3\n실험\t2.8\t3.9");
    expect(d).not.toBeNull();
    expect(d!.headers).toEqual(["집단", "사전", "사후"]);
    expect(d!.rowCount).toBe(3);
    expect(d!.isNumeric).toEqual([false, true, true]);
    expect(d!.numeric[1][0]).toBeCloseTo(3.2, 10);
  });

  it("쉼표 구분(CSV) — 첫 행에 탭 없으면 쉼표", () => {
    const d = parseClipboard("x,y\n1,2\n3,4");
    expect(d).not.toBeNull();
    expect(d!.headers).toEqual(["x", "y"]);
    expect(d!.numeric[0]).toEqual([1, 3]);
  });

  it("CRLF 줄바꿈 처리", () => {
    const d = parseClipboard("a\tb\r\n1\t2\r\n3\t4\r\n");
    expect(d).not.toBeNull();
    expect(d!.rowCount).toBe(2);
  });

  it("빈 셀은 NaN(결측), 80% 미만 숫자면 범주", () => {
    const d = parseClipboard("v\tw\n1\t가\n\t나\n3\t다\n4\t라\n5\t마");
    expect(d).not.toBeNull();
    expect(Number.isNaN(d!.numeric[0][1])).toBe(true); // 빈 셀
    expect(d!.isNumeric[0]).toBe(true); // 4/5 = 80% 충족
    expect(d!.isNumeric[1]).toBe(false); // 전부 한글
  });

  it("빈 헤더는 '변수N' 폴백", () => {
    const d = parseClipboard("\t점수\n1\t2\n3\t4");
    expect(d).not.toBeNull();
    expect(d!.headers[0]).toBe("변수1");
  });

  it("데이터 행이 2개 미만이면 null", () => {
    expect(parseClipboard("a\tb\n1\t2")).toBeNull();
    expect(parseClipboard("한 줄짜리")).toBeNull();
    expect(parseClipboard("")).toBeNull();
  });

  it("짧은 행은 빈 문자열로 패딩 — 길이 불일치에도 안전", () => {
    const d = parseClipboard("a\tb\tc\n1\t2\n4\t5\t6");
    expect(d).not.toBeNull();
    expect(d!.columns[2]).toEqual(["", "6"]);
    expect(Number.isNaN(d!.numeric[2][0])).toBe(true);
  });
});
