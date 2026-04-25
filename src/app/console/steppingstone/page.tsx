"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, Power, Save } from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { guideTracksApi, guideItemsApi } from "@/lib/bkend";
import {
  GUIDE_TRACK_LABELS,
  GUIDE_ITEM_ACTION_LABELS,
  type GuideTrack,
  type GuideTrackKey,
  type GuideItem,
  type GuideItemActionType,
} from "@/types";

const TRACK_KEYS: GuideTrackKey[] = ["onboarding", "current_student", "comprehensive_exam", "graduation"];
const ACTION_TYPES: GuideItemActionType[] = ["info", "link", "download", "internal"];

interface NewItem {
  category: string;
  title: string;
  body: string;
  actionType: GuideItemActionType;
  actionUrl: string;
  appliesFrom: string;
  appliesUntil: string;
}

const EMPTY_ITEM: NewItem = {
  category: "",
  title: "",
  body: "",
  actionType: "info",
  actionUrl: "",
  appliesFrom: "",
  appliesUntil: "",
};

function ConsoleSteppingStoneContent() {
  const { user: viewer } = useAuthStore();
  const isStaff = isAtLeast(viewer, "staff");

  const [tracks, setTracks] = useState<GuideTrack[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [items, setItems] = useState<GuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<NewItem>(EMPTY_ITEM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<GuideItem>>({});

  // 트랙 로드 (onboarding 키가 전혀 없을 때만 초기 시드 — 중복 방지)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await guideTracksApi.list();
        if (cancelled) return;
        setTracks(res.data);
        const hasOnboarding = res.data.some((t) => t.key === "onboarding");
        if (!hasOnboarding) {
          const now = new Date().toISOString();
          const created = await guideTracksApi.create({
            key: "onboarding",
            title: GUIDE_TRACK_LABELS.onboarding,
            description: "신입생을 위한 입학 전후 단계별 가이드",
            iconKey: "GraduationCap",
            order: 1,
            published: true,
            createdAt: now,
            updatedAt: now,
          });
          if (cancelled) return;
          setTracks([...res.data, created]);
          setActiveTrackId(created.id);
        } else if (res.data.length > 0) {
          setActiveTrackId(res.data[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "트랙 로드 실패");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 활성 트랙 항목 로드
  useEffect(() => {
    if (!activeTrackId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await guideItemsApi.listByTrack(activeTrackId);
        if (cancelled) return;
        const sorted = [...res.data].sort((a, b) => a.order - b.order);
        setItems(sorted);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "항목 로드 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTrackId]);

  const grouped = useMemo(() => {
    const map = new Map<string, GuideItem[]>();
    items.forEach((i) => {
      const arr = map.get(i.category) || [];
      arr.push(i);
      map.set(i.category, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  async function addTrack(key: GuideTrackKey) {
    if (!viewer || !isStaff) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const created = await guideTracksApi.create({
        key,
        title: GUIDE_TRACK_LABELS[key],
        description: "",
        order: tracks.length + 1,
        published: false,
        createdAt: now,
        updatedAt: now,
      });
      setTracks((prev) => [...prev, created]);
      setActiveTrackId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "트랙 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function toggleTrackPublished(t: GuideTrack) {
    if (!viewer || !isStaff) return;
    setBusy(true);
    try {
      const updated = await guideTracksApi.update(t.id, {
        published: !t.published,
        updatedAt: new Date().toISOString(),
      });
      setTracks((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    if (!viewer || !isStaff || !activeTrackId) return;
    if (!newItem.title.trim() || !newItem.category.trim()) {
      setError("카테고리와 제목은 필수입니다.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const order = items.length + 1;
      const payload: Record<string, unknown> = {
        trackId: activeTrackId,
        category: newItem.category.trim(),
        title: newItem.title.trim(),
        actionType: newItem.actionType,
        order,
        published: true,
        createdBy: viewer.id,
        createdAt: now,
        updatedAt: now,
      };
      if (newItem.body.trim()) payload.body = newItem.body.trim();
      if (newItem.actionUrl.trim()) payload.actionUrl = newItem.actionUrl.trim();
      if (newItem.appliesFrom) payload.appliesFrom = newItem.appliesFrom;
      if (newItem.appliesUntil) payload.appliesUntil = newItem.appliesUntil;
      const created = await guideItemsApi.create(payload);
      setItems((prev) => [...prev, created].sort((a, b) => a.order - b.order));
      setNewItem(EMPTY_ITEM);
    } catch (e) {
      setError(e instanceof Error ? e.message : "항목 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!isStaff) return;
    setBusy(true);
    try {
      const updated = await guideItemsApi.update(id, {
        ...editDraft,
        updatedAt: new Date().toISOString(),
      });
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)).sort((a, b) => a.order - b.order));
      setEditingId(null);
      setEditDraft({});
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item: GuideItem) {
    if (!isStaff) return;
    setBusy(true);
    try {
      const updated = await guideItemsApi.update(item.id, {
        published: !item.published,
        updatedAt: new Date().toISOString(),
      });
      setItems((prev) => prev.map((x) => (x.id === item.id ? updated : x)));
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: string) {
    if (!isStaff) return;
    if (!confirm("이 항목을 삭제할까요?")) return;
    setBusy(true);
    try {
      await guideItemsApi.delete(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function removeTrack(t: GuideTrack) {
    if (!isStaff) return;
    // 항목이 있는지 확인 (삭제 전 안전장치)
    let itemCount = 0;
    try {
      const res = await guideItemsApi.listByTrack(t.id);
      itemCount = res.data.length;
    } catch {
      // ignore — 카운트 실패해도 진행 가능
    }
    const msg =
      itemCount > 0
        ? `"${t.title}" 트랙에 ${itemCount}개 항목이 있습니다. 트랙만 삭제하면 항목은 고아가 됩니다. 정말 삭제할까요?`
        : `"${t.title}" 트랙을 삭제할까요?`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await guideTracksApi.delete(t.id);
      setTracks((prev) => {
        const next = prev.filter((x) => x.id !== t.id);
        if (activeTrackId === t.id) {
          setActiveTrackId(next[0]?.id ?? null);
          setItems([]);
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "트랙 삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  const availableNewKeys = TRACK_KEYS.filter((k) => !tracks.some((t) => t.key === k));

  // 중복 키 탐지 (예: onboarding 트랙이 2개 이상 존재)
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    tracks.forEach((t) => counts.set(t.key, (counts.get(t.key) ?? 0) + 1));
    return Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([k]) => k as GuideTrackKey);
  }, [tracks]);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={ClipboardList}
        title="인지디딤판"
        description="신입생 온보딩 등 가이드 트랙·항목을 관리합니다."
      />

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {duplicateKeys.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold">⚠️ 중복 트랙이 있습니다</div>
          <div className="mt-1 text-xs">
            아래 키가 둘 이상의 트랙으로 등록되어 있습니다 — 회원 페이지는 모든 중복 트랙의 항목을 합쳐 보여주지만,
            관리 혼란을 줄이기 위해 중복은 삭제하는 것이 좋습니다:&nbsp;
            {duplicateKeys.map((k) => (
              <Badge key={k} variant="secondary" className="mr-1 text-[10px]">
                {GUIDE_TRACK_LABELS[k]} ({k})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {activeTrackId && (() => {
        const t = tracks.find((x) => x.id === activeTrackId);
        if (!t) return null;
        const unpublishedItems = items.filter((i) => !i.published).length;
        if (t.published && unpublishedItems === 0) return null;
        return (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {!t.published && (
              <div>
                <span className="font-semibold">⚠️ 비공개 트랙</span> — 이 트랙은 공개 페이지(/steppingstone/{t.key})에 표시되지 않습니다.
                위 "공개로" 버튼을 눌러 공개 전환하세요.
              </div>
            )}
            {unpublishedItems > 0 && (
              <div className={t.published ? "" : "mt-1"}>
                항목 중 <span className="font-semibold">{unpublishedItems}개</span>가 비공개 상태입니다 (각 항목의 ⏻ 버튼으로 공개/비공개 전환).
              </div>
            )}
          </div>
        );
      })()}

      {/* 트랙 선택 */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">트랙</h2>
          {availableNewKeys.length > 0 && isStaff && (
            <div className="flex gap-1">
              {availableNewKeys.map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant="outline"
                  onClick={() => addTrack(k)}
                  disabled={busy}
                  className="text-xs"
                >
                  <Plus size={12} /> {GUIDE_TRACK_LABELS[k]}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {tracks.map((t) => {
            const active = activeTrackId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTrackId(t.id)}
                className={
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted")
                }
              >
                {t.title}
                {!t.published && <Badge variant="secondary" className="text-[9px]">비공개</Badge>}
              </button>
            );
          })}
        </div>
        {activeTrackId && isStaff && (() => {
          const t = tracks.find((x) => x.id === activeTrackId);
          if (!t) return null;
          const isDup = duplicateKeys.includes(t.key);
          return (
            <div className="mt-3 flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => toggleTrackPublished(t)} disabled={busy}>
                <Power size={12} /> {t.published ? "비공개로" : "공개로"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeTrack(t)}
                disabled={busy}
                className="text-destructive"
                title={isDup ? "중복 트랙 — 안전하게 삭제 가능합니다" : "트랙 삭제"}
              >
                <Trash2 size={12} /> 트랙 삭제
              </Button>
            </div>
          );
        })()}
      </div>

      {loading ? (
        <div className="space-y-3 py-2" aria-busy="true" aria-label="가이드 항목 불러오는 중">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !activeTrackId ? (
        <p className="text-sm text-muted-foreground">트랙을 선택하세요.</p>
      ) : (
        <>
          {/* 새 항목 */}
          {isStaff && (
            <div className="rounded-2xl border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">새 항목 추가</h3>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="카테고리 (예: 사전 준비, OT, 수강신청)"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                />
                <Input
                  placeholder="항목 제목"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                />
              </div>
              <Textarea
                className="mt-2"
                rows={3}
                placeholder="본문 (마크다운: **굵게**, [링크](https://...) , 줄 시작 '- '로 목록)"
                value={newItem.body}
                onChange={(e) => setNewItem({ ...newItem, body: e.target.value })}
              />
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <select
                  value={newItem.actionType}
                  onChange={(e) =>
                    setNewItem({ ...newItem, actionType: e.target.value as GuideItemActionType })
                  }
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {GUIDE_ITEM_ACTION_LABELS[t]}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="액션 URL (외부 링크 또는 내부 라우트)"
                  value={newItem.actionUrl}
                  onChange={(e) => setNewItem({ ...newItem, actionUrl: e.target.value })}
                  className="md:col-span-2"
                />
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <label className="text-xs text-muted-foreground">
                  적용 시작
                  <Input
                    type="date"
                    value={newItem.appliesFrom}
                    onChange={(e) => setNewItem({ ...newItem, appliesFrom: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  적용 종료
                  <Input
                    type="date"
                    value={newItem.appliesUntil}
                    onChange={(e) => setNewItem({ ...newItem, appliesUntil: e.target.value })}
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={addItem} disabled={busy}>
                  <Plus size={14} /> 추가
                </Button>
              </div>
            </div>
          )}

          {/* 항목 목록 */}
          <div className="space-y-6">
            {grouped.length === 0 && (
              <p className="text-sm text-muted-foreground">아직 항목이 없습니다.</p>
            )}
            {grouped.map(([category, catItems]) => (
              <section key={category}>
                <h3 className="mb-2 text-sm font-bold text-muted-foreground">
                  {category} <span className="text-xs font-normal">({catItems.length})</span>
                </h3>
                <div className="space-y-2">
                  {catItems.map((item) => {
                    const isEditing = editingId === item.id;
                    return (
                      <div key={item.id} className="rounded-xl border bg-card p-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editDraft.title ?? item.title}
                              onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                            />
                            <Textarea
                              rows={3}
                              value={editDraft.body ?? item.body ?? ""}
                              onChange={(e) => setEditDraft({ ...editDraft, body: e.target.value })}
                            />
                            <Input
                              placeholder="액션 URL"
                              value={editDraft.actionUrl ?? item.actionUrl ?? ""}
                              onChange={(e) => setEditDraft({ ...editDraft, actionUrl: e.target.value })}
                            />
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditDraft({}); }}>
                                취소
                              </Button>
                              <Button size="sm" onClick={() => saveEdit(item.id)} disabled={busy}>
                                <Save size={12} /> 저장
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{item.title}</h4>
                                {!item.published && (
                                  <Badge variant="secondary" className="text-[9px]">비공개</Badge>
                                )}
                              </div>
                              {item.body && (
                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                  {item.body}
                                </p>
                              )}
                              {(item.actionUrl || item.actionType !== "info") && (
                                <p className="mt-1 text-[10px] text-muted-foreground">
                                  {GUIDE_ITEM_ACTION_LABELS[item.actionType]}
                                  {item.actionUrl && ` → ${item.actionUrl}`}
                                </p>
                              )}
                            </div>
                            {isStaff && (
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setEditingId(item.id); setEditDraft({}); }}
                                >
                                  편집
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => togglePublished(item)} disabled={busy}>
                                  <Power size={12} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(item.id)}
                                  disabled={busy}
                                  className="text-destructive"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ConsoleSteppingStonePage() {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <ConsoleSteppingStoneContent />
    </AuthGuard>
  );
}
