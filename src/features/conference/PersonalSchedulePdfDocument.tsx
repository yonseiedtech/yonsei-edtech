import path from "node:path";
import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import type {
  ConferenceProgram,
  ConferenceSession,
  UserSessionPlan,
  ConferenceSessionCategory,
} from "@/types";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Pretendard",
  fonts: [
    { src: path.join(FONT_DIR, "Pretendard-Regular.otf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Pretendard-Bold.otf"), fontWeight: 700 },
  ],
});

const CATEGORY_LABEL: Record<ConferenceSessionCategory, string> = {
  keynote: "기조강연",
  symposium: "심포지엄",
  panel: "패널",
  paper: "논문",
  poster: "포스터",
  workshop: "워크숍",
  networking: "네트워킹",
  ceremony: "개·폐회식",
  break: "휴식",
  other: "기타",
};

const CATEGORY_COLOR: Record<ConferenceSessionCategory, string> = {
  keynote: "#7c3aed",
  symposium: "#2563eb",
  panel: "#4f46e5",
  paper: "#059669",
  poster: "#d97706",
  workshop: "#e11d48",
  networking: "#db2777",
  ceremony: "#475569",
  break: "#9ca3af",
  other: "#6b7280",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 10,
    color: "#1f2937",
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 32,
    lineHeight: 1.5,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0a2e6c",
    paddingBottom: 10,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 9,
    color: "#6b7280",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: 700, color: "#0a2e6c" },
  subtitle: { fontSize: 10, color: "#475569", marginTop: 4 },
  meta: { flexDirection: "row", gap: 14, marginTop: 6, fontSize: 9, color: "#475569" },
  daySection: { marginBottom: 16 },
  dayHeader: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 6,
  },
  dayHeaderText: { fontSize: 11, fontWeight: 700, color: "#0a2e6c" },
  sessionCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 4,
    borderLeftColor: "#0a2e6c",
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 3,
  },
  sessionTime: { fontSize: 9, fontWeight: 700, color: "#0a2e6c" },
  badge: {
    fontSize: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    color: "#fff",
    fontWeight: 700,
  },
  attendedBadge: {
    fontSize: 8,
    backgroundColor: "#10b981",
    color: "#fff",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    fontWeight: 700,
  },
  sessionTitle: { fontSize: 11, fontWeight: 700, color: "#111827", marginTop: 2 },
  sessionMeta: { fontSize: 8.5, color: "#6b7280", marginTop: 2 },
  notesBlock: {
    marginTop: 4,
    backgroundColor: "#fef3c7",
    borderLeftWidth: 2,
    borderLeftColor: "#f59e0b",
    padding: 5,
    borderRadius: 2,
  },
  notesLabel: { fontSize: 8, fontWeight: 700, color: "#92400e", marginBottom: 2 },
  notesText: { fontSize: 9, color: "#78350f" },
  reasonBlock: {
    marginTop: 4,
    backgroundColor: "#eff6ff",
    borderLeftWidth: 2,
    borderLeftColor: "#3b82f6",
    padding: 5,
    borderRadius: 2,
  },
  reasonLabel: { fontSize: 8, fontWeight: 700, color: "#1e40af", marginBottom: 2 },
  reasonText: { fontSize: 9, color: "#1e3a8a" },
  reflectionBlock: {
    marginTop: 4,
    backgroundColor: "#ecfdf5",
    borderLeftWidth: 2,
    borderLeftColor: "#10b981",
    padding: 5,
    borderRadius: 2,
  },
  reflectionLabel: { fontSize: 8, fontWeight: 700, color: "#065f46", marginBottom: 2 },
  reflectionText: { fontSize: 9, color: "#064e3b" },
  empty: {
    textAlign: "center",
    fontSize: 10,
    color: "#9ca3af",
    paddingVertical: 30,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
  },
});

interface Props {
  program: ConferenceProgram;
  activityTitle: string;
  userName: string;
  plans: UserSessionPlan[];
}

