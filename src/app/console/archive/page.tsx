"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Library, Plus, Pencil, Trash2, Search, Sparkles, Loader2, RefreshCw, FlaskConical, BarChart3, BookOpen, PenLine, AlertTriangle, ClipboardCheck, ArrowRight, Link2, TrendingUp } from "lucide-react";
import { importArchiveSeed, refreshArchiveSeedReferences } from "@/lib/archive-seed";
import { auth } from "@/lib/firebase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { normalizeStringItems } from "@/lib/archive-normalize";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  researchMethodsApi,
  statisticalMethodsApi,
  foundationTermsApi,
  writingTipsApi,
} from "@/lib/bkend";
import {
  ARCHIVE_ITEM_TYPE_LABELS,
  VARIABLE_TYPE_LABELS,
  type ArchiveConcept,
  type ArchiveVariable,
  type ArchiveMeasurementTool,
  type ArchiveItemType,
  type VariableType,
} from "@/types";
import { toast } from "sonner";

// Phase 3 — 검수 대기 큐: 4개 검수형 컬렉션의 published=false 카운트를 한 곳에서 모니터링.
// archive_concepts/variables/measurements 는 검수 게이트가 없으므로 큐에 포함하지 않음.
const REVIEW_QUEUE_COLLECTIONS = [
  {
    key: "research-methods" as const,
    label: "연구방법 가이드",
    collection: "archive_research_methods",
    href: "/console/archive/research-methods",
    icon: FlaskConical,
  },
  {
    key: "statistical-methods" as const,
    label: "통계방법 가이드",
    collection: "archive_statistical_methods",
    href: "/console/archive/statistical-methods",
    icon: BarChart3,
  },
  {
    key: "foundation-terms" as const,
    label: "기초 용어",
    collection: "archive_foundation_terms",
    href: "/console/archive/foundation-terms",
    icon: BookOpen,
  },
  {
    key: "writing-tips" as const,
    label: "학술 글쓰기",
    collection: "archive_writing_tips",
    href: "/console/archive/writing-tips",
    icon: PenLine,
  },
];

type ReviewQueueCounts = Record<(typeof REVIEW_QUEUE_COLLECTIONS)[number]["key"], number>;

/** M4 검수 추세용 — adoption_snapshots 문서의 최소 형태 */
type ReviewTrendRow = {
  weekKey: string;
  reviewQueueDetail?: { draft: number; held: number };
};

type AnyItem = ArchiveConcept | ArchiveVariable | ArchiveMeasurementTool;

