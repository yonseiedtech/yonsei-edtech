import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import {
  ACTIVITY_OUTPUT_TYPE_LABELS,
  ACTIVITY_ROLE_LABELS,
  AWARD_SCOPE_LABELS,
  CONTENT_CREATION_TYPE_LABELS,
  EXTERNAL_ACTIVITY_TYPE_LABELS,
  ROLE_LABELS,
} from "@/types";
import type {
  ActivityParticipation,
  Award,
  ContentCreation,
  ExternalActivity,
  RecentPaper,
  User,
} from "@/types";

// Pretendard 한글 폰트 등록 (jsDelivr CDN, OFL)
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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 10.5,
    color: "#1f2937",
    paddingTop: 56,
    paddingBottom: 64,
    paddingHorizontal: 56,
    lineHeight: 1.55,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 80,
    color: "#1f293710",
    transform: "rotate(-30deg)",
  },
  topRule: {
    height: 4,
    backgroundColor: "#1e3a8a",
    marginBottom: 8,
  },
  topMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 16,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1e3a8a",
  },
  certTitleBlock: {
    alignItems: "center",
    marginVertical: 18,
  },
  certTitle: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: 12,
    color: "#0f172a",
  },
  certKicker: {
    fontSize: 10,
    color: "#6b7280",
    letterSpacing: 6,
    marginTop: 4,
  },
  memberBlock: {
    marginTop: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "solid",
    borderRadius: 6,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  memberPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 26,
    color: "#1e3a8a",
    fontWeight: 700,
  },
  memberName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },
  memberMeta: {
    fontSize: 10,
    color: "#475569",
    marginTop: 2,
  },
  intro: {
    marginTop: 18,
    fontSize: 11,
    color: "#1f2937",
    lineHeight: 1.7,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e3a8a",
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1e3a8a",
    borderBottomStyle: "solid",
  },
  empty: {
    fontSize: 9.5,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  rowHeader: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#0f172a",
    borderBottomStyle: "solid",
    backgroundColor: "#f8fafc",
  },
  cellTitle: {
    flex: 3,
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
  },
  cellMeta: {
    flex: 2,
    fontSize: 9.5,
    color: "#475569",
  },
  cellDate: {
    flex: 1,
    fontSize: 9.5,
    color: "#475569",
  },
  cellMark: {
    width: 50,
    fontSize: 9.5,
    textAlign: "right",
  },
  markVerified: {
    color: "#047857",
    fontWeight: 700,
  },
  markPending: {
    color: "#a16207",
  },
  bullet: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  bulletDot: {
    width: 12,
    fontSize: 10,
    color: "#1e3a8a",
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: "#1f2937",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 56,
    right: 56,
  },
  footerLine: {
    borderTopWidth: 1,
    borderTopColor: "#1e3a8a",
    borderTopStyle: "solid",
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sealBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signature: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
  },
  sealStamp: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#b91c1c",
    borderStyle: "solid",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 9,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  pageFooter: {
    fontSize: 8.5,
    color: "#9ca3af",
    textAlign: "center",
  },
});

interface PortfolioBundle {
  user: User;
  participations: ActivityParticipation[];
  awards: Award[];
  externals: ExternalActivity[];
  contents: ContentCreation[];
  papers: RecentPaper[];
}

interface Props {
  bundle: PortfolioBundle;
  /** 공개판: 검증 항목만 표시. 본인판: 미검증 포함 + 워터마크 */
  publicOnly: boolean;
  certNumber: string;
  issuedAt: string;
  verifyUrl: string;
}

function fmt(d?: string) {
  return d ? d.slice(0, 10) : "-";
}

