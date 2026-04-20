"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/loading-spinner";
import {
  Award as AwardIcon,
  Globe,
  Sparkles,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  awardsApi,
  externalActivitiesApi,
  contentCreationsApi,
} from "@/lib/bkend";
import {
  AWARD_SCOPE_LABELS,
  EXTERNAL_ACTIVITY_TYPE_LABELS,
  CONTENT_CREATION_TYPE_LABELS,
  DEFAULT_EXTERNAL_AFFILIATION,
} from "@/types";
import type {
  Award,
  AwardScope,
  ExternalActivity,
  ExternalActivityType,
  ContentCreation,
  ContentCreationType,
} from "@/types";

type TabKey = "award" | "external" | "content";

const TABS: { key: TabKey; label: string; icon: typeof AwardIcon }[] = [
  { key: "award", label: "수상", icon: AwardIcon },
  { key: "external", label: "대외활동", icon: Globe },
  { key: "content", label: "콘텐츠", icon: Sparkles },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function PortfolioContent() {
  const { user: viewer } = useAuthStore();
  const [tab, setTab] = useState<TabKey>("award");
  const [awards, setAwards] = useState<Award[]>([]);
  const [externals, setExternals] = useState<ExternalActivity[]>([]);
  const [contents, setContents] = useState<ContentCreation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Award form
  const [awardForm, setAwardForm] = useState({
    title: "",
    organization: "",
    scope: "internal" as AwardScope,
    date: todayISO(),
    description: "",
  });

  // External form
  const [extForm, setExtForm] = useState({
    title: "",
    type: "lecture" as ExternalActivityType,
    organization: "",
    role: "",
    date: todayISO(),
    location: "",
    url: "",
    description: "",
  });

  // Content form
  const [contentForm, setContentForm] = useState({
    type: "blog" as ContentCreationType,
    title: "",
    url: "",
    publishedAt: todayISO(),
    description: "",
  });

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    (async () => {
      try {
        const [a, e, c] = await Promise.all([
          awardsApi.listByUser(viewer.id),
          externalActivitiesApi.listByUser(viewer.id),
          contentCreationsApi.listByUser(viewer.id),
        ]);
        if (cancelled) return;
        setAwards(a.data);
        setExternals(e.data);
        setContents(c.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  async function addAward() {
    if (!viewer || !awardForm.title.trim() || !awardForm.organization.trim()) {
      setMsg("⚠ 제목과 수여기관은 필수입니다.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const created = await awardsApi.create({
        userId: viewer.id,
        title: awardForm.title.trim(),
        organization: awardForm.organization.trim(),
        scope: awardForm.scope,
        date: awardForm.date,
        description: awardForm.description.trim() || undefined,
        verified: false,
      });
      setAwards((prev) => [created, ...prev]);
      setAwardForm({ title: "", organization: "", scope: "internal", date: todayISO(), description: "" });
      setMsg("✓ 수상 내역이 등록되었습니다. 운영진 검증 후 공식 표기됩니다.");
    } catch (e) {
      setMsg(`⚠ ${e instanceof Error ? e.message : "등록 실패"}`);
    } finally {
      setBusy(false);
    }
  }

  async function addExternal() {
    if (!viewer || !extForm.title.trim()) {
      setMsg("⚠ 제목은 필수입니다.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const created = await externalActivitiesApi.create({
        userId: viewer.id,
        title: extForm.title.trim(),
        type: extForm.type,
        affiliation: DEFAULT_EXTERNAL_AFFILIATION,
        organization: extForm.organization.trim() || undefined,
        role: extForm.role.trim() || undefined,
        date: extForm.date,
        location: extForm.location.trim() || undefined,
        url: extForm.url.trim() || undefined,
        description: extForm.description.trim() || undefined,
        verified: false,
      });
      setExternals((prev) => [created, ...prev]);
      setExtForm({
        title: "",
        type: "lecture",
        organization: "",
        role: "",
        date: todayISO(),
        location: "",
        url: "",
        description: "",
      });
      setMsg("✓ 대외활동이 등록되었습니다. 운영진 검증 대기 상태입니다.");
    } catch (e) {
      setMsg(`⚠ ${e instanceof Error ? e.message : "등록 실패"}`);
    } finally {
      setBusy(false);
    }
  }

  async function addContent() {
    if (!viewer || !contentForm.title.trim()) {
      setMsg("⚠ 제목은 필수입니다.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const created = await contentCreationsApi.create({
        userId: viewer.id,
        type: contentForm.type,
        title: contentForm.title.trim(),
        url: contentForm.url.trim() || undefined,
        publishedAt: contentForm.publishedAt,
        description: contentForm.description.trim() || undefined,
        autoCollected: false,
      });
      setContents((prev) => [created, ...prev]);
      setContentForm({ type: "blog", title: "", url: "", publishedAt: todayISO(), description: "" });
      setMsg("✓ 콘텐츠가 등록되었습니다.");
    } catch (e) {
      setMsg(`⚠ ${e instanceof Error ? e.message : "등록 실패"}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(kind: TabKey, id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    setBusy(true);
    try {
      if (kind === "award") {
        await awardsApi.delete(id);
        setAwards((prev) => prev.filter((x) => x.id !== id));
      } else if (kind === "external") {
        await externalActivitiesApi.delete(id);
        setExternals((prev) => prev.filter((x) => x.id !== id));
      } else {
        await contentCreationsApi.delete(id);
        setContents((prev) => prev.filter((x) => x.id !== id));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusy(false);
    }
  }

  if (!viewer) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={12} /> 마이페이지
        </Link>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">학술 포트폴리오</h1>
            <p className="text-sm text-muted-foreground">
              수상·대외활동·콘텐츠 제작 이력을 직접 등록하세요. 운영진 검증 후 프로필에 정식 표기됩니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setMsg(null);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {t.label}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  {t.key === "award"
                    ? awards.length
                    : t.key === "external"
                      ? externals.length
                      : contents.length}
                </span>
              </button>
            );
          })}
        </div>

        {msg && (
          <div className="mt-4 rounded-md border bg-white px-3 py-2 text-xs">
            {msg}
          </div>
        )}

        {loading ? (
          <LoadingSpinner className="mt-12" />
        ) : (
          <div className="mt-6 space-y-6">
            {tab === "award" && (
              <>
                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-sm font-semibold">새 수상 등록</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="수상명 *"
                      value={awardForm.title}
                      onChange={(e) => setAwardForm({ ...awardForm, title: e.target.value })}
                    />
                    <Input
                      placeholder="수여기관 *"
                      value={awardForm.organization}
                      onChange={(e) =>
                        setAwardForm({ ...awardForm, organization: e.target.value })
                      }
                    />
                    <select
                      value={awardForm.scope}
                      onChange={(e) =>
                        setAwardForm({ ...awardForm, scope: e.target.value as AwardScope })
                      }
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    >
                      {Object.entries(AWARD_SCOPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={awardForm.date}
                      onChange={(e) => setAwardForm({ ...awardForm, date: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="비고 (선택)"
                    value={awardForm.description}
                    onChange={(e) =>
                      setAwardForm({ ...awardForm, description: e.target.value })
                    }
                    className="mt-3 min-h-[60px]"
                  />
                  <Button onClick={addAward} disabled={busy} size="sm" className="mt-3">
                    <Plus size={14} className="mr-1" /> 수상 등록
                  </Button>
                </div>

                <ItemList
                  items={awards.map((a) => ({
                    id: a.id,
                    title: a.title,
                    sub: `${a.organization} · ${AWARD_SCOPE_LABELS[a.scope]} · ${a.date}`,
                    desc: a.description,
                    verified: a.verified,
                  }))}
                  onDelete={(id) => removeItem("award", id)}
                  emptyText="등록된 수상 내역이 없습니다."
                  busy={busy}
                />
              </>
            )}

            {tab === "external" && (
              <>
                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-sm font-semibold">새 대외활동 등록</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    신분 표기: <span className="font-medium">{DEFAULT_EXTERNAL_AFFILIATION}</span>
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="활동명 *"
                      value={extForm.title}
                      onChange={(e) => setExtForm({ ...extForm, title: e.target.value })}
                    />
                    <select
                      value={extForm.type}
                      onChange={(e) =>
                        setExtForm({ ...extForm, type: e.target.value as ExternalActivityType })
                      }
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    >
                      {Object.entries(EXTERNAL_ACTIVITY_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="주최/소속기관"
                      value={extForm.organization}
                      onChange={(e) =>
                        setExtForm({ ...extForm, organization: e.target.value })
                      }
                    />
                    <Input
                      placeholder="역할 (예: 발표자, 패널)"
                      value={extForm.role}
                      onChange={(e) => setExtForm({ ...extForm, role: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={extForm.date}
                      onChange={(e) => setExtForm({ ...extForm, date: e.target.value })}
                    />
                    <Input
                      placeholder="장소 (선택)"
                      value={extForm.location}
                      onChange={(e) => setExtForm({ ...extForm, location: e.target.value })}
                    />
                    <Input
                      placeholder="관련 URL (선택)"
                      value={extForm.url}
                      onChange={(e) => setExtForm({ ...extForm, url: e.target.value })}
                      className="sm:col-span-2"
                    />
                  </div>
                  <Textarea
                    placeholder="설명 (선택)"
                    value={extForm.description}
                    onChange={(e) => setExtForm({ ...extForm, description: e.target.value })}
                    className="mt-3 min-h-[60px]"
                  />
                  <Button onClick={addExternal} disabled={busy} size="sm" className="mt-3">
                    <Plus size={14} className="mr-1" /> 대외활동 등록
                  </Button>
                </div>

                <ItemList
                  items={externals.map((x) => ({
                    id: x.id,
                    title: x.title,
                    sub: `${EXTERNAL_ACTIVITY_TYPE_LABELS[x.type]}${
                      x.organization ? ` · ${x.organization}` : ""
                    } · ${x.date}${x.role ? ` · ${x.role}` : ""}`,
                    desc: x.description,
                    verified: x.verified,
                    url: x.url,
                  }))}
                  onDelete={(id) => removeItem("external", id)}
                  emptyText="등록된 대외활동이 없습니다."
                  busy={busy}
                />
              </>
            )}

            {tab === "content" && (
              <>
                <div className="rounded-xl border bg-white p-5">
                  <h2 className="text-sm font-semibold">새 콘텐츠 등록</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input
                      placeholder="제목 *"
                      value={contentForm.title}
                      onChange={(e) =>
                        setContentForm({ ...contentForm, title: e.target.value })
                      }
                    />
                    <select
                      value={contentForm.type}
                      onChange={(e) =>
                        setContentForm({
                          ...contentForm,
                          type: e.target.value as ContentCreationType,
                        })
                      }
                      className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    >
                      {Object.entries(CONTENT_CREATION_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={contentForm.publishedAt}
                      onChange={(e) =>
                        setContentForm({ ...contentForm, publishedAt: e.target.value })
                      }
                    />
                    <Input
                      placeholder="URL (선택)"
                      value={contentForm.url}
                      onChange={(e) =>
                        setContentForm({ ...contentForm, url: e.target.value })
                      }
                    />
                  </div>
                  <Textarea
                    placeholder="설명 (선택)"
                    value={contentForm.description}
                    onChange={(e) =>
                      setContentForm({ ...contentForm, description: e.target.value })
                    }
                    className="mt-3 min-h-[60px]"
                  />
                  <Button onClick={addContent} disabled={busy} size="sm" className="mt-3">
                    <Plus size={14} className="mr-1" /> 콘텐츠 등록
                  </Button>
                </div>

                <ItemList
                  items={contents.map((c) => ({
                    id: c.id,
                    title: c.title,
                    sub: `${CONTENT_CREATION_TYPE_LABELS[c.type]} · ${c.publishedAt}${
                      c.autoCollected ? " · 자동수집" : ""
                    }`,
                    desc: c.description,
                    verified: true,
                    url: c.url,
                  }))}
                  onDelete={(id) => removeItem("content", id)}
                  emptyText="등록된 콘텐츠가 없습니다."
                  busy={busy}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ListItem {
  id: string;
  title: string;
  sub: string;
  desc?: string;
  verified: boolean;
  url?: string;
}

function ItemList({
  items,
  onDelete,
  emptyText,
  busy,
}: {
  items: ListItem[];
  onDelete: (id: string) => void;
  emptyText: string;
  busy: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-white p-6 text-center text-xs text-muted-foreground">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {it.url ? (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold hover:text-primary hover:underline"
                  >
                    {it.title}
                  </a>
                ) : (
                  <p className="text-sm font-semibold">{it.title}</p>
                )}
                {it.verified ? (
                  <Badge variant="default" className="gap-0.5 text-[10px]">
                    <CheckCircle2 size={9} /> 검증됨
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-0.5 text-[10px]">
                    <Clock size={9} /> 검증 대기
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{it.sub}</p>
              {it.desc && (
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground/80">
                  {it.desc}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => onDelete(it.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function PortfolioPage() {
  return (
    <AuthGuard>
      <PortfolioContent />
    </AuthGuard>
  );
}
