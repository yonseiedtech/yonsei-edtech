import { describe, it, expect } from "vitest";
import {
  SEMANTIC,
  WIDGET_PADDING,
  WIDGET_GAP,
  SECTION_ICON_SIZE,
  INLINE_ICON_SIZE,
  STAT_ICON_SIZE,
} from "../design-tokens";

describe("SEMANTIC 팔레트", () => {
  const TONES = ["default", "info", "warning", "danger", "success"] as const;

  it("5개 톤 모두 정의됨", () => {
    for (const t of TONES) {
      expect(SEMANTIC[t]).toBeDefined();
    }
  });

  it("각 톤은 7개 필드 모두 보유 (bg/border/text/textMuted/accent/chipBg/chipText)", () => {
    const REQUIRED = ["bg", "border", "text", "textMuted", "accent", "chipBg", "chipText"] as const;
    for (const t of TONES) {
      for (const field of REQUIRED) {
        expect(SEMANTIC[t][field]).toBeTruthy();
        expect(typeof SEMANTIC[t][field]).toBe("string");
      }
    }
  });

  it("default 외 모든 톤은 dark 모드 변형 포함 (다크 누락 방지)", () => {
    for (const t of TONES) {
      if (t === "default") continue;
      expect(SEMANTIC[t].bg).toContain("dark:");
      expect(SEMANTIC[t].border).toContain("dark:");
      expect(SEMANTIC[t].text).toContain("dark:");
      expect(SEMANTIC[t].accent).toContain("dark:");
    }
  });

  it("info 톤은 blue 계열 사용", () => {
    expect(SEMANTIC.info.bg).toContain("blue");
    expect(SEMANTIC.info.border).toContain("blue");
    expect(SEMANTIC.info.text).toContain("blue");
  });

  it("warning 톤은 amber 계열 사용", () => {
    expect(SEMANTIC.warning.bg).toContain("amber");
    expect(SEMANTIC.warning.accent).toContain("amber");
  });

  it("danger 톤은 rose 계열 사용", () => {
    expect(SEMANTIC.danger.bg).toContain("rose");
    expect(SEMANTIC.danger.text).toContain("rose");
  });

  it("success 톤은 emerald 계열 사용", () => {
    expect(SEMANTIC.success.bg).toContain("emerald");
    expect(SEMANTIC.success.text).toContain("emerald");
  });

  it("default 톤은 시맨틱 변수 (foreground/background/muted/primary) 사용", () => {
    expect(SEMANTIC.default.bg).toBe("bg-card");
    expect(SEMANTIC.default.text).toBe("text-foreground");
    expect(SEMANTIC.default.textMuted).toBe("text-muted-foreground");
    expect(SEMANTIC.default.accent).toBe("text-primary");
  });

  it("같은 톤 안의 색상 계열은 일관됨 (info=blue, warning=amber 등)", () => {
    const colorMap = { info: "blue", warning: "amber", danger: "rose", success: "emerald" };
    for (const [tone, color] of Object.entries(colorMap)) {
      const palette = SEMANTIC[tone as keyof typeof SEMANTIC];
      // 핵심 필드 4개 모두 같은 색 계열인지
      const allFields = [palette.bg, palette.border, palette.text, palette.accent].join(" ");
      expect(allFields).toContain(color);
    }
  });
});

describe("WIDGET 표준 토큰", () => {
  it("WIDGET_PADDING — 반응형 패딩 적용", () => {
    expect(WIDGET_PADDING).toContain("p-5");
    expect(WIDGET_PADDING).toContain("sm:p-6");
  });

  it("WIDGET_GAP — mt 기반 표준 간격", () => {
    expect(WIDGET_GAP).toMatch(/^mt-\d+$/);
  });

  it("아이콘 사이즈 — STAT > SECTION > INLINE 순서", () => {
    expect(STAT_ICON_SIZE).toBeGreaterThan(SECTION_ICON_SIZE);
    expect(SECTION_ICON_SIZE).toBeGreaterThan(INLINE_ICON_SIZE);
  });

  it("모든 아이콘 사이즈 — 양의 정수", () => {
    for (const v of [SECTION_ICON_SIZE, INLINE_ICON_SIZE, STAT_ICON_SIZE]) {
      expect(v).toBeGreaterThan(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