export default function ConsoleArchivePage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ArchiveItemType>("concept");
  const [q, setQ] = useState("");
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [variables, setVariables] = useState<ArchiveVariable[]>([]);
  const [measurements, setMeasurements] = useState<ArchiveMeasurementTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ type: ArchiveItemType; item?: AnyItem } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [seedAcknowledged, setSeedAcknowledged] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueCounts | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [reviewTrend, setReviewTrend] = useState<ReviewTrendRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const allowed = isAtLeast(user, "staff");

  const handleSeed = async () => {
    if (!user) return;
    if (!seedAcknowledged) {
      toast.error("학술 신뢰도 안내 확인이 필요합니다");
      return;
    }
    if (
      !confirm(
        "교육공학 분야 핵심 시드(개념 37 · 변인 19 · 측정도구 17)를 불러오시겠습니까?\n2026-06 추가: 연구방법론 13개 개념 + 석사 논문 빈출 변인 11종(실재감 3종·과제가치·성취목표·학습참여·정신적 노력·학습전이 등) + 정전 측정도구 10종(IMMS·FSS·NASA-TLX·CoI·UWES-S·AGQ·LTSI 등). 동일 이름의 항목은 건너뜁니다.",
      )
    )
      return;
    setSeeding(true);
    try {
      const r = await importArchiveSeed(user.id);
      toast.success(
        `시드 적재 완료 — 개념 +${r.concepts.created}/스킵 ${r.concepts.skipped}, ` +
          `변인 +${r.variables.created}/스킵 ${r.variables.skipped}, ` +
          `측정도구 +${r.measurements.created}/스킵 ${r.measurements.skipped}, ` +
          `연결 개념↔변인 ${r.links?.conceptToVariable ?? 0}건, 변인↔측정도구 ${r.links?.variableToMeasurement ?? 0}건`,
      );
      toast.warning(
        "시드 데이터는 LLM 자동 작성 가능성이 있어 RISS·국립중앙도서관 등에서 검증 후 published 토글을 권장합니다. references 필드는 hallucination 위험이 있습니다.",
        { duration: 8000 },
      );
      load();
    } catch (err) {
      console.error("[console-archive] seed import failed", err);
      toast.error(err instanceof Error ? err.message : "시드 적재 실패");
    } finally {
      setSeeding(false);
    }
  };

  /**
   * 검증된 시드 references/description/altNames 로 기존 DB 항목을 일괄 정정.
   * 이름 일치 시에만 update, 연결관계(variableIds/conceptIds/measurementIds)는 보존.
   * 한국어 인용 정정 후 1회 실행해 기존 DB 메타데이터 동기화 목적.
   */
  const handleRefresh = async () => {
    if (!user) return;
    if (!seedAcknowledged) {
      toast.error("학술 신뢰도 안내 확인이 필요합니다");
      return;
    }
    if (
      !confirm(
        "현재 archive-seed.ts 의 references/description/altNames/tags 를 기존 DB 항목에 일괄 적용합니다.\n" +
          "- 이름이 일치하는 항목만 update (새로 생성하지 않음)\n" +
          "- 연결관계(variableIds 등)는 보존\n" +
          "- 시드와 동일한 항목은 skip\n\n진행하시겠습니까?",
      )
    )
      return;
    setRefreshing(true);
    try {
      const r = await refreshArchiveSeedReferences(user.id);
      toast.success(
        `References 갱신 완료 — 개념 +${r.concepts.updated}/스킵 ${r.concepts.skipped}/없음 ${r.concepts.notFound}, ` +
          `변인 +${r.variables.updated}/스킵 ${r.variables.skipped}/없음 ${r.variables.notFound}, ` +
          `측정도구 +${r.measurements.updated}/스킵 ${r.measurements.skipped}/없음 ${r.measurements.notFound}`,
      );
      toast.warning(
        "갱신된 references 도 LLM 출처 가능성이 있어 RISS·국립중앙도서관 등에서 직접 검증을 권장합니다.",
        { duration: 8000 },
      );
      load();
    } catch (err) {
      console.error("[console-archive] refresh failed", err);
      toast.error(err instanceof Error ? err.message : "References 갱신 실패");
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 연구방법 ↔ 통계방법 크로스링크 백필 (v5 사후 정합화, admin 전용).
   * dry-run 으로 변경 규모를 먼저 확인시키고, 변경분이 있을 때만 confirm 후 적용.
   * 적용은 arrayUnion 기반 비파괴(기존 id 제거 없음) — 서버 라우트 규칙 참조.
   */
  const handleCrosslinkBackfill = async () => {
    setBackfilling(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const headers = { Authorization: `Bearer ${token}` };
      const dryRes = await fetch("/api/admin/archive-crosslink-backfill", { method: "POST", headers });
      if (!dryRes.ok) throw new Error(`dry-run 실패 (${dryRes.status})`);
      const dry = await dryRes.json();
      if (!dry.docsToUpdate) {
        toast.success(`크로스링크 정합 — 보정할 문서가 없습니다 (연구방법 ${dry.researchDocs}·통계방법 ${dry.statDocs} 검사).`);
        return;
      }
      if (
        !confirm(
          `크로스링크 백필 dry-run 결과\n` +
            `- 보정 대상 문서: ${dry.docsToUpdate}건\n` +
            `- 추가될 역참조 id: ${dry.idsToAdd}개\n\n` +
            `기존 id 는 제거하지 않는 비파괴(arrayUnion) 적용입니다. 반영할까요?`,
        )
      )
        return;
      const applyRes = await fetch("/api/admin/archive-crosslink-backfill?apply=true", { method: "POST", headers });
      if (!applyRes.ok) throw new Error(`적용 실패 (${applyRes.status})`);
      const applied = await applyRes.json();
      toast.success(`크로스링크 백필 완료 — 문서 ${applied.docsUpdated}건에 역참조 ${applied.idsAdded}개 추가.`);
    } catch (err) {
      console.error("[console-archive] crosslink backfill failed", err);
      toast.error(err instanceof Error ? err.message : "크로스링크 백필 실패");
    } finally {
      setBackfilling(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [c, v, m] = await Promise.all([
        archiveConceptsApi.list(),
        archiveVariablesApi.list(),
        archiveMeasurementsApi.list(),
      ]);
      setConcepts(c.data);
      setVariables(v.data);
      setMeasurements(m.data);
    } catch (err) {
      console.error("[console-archive] load failed", err);
      toast.error("로드 실패");
    } finally {
      setLoading(false);
    }
  };

  // Phase 3 — 검수형 4개 컬렉션의 draft(published=false) 카운트 집계.
  // listPublished 가 아닌 list() 사용 — staff+ 는 draft 포함 전체 조회 가능 (firestore.rules).
  const loadReviewQueue = async () => {
    setQueueLoading(true);
    try {
      const [rm, sm, ft, wt] = await Promise.all([
        researchMethodsApi.list(),
        statisticalMethodsApi.list(),
        foundationTermsApi.list(),
        writingTipsApi.list(),
      ]);
      // v5-H2 후속(2026-07-19): 보류(held)는 대기 카운트에서 제외 — 통합 큐 보류 탭에서 관리.
      const pending = (x: { published?: boolean; reviewStatus?: string }) =>
        !x.published && x.reviewStatus !== "held";
      setReviewQueue({
        "research-methods": rm.data.filter(pending).length,
        "statistical-methods": sm.data.filter(pending).length,
        "foundation-terms": ft.data.filter(pending).length,
        "writing-tips": wt.data.filter(pending).length,
      });
    } catch (err) {
      console.error("[console-archive] review queue load failed", err);
      toast.error("검수 대기 큐 로드 실패");
    } finally {
      setQueueLoading(false);
    }
  };

  // M4 검수 추세 — adoption_snapshots 최근 6주 로드 (조용히 실패 — 보조 정보)
  const loadTrend = async () => {
    setTrendLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/console/adoption/history?weeks=6", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const d = await res.json();
      setReviewTrend((d.rows ?? []) as ReviewTrendRow[]);
    } catch {
      // 추세는 보조 정보 — 실패 시 미노출
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      load();
      loadReviewQueue();
      loadTrend();
    }
  }, [allowed]);

  const handleDelete = async (type: ArchiveItemType, item: AnyItem) => {
    if (!confirm(`"${item.name}"을 삭제하시겠습니까?`)) return;
    try {
      if (type === "concept") await archiveConceptsApi.delete(item.id);
      else if (type === "variable") await archiveVariablesApi.delete(item.id);
      else await archiveMeasurementsApi.delete(item.id);
      const typeLabel = type === "concept" ? "개념" : type === "variable" ? "변인" : "측정도구";
      logAudit({
        action: `아카이브 ${typeLabel} 삭제`,
        category: "system",
        detail: `"${item.name}"`,
        targetId: item.id,
        targetName: item.name,
        userId: user?.id ?? "",
        userName: user?.name ?? "",
      });
      toast.success("삭제 완료");
      load();
    } catch (err) {
      console.error("[console-archive] delete failed", err);
      toast.error("삭제 실패");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const f = <T extends AnyItem>(items: T[]) =>
      !term ? items : items.filter((it) => it.name.toLowerCase().includes(term));
    return {
      concept: f(concepts),
      variable: f(variables),
      measurement: f(measurements),
    };
  }, [q, concepts, variables, measurements]);

  if (!allowed) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">접근 권한이 없습니다 (staff 이상).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Library}
        title="교육공학 아카이브 관리"
        description="개념·변인·측정도구 CRUD (컬렉션명: archive_concepts · archive_variables · archive_measurements)"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/console/archive/research-methods">
              <Button variant="outline" size="sm" title="교육공학 연구방법 가이드 관리로 이동">
                <FlaskConical className="mr-1 h-4 w-4" />
                연구방법 가이드
              </Button>
            </Link>
            <Link href="/console/archive/statistical-methods">
              <Button variant="outline" size="sm" title="교육공학 통계방법 가이드 관리로 이동">
                <BarChart3 className="mr-1 h-4 w-4" />
                통계방법 가이드
              </Button>
            </Link>
            <Link href="/console/archive/foundation-terms">
              <Button variant="outline" size="sm" title="교육공학 기초 용어 가이드 관리로 이동">
                <BookOpen className="mr-1 h-4 w-4" />
                기초 용어
              </Button>
            </Link>
            <Link href="/console/archive/writing-tips">
              <Button variant="outline" size="sm" title="학술 글쓰기 가이드 관리로 이동">
                <PenLine className="mr-1 h-4 w-4" />
                학술 글쓰기
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding || refreshing || !seedAcknowledged}
              title={
                seedAcknowledged
                  ? "KCI 등재 논문 기준 대표 개념·변인·측정도구를 일괄 적재"
                  : "아래 학술 신뢰도 안내 확인 체크박스를 먼저 선택해 주세요"
              }
            >
              {seeding ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-4 w-4" />
              )}
              기본 시드 불러오기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={seeding || refreshing || !seedAcknowledged}
              title={
                seedAcknowledged
                  ? "시드 데이터의 references/description/altNames 를 기존 DB 항목에 일괄 적용 (연결관계 보존)"
                  : "아래 학술 신뢰도 안내 확인 체크박스를 먼저 선택해 주세요"
              }
            >
              {refreshing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-4 w-4" />
              )}
              메타데이터 갱신
            </Button>
            {isAtLeast(user, "admin") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCrosslinkBackfill}
                disabled={seeding || refreshing || backfilling}
                title="연구방법↔통계방법 양방향 링크의 기존 데이터 정합화 (dry-run 확인 후 비파괴 적용)"
              >
                {backfilling ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-1 h-4 w-4" />
                )}
                크로스링크 백필
              </Button>
            )}
            <Button onClick={() => setEditing({ type: tab })} size="sm">
              <Plus className="mr-1 h-4 w-4" />새 {ARCHIVE_ITEM_TYPE_LABELS[tab]}
            </Button>
          </div>
        }
      />

      {/* Phase 0 공개 정책 안내 — 검수형 vs 상시 공개 구분 명시 */}
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
        <p>
          <strong>개념·변인·측정도구</strong>는 등록 즉시 공개됩니다. (
          <code className="rounded bg-blue-100 px-1 py-0.5 text-[10px] dark:bg-blue-900/50">archive_concepts</code>{" "}
          ·{" "}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-[10px] dark:bg-blue-900/50">archive_variables</code>{" "}
          ·{" "}
          <code className="rounded bg-blue-100 px-1 py-0.5 text-[10px] dark:bg-blue-900/50">archive_measurements</code>
          {" "}— published 게이트 없음)
        </p>
        <p className="mt-1">
          <strong>연구방법·통계방법·기초 용어·학술 글쓰기</strong>는 검수(<code className="rounded bg-blue-100 px-1 py-0.5 text-[10px] dark:bg-blue-900/50">published</code>) 후 공개됩니다.
        </p>
      </div>

      {/* Phase 3 — 검수 대기 통합 큐 (4개 검수형 컬렉션의 published=false 카운트) */}
      <ReviewQueueSection
        counts={reviewQueue}
        loading={queueLoading}
        onRefresh={loadReviewQueue}
      />

      {/* M4 — 검수 품질 추세 (adoption_snapshots 기반 미니 차트) */}
      <ReviewTrendMiniSection rows={reviewTrend} loading={trendLoading} />

      {/* Phase 3 — 시드 데이터 학술 신뢰도 경고 + 확인 체크박스 */}
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="flex-1 space-y-1">
            <p className="font-semibold">시드 데이터 학술 신뢰도 안내</p>
            <p>
              시드 데이터는 LLM 자동 작성 가능성이 있어 RISS·국립중앙도서관 등에서 검증 후 published 토글을 권장합니다.
            </p>
            <p>
              특히 <code className="rounded bg-amber-100 px-1 py-0.5 text-[10px] dark:bg-amber-900/50">references</code> 필드는 hallucination 위험이 있으므로 운영진 직접 작성/검증이 필요합니다.
            </p>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={seedAcknowledged}
            onChange={(e) => setSeedAcknowledged(e.target.checked)}
            className="h-4 w-4 rounded border-amber-400"
            aria-label="시드 데이터 학술 신뢰도 안내 확인"
          />
          <span className="text-xs font-medium">위 안내를 확인했습니다 (시드/메타데이터 갱신 실행 활성화)</span>
        </label>
      </div>

      <div className="mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름으로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ArchiveItemType)} className="mt-4">
        <TabsList>
          <TabsTrigger value="concept">개념 ({concepts.length})</TabsTrigger>
          <TabsTrigger value="variable">변인 ({variables.length})</TabsTrigger>
          <TabsTrigger value="measurement">
            측정도구 ({measurements.length})
          </TabsTrigger>
        </TabsList>
        {tab === "measurement" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            힌트: 컬렉션명은{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">archive_measurements</code>
            {" "}입니다 (라벨은 &ldquo;측정도구&rdquo;).
          </p>
        )}

        {(["concept", "variable", "measurement"] as ArchiveItemType[]).map((t) => (
          <TabsContent key={t} value={t}>
            <AdminList
              type={t}
              items={filtered[t]}
              loading={loading}
              onEdit={(item) => setEditing({ type: t, item })}
              onDelete={(item) => handleDelete(t, item)}
            />
          </TabsContent>
        ))}
      </Tabs>

      {editing && (
        <EditDialog
          type={editing.type}
          item={editing.item}
          concepts={concepts}
          variables={variables}
          measurements={measurements}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AdminList({
  type,
  items,
  loading,
  onEdit,
  onDelete,
}: {
  type: ArchiveItemType;
  items: AnyItem[];
  loading: boolean;
  onEdit: (item: AnyItem) => void;
  onDelete: (item: AnyItem) => void;
}) {
  if (loading) {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
        등록된 항목이 없습니다.
      </div>
    );
  }
  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => {
        const meta =
          type === "concept"
            ? `변인 ${(item as ArchiveConcept).variableIds?.length ?? 0}`
            : type === "variable"
              ? `측정도구 ${(item as ArchiveVariable).measurementIds?.length ?? 0}`
              : (item as ArchiveMeasurementTool).author ?? "";
        return (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{item.name}</span>
                  {meta && <Badge variant="outline" className="text-[10px]">{meta}</Badge>}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(item)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function csv(arr?: string[]): string {
  return (arr ?? []).join(", ");
}
function fromCsv(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function EditDialog({
  type,
  item,
  concepts,
  variables,
  measurements,
  onClose,
  onSaved,
}: {
  type: ArchiveItemType;
  item?: AnyItem;
  concepts: ArchiveConcept[];
  variables: ArchiveVariable[];
  measurements: ArchiveMeasurementTool[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [altNames, setAltNames] = useState(csv((item as { altNames?: string[] })?.altNames));
  const [tags, setTags] = useState(csv((item as { tags?: string[] })?.tags));
  const [references, setReferences] = useState(csv((item as { references?: string[] })?.references));
  // type-specific
  const [variableIds, setVariableIds] = useState<string[]>(
    (item as ArchiveConcept | ArchiveMeasurementTool)?.variableIds ?? [],
  );
  const [conceptIds, setConceptIds] = useState<string[]>(
    (item as ArchiveVariable)?.conceptIds ?? [],
  );
  const [measurementIds, setMeasurementIds] = useState<string[]>(
    (item as ArchiveVariable)?.measurementIds ?? [],
  );
  const [varType, setVarType] = useState<VariableType | "">(
    (item as ArchiveVariable)?.type ?? "",
  );
  const [originalName, setOriginalName] = useState(
    (item as ArchiveMeasurementTool)?.originalName ?? "",
  );
  const [author, setAuthor] = useState((item as ArchiveMeasurementTool)?.author ?? "");
  const [itemCount, setItemCount] = useState<string>(
    String((item as ArchiveMeasurementTool)?.itemCount ?? ""),
  );
  const [scaleType, setScaleType] = useState((item as ArchiveMeasurementTool)?.scaleType ?? "");
  const [reliability, setReliability] = useState(
    (item as ArchiveMeasurementTool)?.reliability ?? "",
  );
  const [validity, setValidity] = useState((item as ArchiveMeasurementTool)?.validity ?? "");
  // #31 방어(2026-07-19): {text,id} 맵 혼재 문서 정규화 후 표시 (오염 저장 방지)
  const [sampleItems, setSampleItems] = useState(
    csv(normalizeStringItems((item as ArchiveMeasurementTool)?.sampleItems)),
  );
  const [resourceUrl, setResourceUrl] = useState(
    (item as ArchiveMeasurementTool)?.resourceUrl ?? "",
  );

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("이름은 필수입니다");
      return;
    }
    setSaving(true);
    try {
      const base: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        altNames: fromCsv(altNames),
        tags: fromCsv(tags),
        references: fromCsv(references),
      };
      if (type === "concept") {
        Object.assign(base, { variableIds });
        if (item) await archiveConceptsApi.update(item.id, base);
        else await archiveConceptsApi.create(base);
      } else if (type === "variable") {
        Object.assign(base, {
          type: varType || undefined,
          conceptIds,
          measurementIds,
        });
        if (item) await archiveVariablesApi.update(item.id, base);
        else await archiveVariablesApi.create(base);
      } else {
        Object.assign(base, {
          originalName: originalName.trim() || undefined,
          author: author.trim() || undefined,
          itemCount: itemCount ? Number(itemCount) : undefined,
          scaleType: scaleType.trim() || undefined,
          reliability: reliability.trim() || undefined,
          validity: validity.trim() || undefined,
          sampleItems: fromCsv(sampleItems),
          resourceUrl: resourceUrl.trim() || undefined,
          variableIds,
        });
        if (item) await archiveMeasurementsApi.update(item.id, base);
        else await archiveMeasurementsApi.create(base);
      }
      toast.success("저장 완료");
      onSaved();
    } catch (err) {
      console.error("[archive-edit] save failed", err);
      toast.error("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const togglePicker = (
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "수정" : "새"} {ARCHIVE_ITEM_TYPE_LABELS[type]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Field label="이름 *">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="설명">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="별칭/영문 (쉼표 구분)">
            <Input value={altNames} onChange={(e) => setAltNames(e.target.value)} />
          </Field>
          <Field label="태그 (쉼표 구분)">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>

          {type === "variable" && (
            <Field label="변인 유형">
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={varType}
                onChange={(e) => setVarType(e.target.value as VariableType | "")}
              >
                <option value="">선택 안 함</option>
                {(Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]).map((t) => (
                  <option key={t} value={t}>
                    {VARIABLE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {type === "measurement" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="원어명">
                  <Input
                    value={originalName}
                    onChange={(e) => setOriginalName(e.target.value)}
                  />
                </Field>
                <Field label="저자">
                  <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
                </Field>
                <Field label="문항 수">
                  <Input
                    type="number"
                    value={itemCount}
                    onChange={(e) => setItemCount(e.target.value)}
                  />
                </Field>
                <Field label="척도 타입">
                  <Input
                    placeholder="예: 5점 Likert"
                    value={scaleType}
                    onChange={(e) => setScaleType(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="신뢰도">
                <Input
                  placeholder="예: Cronbach α = .89"
                  value={reliability}
                  onChange={(e) => setReliability(e.target.value)}
                />
              </Field>
              <Field label="타당도">
                <Textarea
                  rows={2}
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                />
              </Field>
              <Field label="문항 예시 (쉼표 구분)">
                <Textarea
                  rows={2}
                  value={sampleItems}
                  onChange={(e) => setSampleItems(e.target.value)}
                />
              </Field>
              <Field label="외부 자료 URL">
                <Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
              </Field>
            </>
          )}

          {/* 연결 선택 */}
          {type === "concept" && (
            <Field label="연결 변인">
              <Picker
                items={variables.map((v) => ({ id: v.id, name: v.name }))}
                selected={variableIds}
                onToggle={(id) => togglePicker(variableIds, setVariableIds, id)}
              />
            </Field>
          )}
          {type === "variable" && (
            <>
              <Field label="연결 개념 (역참조)">
                <Picker
                  items={concepts.map((c) => ({ id: c.id, name: c.name }))}
                  selected={conceptIds}
                  onToggle={(id) => togglePicker(conceptIds, setConceptIds, id)}
                />
              </Field>
              <Field label="연결 측정도구">
                <Picker
                  items={measurements.map((m) => ({ id: m.id, name: m.name }))}
                  selected={measurementIds}
                  onToggle={(id) =>
                    togglePicker(measurementIds, setMeasurementIds, id)
                  }
                />
              </Field>
            </>
          )}
          {type === "measurement" && (
            <Field label="측정 가능 변인">
              <Picker
                items={variables.map((v) => ({ id: v.id, name: v.name }))}
                selected={variableIds}
                onToggle={(id) => togglePicker(variableIds, setVariableIds, id)}
              />
            </Field>
          )}

          <Field label="참고문헌 (쉼표 구분)">
            <Textarea
              rows={2}
              value={references}
              onChange={(e) => setReferences(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function ReviewQueueSection({
  counts,
  loading,
  onRefresh,
}: {
  counts: ReviewQueueCounts | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const total = counts
    ? REVIEW_QUEUE_COLLECTIONS.reduce((sum, c) => sum + (counts[c.key] ?? 0), 0)
    : 0;
  return (
    <div className="mt-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold">검수 대기 큐</h2>
          {!loading && counts && (
            <Badge variant="outline" className="text-[10px]">
              전체 draft {total}건
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link href="/console/archive/review-queue">
            <Button
              variant="outline"
              size="sm"
              title="4개 검수형 컬렉션의 미검수 항목을 한 리스트에서 승인·보류"
            >
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
              통합 검수 큐 열기
              {!loading && counts && total > 0 && (
                <Badge variant="outline" className="ml-1.5 border-rose-200 bg-rose-50 text-rose-700 text-[10px] dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  {total}
                </Badge>
              )}
              <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            title="검수 대기 카운트 새로고침"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        검수형 4개 컬렉션의 <code className="rounded bg-muted px-1 py-0.5 text-[10px]">published=false</code> 항목을 한 곳에서 모니터링합니다.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {REVIEW_QUEUE_COLLECTIONS.map((c) => {
          const draftCount = counts?.[c.key] ?? 0;
          const isEmpty = !loading && draftCount === 0;
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                isEmpty ? "bg-muted/30 text-muted-foreground" : "bg-background"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Icon className={`h-4 w-4 shrink-0 ${isEmpty ? "" : "text-foreground"}`} aria-hidden />
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${isEmpty ? "" : "text-foreground"}`}>
                    {c.label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    <code>{c.collection}</code>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loading ? (
                  <Skeleton className="h-5 w-12" />
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      isEmpty
                        ? ""
                        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                    }`}
                  >
                    draft {draftCount}
                  </Badge>
                )}
                <Link
                  href={c.href}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors hover:bg-muted ${
                    isEmpty ? "" : "border-foreground/20"
                  }`}
                  title={`${c.label} 검수 화면으로 이동`}
                >
                  검수
                  <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** M4 — 순수 SVG 스파크라인 (AdoptionTrendSection 패턴 재사용) */
function MiniSparkline({ values, label }: { values: number[]; label: string }) {
  const W = 96;
  const H = 22;
  const clean = values.map((v) => (v < 0 ? 0 : v));
  const n = clean.length;
  const max = Math.max(1, ...clean);
  const xAt = (i: number) => (n <= 1 ? W / 2 : (W * i) / (n - 1));
  const yAt = (v: number) => H - 2 - (v / max) * (H - 4);
  const points = clean.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-24"
      role="img"
      aria-label={label}
      preserveAspectRatio="none"
    >
      {n > 1 && (
        <polyline
          points={points}
          fill="none"
          className="stroke-primary"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {clean.map((v, i) => (
        <circle
          key={i}
          cx={xAt(i)}
          cy={yAt(v)}
          r={i === n - 1 ? 2 : 1.3}
          className={i === n - 1 ? "fill-primary" : "fill-primary/50"}
        />
      ))}
    </svg>
  );
}

/**
 * M4 검수 품질 추세 미니 섹션 — adoption_snapshots 최근 N주의 대기·보류 수 추이.
 * 데이터(reviewQueueDetail)가 없는 구 스냅샷만 있으면 미노출.
 */
function ReviewTrendMiniSection({
  rows,
  loading,
}: {
  rows: ReviewTrendRow[];
  loading: boolean;
}) {
  const hasData = rows.some((r) => r.reviewQueueDetail != null);

  if (!loading && !hasData) return null;

  const shortWk = (k: string) => {
    const [, m, d] = k.split("-");
    return `${Number(m)}/${Number(d)}`;
  };

  const draftVals = rows.map((r) => r.reviewQueueDetail?.draft ?? 0);
  const heldVals = rows.map((r) => r.reviewQueueDetail?.held ?? 0);

  return (
    <div className="mt-3 rounded-lg border bg-card/50 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <p className="text-xs font-semibold">검수 추세</p>
        {!loading && rows.length > 0 && (
          <span className="text-[10px] text-muted-foreground">최근 {rows.length}주 스냅샷</span>
        )}
      </div>
      {loading ? (
        <div className="h-12 animate-pulse rounded bg-muted/40" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="px-2 py-1 text-left font-medium">구분</th>
                <th className="px-2 py-1 text-left font-medium">추세</th>
                {rows.map((r) => (
                  <th key={r.weekKey} className="px-2 py-1 text-right font-medium tabular-nums">
                    {shortWk(r.weekKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">대기</td>
                <td className="px-2 py-1">
                  <MiniSparkline values={draftVals} label="검수 대기 추세" />
                </td>
                {draftVals.map((v, i) => (
                  <td
                    key={i}
                    className={`px-2 py-1 text-right tabular-nums ${
                      i === draftVals.length - 1 ? "font-bold text-primary" : ""
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
              <tr className="border-t">
                <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">보류</td>
                <td className="px-2 py-1">
                  <MiniSparkline values={heldVals} label="보류 추세" />
                </td>
                {heldVals.map((v, i) => (
                  <td
                    key={i}
                    className={`px-2 py-1 text-right tabular-nums ${
                      i === heldVals.length - 1 ? "font-bold text-primary" : ""
                    }`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        4개 검수형 컬렉션(연구방법·통계방법·기초용어·학술글쓰기) 합계 · 주 1회 스냅샷 기반
      </p>
    </div>
  );
}

function Picker({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">선택할 항목이 없습니다.</p>;
  }
  return (
    <div className="max-h-40 overflow-y-auto rounded-md border p-2 flex flex-wrap gap-1">
      {items.map((it) => {
        const isOn = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              isOn
                ? "bg-blue-100 border-blue-300 text-blue-800"
                : "bg-background hover:bg-muted"
            }`}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