export function ProfileCertificatePdfDocument({
  bundle,
  publicOnly,
  certNumber,
  issuedAt,
  verifyUrl,
}: Props) {
  const { user, participations, awards, externals, contents, papers } = bundle;

  const visibleParts = publicOnly ? participations.filter((p) => p.verified) : participations;
  const visibleAwards = publicOnly ? awards.filter((a) => a.verified) : awards;
  const visibleExternals = publicOnly ? externals.filter((e) => e.verified) : externals;

  const enrollmentText = [
    user.enrollmentYear ? `${user.enrollmentYear}년` : null,
    user.enrollmentHalf ? (user.enrollmentHalf === 1 ? "전반기" : "후반기") : null,
    "입학",
  ]
    .filter(Boolean)
    .join(" ");

  const affiliation = [
    user.university ?? "연세대학교",
    user.graduateSchool ?? "교육대학원",
    user.graduateMajor ?? "교육공학전공",
  ].join(" ");

  return (
    <Document
      title={`연세교육공학회 학술 포트폴리오 증명서 — ${user.name}`}
      author="연세교육공학회"
    >
      <Page size="A4" style={styles.page}>
        {!publicOnly && <Text style={styles.watermark}>검 증 대 기 포 함</Text>}

        <View style={styles.topRule} />
        <View style={styles.topMeta}>
          <Text>발급번호 {certNumber}</Text>
          <Text>발급일 {issuedAt}</Text>
        </View>

        <View style={styles.brand}>
          <Text style={styles.brandTitle}>연세교육공학회 · YONSEI EdTech Society</Text>
        </View>

        <View style={styles.certTitleBlock}>
          <Text style={styles.certKicker}>ACADEMIC PORTFOLIO</Text>
          <Text style={styles.certTitle}>학술 포트폴리오 증명서</Text>
        </View>

        <View style={styles.memberBlock}>
          <View style={styles.memberPhoto}>
            <Text>{user.name?.[0] ?? "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>
              {user.name}{" "}
              <Text style={{ fontSize: 11, fontWeight: 400, color: "#475569" }}>
                ({ROLE_LABELS[user.role] ?? user.role})
              </Text>
            </Text>
            <Text style={styles.memberMeta}>{affiliation}</Text>
            {(user.position || user.department || user.affiliation) && (
              <Text style={styles.memberMeta}>
                {[user.affiliation, user.department, user.position].filter(Boolean).join(" · ")}
              </Text>
            )}
            {user.studentId && (
              <Text style={styles.memberMeta}>학번 {user.studentId} · {enrollmentText}</Text>
            )}
            {user.generation > 0 && (
              <Text style={styles.memberMeta}>제 {user.generation}기</Text>
            )}
          </View>
        </View>

        <Text style={styles.intro}>
          본 증명서는 위 회원이 연세교육공학회에서 수행한 학술활동·산출물·수상·대외활동·콘텐츠 제작 이력을
          학회 공식 기록을 바탕으로 발급한 것임을 확인합니다.
          {publicOnly
            ? " 본 문서는 운영진 검증을 완료한 항목만 포함합니다."
            : " 본 문서는 본인 열람용으로, 검증 대기 항목을 포함하며 외부 제출 시 검증 완료본을 별도 발급해야 합니다."}
        </Text>

        {/* 1. 학술활동 (참여) */}
        <Text style={styles.sectionTitle}>1. 학술활동 (참여 이력)</Text>
        {visibleParts.length === 0 ? (
          <Text style={styles.empty}>등록된 활동 참여 기록이 없습니다.</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.cellTitle}>활동</Text>
              <Text style={styles.cellMeta}>역할</Text>
              <Text style={styles.cellDate}>기간</Text>
              <Text style={styles.cellMark}>검증</Text>
            </View>
            {visibleParts.map((p) => (
              <View style={styles.row} key={p.id} wrap={false}>
                <Text style={styles.cellTitle}>
                  {p.activityId ? `활동 ${p.activityId.slice(0, 8)}` : `세미나 ${p.seminarId?.slice(0, 8) ?? ""}`}
                  {p.outputs?.length
                    ? ` (산출물 ${p.outputs.length})`
                    : ""}
                </Text>
                <Text style={styles.cellMeta}>
                  {ACTIVITY_ROLE_LABELS[p.role] ?? p.role}
                  {p.roleDetail ? ` · ${p.roleDetail}` : ""}
                </Text>
                <Text style={styles.cellDate}>
                  {fmt(p.startedAt)}
                  {p.endedAt ? ` ~ ${fmt(p.endedAt)}` : ""}
                </Text>
                <Text style={[styles.cellMark, p.verified ? styles.markVerified : styles.markPending]}>
                  {p.verified ? "검증" : "대기"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* 2. 산출물 */}
        <Text style={styles.sectionTitle}>2. 산출물 라이브러리</Text>
        {(() => {
          const outputs = visibleParts.flatMap((p) => p.outputs ?? []);
          if (outputs.length === 0) {
            return <Text style={styles.empty}>등록된 산출물이 없습니다.</Text>;
          }
          return outputs.slice(0, 30).map((o) => (
            <View style={styles.bullet} key={o.id} wrap={false}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                [{ACTIVITY_OUTPUT_TYPE_LABELS[o.type] ?? o.type}] {o.title}
                {o.url ? ` (${o.url})` : ""}
              </Text>
            </View>
          ));
        })()}

        {/* 3. 수상 */}
        <Text style={styles.sectionTitle}>3. 수상</Text>
        {visibleAwards.length === 0 ? (
          <Text style={styles.empty}>등록된 수상 기록이 없습니다.</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.cellTitle}>수상명</Text>
              <Text style={styles.cellMeta}>주관</Text>
              <Text style={styles.cellDate}>일자</Text>
              <Text style={styles.cellMark}>구분</Text>
            </View>
            {visibleAwards.map((a) => (
              <View style={styles.row} key={a.id} wrap={false}>
                <Text style={styles.cellTitle}>
                  {a.title}
                  {a.verified ? "" : " (대기)"}
                </Text>
                <Text style={styles.cellMeta}>{a.organization}</Text>
                <Text style={styles.cellDate}>{fmt(a.date)}</Text>
                <Text style={styles.cellMark}>{AWARD_SCOPE_LABELS[a.scope]}</Text>
              </View>
            ))}
          </>
        )}

        {/* 4. 대외활동 */}
        <Text style={styles.sectionTitle}>4. 대외활동</Text>
        {visibleExternals.length === 0 ? (
          <Text style={styles.empty}>등록된 대외활동이 없습니다.</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.cellTitle}>제목</Text>
              <Text style={styles.cellMeta}>유형 / 주최</Text>
              <Text style={styles.cellDate}>일자</Text>
              <Text style={styles.cellMark}>검증</Text>
            </View>
            {visibleExternals.map((x) => (
              <View style={styles.row} key={x.id} wrap={false}>
                <Text style={styles.cellTitle}>
                  {x.title}
                  {x.role ? ` / ${x.role}` : ""}
                </Text>
                <Text style={styles.cellMeta}>
                  {EXTERNAL_ACTIVITY_TYPE_LABELS[x.type]}
                  {x.organization ? ` · ${x.organization}` : ""}
                </Text>
                <Text style={styles.cellDate}>{fmt(x.date)}</Text>
                <Text style={[styles.cellMark, x.verified ? styles.markVerified : styles.markPending]}>
                  {x.verified ? "검증" : "대기"}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* 5. 콘텐츠 */}
        <Text style={styles.sectionTitle}>5. 콘텐츠 제작 이력</Text>
        {contents.length === 0 ? (
          <Text style={styles.empty}>등록된 콘텐츠가 없습니다.</Text>
        ) : (
          <>
            <View style={styles.rowHeader}>
              <Text style={styles.cellTitle}>제목</Text>
              <Text style={styles.cellMeta}>유형</Text>
              <Text style={styles.cellDate}>발행일</Text>
              <Text style={styles.cellMark}>출처</Text>
            </View>
            {contents.map((c) => (
              <View style={styles.row} key={c.id} wrap={false}>
                <Text style={styles.cellTitle}>{c.title}</Text>
                <Text style={styles.cellMeta}>
                  {CONTENT_CREATION_TYPE_LABELS[c.type] ?? c.type}
                </Text>
                <Text style={styles.cellDate}>{fmt(c.publishedAt)}</Text>
                <Text style={styles.cellMark}>{c.autoCollected ? "자동" : "수동"}</Text>
              </View>
            ))}
          </>
        )}

        {/* 6. 연구활동 */}
        <Text style={styles.sectionTitle}>6. 연구활동 (RecentPapers)</Text>
        {papers.length === 0 ? (
          <Text style={styles.empty}>등록된 논문이 없습니다.</Text>
        ) : (
          papers.map((p, idx) => (
            <View style={styles.bullet} key={`paper-${idx}`} wrap={false}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>
                {p.title}
                {p.authors ? ` — ${p.authors}` : ""}
                {p.year ? ` (${p.year})` : ""}
              </Text>
            </View>
          ))
        )}

        {/* 푸터: 직인 + QR 안내 */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLine} />
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.pageFooter}>
                본 증명서는 {verifyUrl} 에서 실시간 검증 가능합니다.
              </Text>
              <Text
                style={styles.pageFooter}
                render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
              />
            </View>
            <View style={styles.sealBox}>
              <Text style={styles.signature}>연세교육공학회장</Text>
              <View style={styles.sealStamp}>
                <Text>학회{"\n"}직인</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export type { PortfolioBundle };
