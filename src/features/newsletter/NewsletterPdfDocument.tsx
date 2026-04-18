import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type { NewsletterIssue } from "./newsletter-store";

// Pretendard 한글 폰트 등록 (jsDelivr CDN, OFL 라이선스)
Font.register({
  family: "Pretendard",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Regular.otf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/Pretendard-Bold.otf",
      fontWeight: 700,
    },
  ],
});

const SECTION_TYPE_LABEL: Record<string, string> = {
  feature: "특집",
  interview: "인터뷰",
  review: "리뷰",
  column: "칼럼",
  news: "소식",
};

const AUTHOR_TYPE_LABEL: Record<string, string> = {
  professor: "교수",
  representative: "전공대표",
  assistant: "조교",
  president: "학회장",
  staff: "운영진",
  student: "재학생",
  alumni: "졸업생",
};

// coverColor (Tailwind gradient 클래스) → 단색 추출 (PDF는 단색만)
function coverColorToHex(coverColor: string): string {
  const map: Record<string, string> = {
    violet: "#5b21b6",
    indigo: "#3730a3",
    blue: "#1d4ed8",
    sky: "#0369a1",
    teal: "#0f766e",
    emerald: "#047857",
    rose: "#9f1239",
    amber: "#b45309",
    purple: "#6b21a8",
  };
  for (const key of Object.keys(map)) {
    if (coverColor.includes(key)) return map[key];
  }
  return "#3730a3";
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 11,
    color: "#1f2937",
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 56,
    lineHeight: 1.6,
  },
  cover: {
    fontFamily: "Pretendard",
    padding: 0,
    margin: 0,
  },
  coverInner: {
    flexGrow: 1,
    flexDirection: "column",
    justifyContent: "flex-end",
    padding: 56,
  },
  coverEyebrow: {
    fontSize: 11,
    color: "#ffffffcc",
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: "#ffffff",
    lineHeight: 1.2,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#ffffffcc",
    marginBottom: 36,
  },
  coverMeta: {
    fontSize: 11,
    color: "#ffffffaa",
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 24,
    color: "#111827",
  },
  tocItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  tocIndex: {
    width: 28,
    fontSize: 12,
    fontWeight: 700,
    color: "#6366f1",
  },
  tocBadge: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    borderRadius: 3,
    marginRight: 8,
  },
  tocText: {
    flex: 1,
    fontSize: 11,
    color: "#1f2937",
  },
  tocAuthor: {
    fontSize: 9,
    color: "#6b7280",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionBadge: {
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#eef2ff",
    color: "#4338ca",
    borderRadius: 3,
    marginRight: 8,
  },
  sectionIndex: {
    fontSize: 9,
    color: "#9ca3af",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 4,
    color: "#111827",
  },
  sectionMeta: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 16,
  },
  sectionContent: {
    fontSize: 11,
    lineHeight: 1.8,
    color: "#1f2937",
  },
  pageFooter: {
    position: "absolute",
    fontSize: 9,
    bottom: 24,
    left: 56,
    right: 56,
    textAlign: "center",
    color: "#9ca3af",
  },
});

interface Props {
  issue: NewsletterIssue;
}

export function NewsletterPdfDocument({ issue }: Props) {
  const coverHex = coverColorToHex(issue.coverColor);
  const sortedSections = [...issue.sections].sort((a, b) => a.order - b.order);

  return (
    <Document
      title={`연세교육공학회보 vol.${issue.issueNumber} — ${issue.title}`}
      author={issue.editorName || "연세교육공학회"}
    >
      {/* 표지 */}
      <Page size="A4" style={[styles.cover, { backgroundColor: coverHex }]}>
        <View style={styles.coverInner}>
          <Text style={styles.coverEyebrow}>연세교육공학회보 · vol. {issue.issueNumber}</Text>
          <Text style={styles.coverTitle}>{issue.title}</Text>
          {issue.subtitle ? <Text style={styles.coverSubtitle}>{issue.subtitle}</Text> : null}
          <Text style={styles.coverMeta}>
            {issue.publishDate}
            {issue.editorName ? ` · 편집 ${issue.editorName}` : ""}
          </Text>
        </View>
      </Page>

      {/* 목차 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.tocTitle}>목차</Text>
        {sortedSections.map((section, idx) => (
          <View style={styles.tocItem} key={section.id} wrap={false}>
            <Text style={styles.tocIndex}>{String(idx + 1).padStart(2, "0")}</Text>
            <Text style={styles.tocBadge}>{SECTION_TYPE_LABEL[section.type] ?? section.type}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tocText}>{section.title}</Text>
              <Text style={styles.tocAuthor}>
                {section.authorName}
                {section.authorType ? ` · ${AUTHOR_TYPE_LABEL[section.authorType] ?? section.authorType}` : ""}
                {section.authorEnrollment ? ` · ${section.authorEnrollment} 입학` : ""}
              </Text>
            </View>
          </View>
        ))}
        <Text
          style={styles.pageFooter}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>

      {/* 섹션 본문 */}
      {sortedSections.map((section, idx) => (
        <Page size="A4" style={styles.page} key={section.id}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>{SECTION_TYPE_LABEL[section.type] ?? section.type}</Text>
            <Text style={styles.sectionIndex}>
              {idx + 1} / {sortedSections.length}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionMeta}>
            글 {section.authorName}
            {section.authorType ? ` · ${AUTHOR_TYPE_LABEL[section.authorType] ?? section.authorType}` : ""}
            {section.authorEnrollment ? ` · ${section.authorEnrollment} 입학` : ""}
          </Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
          <Text
            style={styles.pageFooter}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </Page>
      ))}
    </Document>
  );
}