interface DayBucket {
  date: string;
  dayLabel?: string;
  items: { session: ConferenceSession; plan: UserSessionPlan }[];
}

function bucketByDay(program: ConferenceProgram, plans: UserSessionPlan[]): DayBucket[] {
  const planBySessionId = new Map(plans.map((p) => [p.sessionId, p]));
  const buckets: DayBucket[] = [];
  for (const day of program.days ?? []) {
    const items = (day.sessions ?? [])
      .filter((s) => planBySessionId.has(s.id))
      .map((s) => ({ session: s, plan: planBySessionId.get(s.id)! }))
      .sort((a, b) => a.session.startTime.localeCompare(b.session.startTime));
    if (items.length > 0) {
      buckets.push({ date: day.date, dayLabel: day.dayLabel, items });
    }
  }
  return buckets;
}

export function PersonalSchedulePdfDocument({ program, activityTitle, userName, plans }: Props) {
  const buckets = bucketByDay(program, plans);
  const total = plans.length;
  const attended = plans.filter((p) => p.status === "attended").length;
  const reflected = plans.filter((p) => !!p.reflection).length;
  const generatedAt = new Date().toLocaleString("ko-KR", { hour12: false });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>나의 학술대회 일정표</Text>
          <Text style={styles.title}>{activityTitle || program.title}</Text>
          {program.title && program.title !== activityTitle && (
            <Text style={styles.subtitle}>{program.title}</Text>
          )}
          <View style={styles.meta}>
            <Text>{userName}</Text>
            <Text>·</Text>
            <Text>선택 {total}</Text>
            <Text>·</Text>
            <Text>참석 {attended}</Text>
            <Text>·</Text>
            <Text>후기 {reflected}</Text>
          </View>
        </View>

        {buckets.length === 0 && (
          <Text style={styles.empty}>아직 선택한 세션이 없습니다.</Text>
        )}

        {buckets.map((bucket) => (
          <View key={bucket.date} style={styles.daySection} wrap={false}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayHeaderText}>
                {bucket.date}
                {bucket.dayLabel ? ` · ${bucket.dayLabel}` : ""}
              </Text>
            </View>
            {bucket.items.map(({ session, plan }) => (
              <View key={session.id} style={styles.sessionCard} wrap={false}>
                <View style={styles.sessionHeader}>
                  <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                    <Text style={styles.sessionTime}>
                      {session.startTime}~{session.endTime}
                    </Text>
                    <Text
                      style={[
                        styles.badge,
                        { backgroundColor: CATEGORY_COLOR[session.category] },
                      ]}
                    >
                      {CATEGORY_LABEL[session.category]}
                    </Text>
                    {plan.status === "attended" && (
                      <Text style={styles.attendedBadge}>참석</Text>
                    )}
                    {plan.rating ? (
                      <Text style={[styles.badge, { backgroundColor: "#f59e0b" }]}>
                        ★ {plan.rating}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.sessionTitle}>{session.title}</Text>
                {(session.speakers?.length || session.location || session.track) && (
                  <Text style={styles.sessionMeta}>
                    {[
                      session.speakers?.length ? session.speakers.join(", ") : null,
                      session.affiliation,
                      session.location,
                      session.track,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                )}

                {plan.reasonForSelection ? (
                  <View style={styles.reasonBlock}>
                    <Text style={styles.reasonLabel}>선택 이유</Text>
                    <Text style={styles.reasonText}>{plan.reasonForSelection}</Text>
                  </View>
                ) : null}

                {plan.personalNotes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesLabel}>나의 메모</Text>
                    <Text style={styles.notesText}>{plan.personalNotes}</Text>
                  </View>
                ) : null}

                {plan.reflection ? (
                  <View style={styles.reflectionBlock}>
                    <Text style={styles.reflectionLabel}>후기</Text>
                    <Text style={styles.reflectionText}>{plan.reflection}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer} fixed>
          연세교육공학회 · 생성: {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
