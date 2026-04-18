"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/features/auth/AuthGuard";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import LoadingSpinner from "@/components/ui/loading-spinner";
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

  // 트랙 로드 (없으면 onboarding 초기 시드)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await guideTracksApi.list();
        if (cancelled) return;
        setTracks(res.data);
        if (res.data.length === 0) {
          // onboarding 트랙 자동 생성 (1회)
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
          setTracks([created]);
          setActiveTrackId(created.id);
        } else {
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

  const availableNewKeys = TRACK_KEYS.filter((k) => !tracks.some((t) => t.key === k));

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
          return (
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => toggleTrackPublished(t)} disabled={busy}>
                <Power size={12} /> {t.published ? "비공개로" : "공개로"}
              </Button>
            </div>
          );
        })()}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
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
