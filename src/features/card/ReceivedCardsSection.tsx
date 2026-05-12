"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Pencil, Trash2, Camera, User, Phone, Mail, MapPin, Calendar, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import KeywordMultiSelect from "@/components/ui/keyword-multi-select";
import { receivedCardsApi } from "@/lib/bkend";
import { uploadImageSmart } from "@/lib/storage";
import type { ReceivedBusinessCard } from "@/types";

// ── helpers ──────────────────────────────────────────────────

function formatPhone(raw?: string): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

// ── Form state ────────────────────────────────────────────────

type FormState = {
  name: string;
  affiliation: string;
  position: string;
  phone: string;
  email: string;
  notes: string;
  metAt: string;
  metLocation: string;
  tags: string[];
  photoUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  affiliation: "",
  position: "",
  phone: "",
  email: "",
  notes: "",
  metAt: "",
  metLocation: "",
  tags: [],
  photoUrl: "",
};

const TAG_SUGGESTIONS = [
  "AI교육", "교육공학", "교육심리", "협업가능", "논문공저", "발표자",
  "지도교수", "대학원생", "교사", "연구자", "학부생",
];

// ── Card form dialog ──────────────────────────────────────────

function CardFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: FormState;
  onSubmit: (form: FormState) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [isUploading, setIsUploading] = useState(false);

  // QA-S1: initial 변경 시 form 동기화 (잘못된 useState initializer 패턴 → useEffect 로 수정)
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function patch(key: keyof FormState, value: string | string[]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePhotoFile(file: File) {
    setIsUploading(true);
    try {
      const url = await uploadImageSmart(file, "received-cards");
      patch("photoUrl", url);
    } catch {
      toast.error("사진 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("이름은 필수 입력 항목입니다.");
      return;
    }
    onSubmit({ ...form, phone: form.phone.replace(/\D/g, "") });
  }

  // Reset form when dialog opens with new initial
  const handleOpenChange = (v: boolean) => {
    if (v) setForm(initial);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>받은 명함 등록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 명함 이미지 */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted">
              {form.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photoUrl} alt="명함 사진" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User size={32} />
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoFile(file);
                  e.target.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
                <Camera size={12} />
                {isUploading ? "업로드 중…" : "사진 업로드"}
              </span>
            </label>
          </div>

          {/* 이름 (필수) */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              이름 <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="홍길동"
              required
            />
          </div>

          {/* 소속 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">소속</label>
            <Input
              value={form.affiliation}
              onChange={(e) => patch("affiliation", e.target.value)}
              placeholder="서울대학교 교육학과"
            />
          </div>

          {/* 직위 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">직위</label>
            <Input
              value={form.position}
              onChange={(e) => patch("position", e.target.value)}
              placeholder="박사과정"
            />
          </div>

          {/* 전화번호 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">전화번호</label>
            <Input
              value={formatPhone(form.phone)}
              onChange={(e) => patch("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="010-0000-0000"
              type="tel"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">이메일</label>
            <Input
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              placeholder="example@university.ac.kr"
              type="email"
            />
          </div>

          {/* 만난 날짜 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">만난 날짜</label>
            <Input
              value={form.metAt}
              onChange={(e) => patch("metAt", e.target.value)}
              type="date"
            />
          </div>

          {/* 만난 장소 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">만난 장소</label>
            <Input
              value={form.metLocation}
              onChange={(e) => patch("metLocation", e.target.value)}
              placeholder="이화여대 학관 412호"
            />
          </div>

          {/* 태그 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">태그</label>
            <KeywordMultiSelect
              value={form.tags}
              onChange={(v) => patch("tags", v)}
              suggestions={TAG_SUGGESTIONS}
              placeholder="태그 추가"
              max={10}
            />
          </div>

          {/* 메모 */}
          <div className="space-y-1">
            <label className="text-sm font-medium">메모</label>
            <Textarea
              value={form.notes}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="2026 춘계 학술대회 D-1 트랙에서 만남"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving || isUploading}>
              {isSaving ? "저장 중…" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Card item ─────────────────────────────────────────────────

function ReceivedCardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: ReceivedBusinessCard;
  onEdit: (card: ReceivedBusinessCard) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        {/* 사진 */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
          {card.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoUrl} alt={card.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User size={20} />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-foreground">{card.name}</p>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => onEdit(card)}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="수정"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(card.id)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="삭제"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {(card.position || card.affiliation) && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {[card.position, card.affiliation].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {card.phone && (
              <span className="flex items-center gap-1">
                <Phone size={11} />
                {formatPhone(card.phone)}
              </span>
            )}
            {card.email && (
              <span className="flex items-center gap-1 min-w-0">
                <Mail size={11} />
                <span className="truncate">{card.email}</span>
              </span>
            )}
          </div>

          {(card.metAt || card.metLocation) && (
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {card.metAt && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {card.metAt}
                </span>
              )}
              {card.metLocation && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} />
                  {card.metLocation}
                </span>
              )}
            </div>
          )}

          {card.tags && card.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag size={11} className="mt-0.5 shrink-0 text-muted-foreground" />
              {card.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {card.notes && (
            <p className="mt-1.5 rounded bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground leading-relaxed">
              {card.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────

interface ReceivedCardsSectionProps {
  ownerId: string;
}

export default function ReceivedCardsSection({ ownerId }: ReceivedCardsSectionProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReceivedBusinessCard | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["received-cards", ownerId],
    queryFn: async () => {
      const res = await receivedCardsApi.listByOwner(ownerId);
      return res.data;
    },
    enabled: !!ownerId,
  });

  // Sprint 67-G: 복합 인덱스 회피로 client-side 정렬 (createdAt desc)
  const cards = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        const ta = a.createdAt ?? "";
        const tb = b.createdAt ?? "";
        return tb.localeCompare(ta);
      }),
    [data],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.affiliation ?? "").toLowerCase().includes(q) ||
        (c.position ?? "").toLowerCase().includes(q),
    );
  }, [cards, search]);

  const createMutation = useMutation({
    mutationFn: (form: FormState) =>
      receivedCardsApi.create({
        ownerId,
        name: form.name,
        ...(form.affiliation && { affiliation: form.affiliation }),
        ...(form.position && { position: form.position }),
        ...(form.phone && { phone: form.phone }),
        ...(form.email && { email: form.email }),
        ...(form.notes && { notes: form.notes }),
        ...(form.metAt && { metAt: form.metAt }),
        ...(form.metLocation && { metLocation: form.metLocation }),
        ...(form.tags.length > 0 && { tags: form.tags }),
        ...(form.photoUrl && { photoUrl: form.photoUrl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["received-cards", ownerId] });
      setDialogOpen(false);
      toast.success("명함을 등록했습니다.");
    },
    onError: (e: unknown) =>
      toast.error(
        `명함 등록에 실패했습니다: ${e instanceof Error ? e.message : "권한 또는 네트워크 오류"}`,
      ),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormState }) =>
      receivedCardsApi.update(id, {
        name: form.name,
        affiliation: form.affiliation || undefined,
        position: form.position || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
        metAt: form.metAt || undefined,
        metLocation: form.metLocation || undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        photoUrl: form.photoUrl || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["received-cards", ownerId] });
      setEditing(null);
      toast.success("명함을 수정했습니다.");
    },
    onError: () => toast.error("명함 수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => receivedCardsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["received-cards", ownerId] });
      toast.success("명함을 삭제했습니다.");
    },
    onError: () => toast.error("명함 삭제에 실패했습니다."),
  });

  function handleDelete(id: string) {
    if (!confirm("이 명함을 삭제하시겠습니까?")) return;
    deleteMutation.mutate(id);
  }

  function handleEdit(card: ReceivedBusinessCard) {
    setEditing(card);
  }

  function handleSubmit(form: FormState) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, form });
    } else {
      createMutation.mutate(form);
    }
  }

  const editingForm: FormState = editing
    ? {
        name: editing.name,
        affiliation: editing.affiliation ?? "",
        position: editing.position ?? "",
        phone: editing.phone ?? "",
        email: editing.email ?? "",
        notes: editing.notes ?? "",
        metAt: editing.metAt ?? "",
        metLocation: editing.metLocation ?? "",
        tags: editing.tags ?? [],
        photoUrl: editing.photoUrl ?? "",
      }
    : EMPTY_FORM;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section className="mt-8">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">받은 명함</h2>
          {cards.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {cards.length}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus size={15} className="mr-1" />
          명함 등록
        </Button>
      </div>

      {/* 검색 */}
      {cards.length > 0 && (
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름·소속으로 검색"
            className="pl-8 text-sm"
          />
        </div>
      )}

      {/* 리스트 */}
      <div className="mt-3">
        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            불러오는 중…
          </div>
        ) : filtered.length === 0 && search ? (
          <EmptyState
            icon={User}
            title={`"${search}"에 대한 명함 검색 결과 없음`}
            description="이름·소속·메모 키워드를 다시 확인하거나 검색을 초기화하세요."
            actionLabel="검색 초기화"
            onAction={() => setSearch("")}
          />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={User}
            title="아직 등록된 받은 명함이 없습니다"
            description="학술대회·세미나에서 만난 분들의 명함을 등록해 보세요."
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((card) => (
              <li key={card.id}>
                <ReceivedCardItem
                  card={card}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 등록 다이얼로그 */}
      <CardFormDialog
        open={dialogOpen || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setDialogOpen(false);
            setEditing(null);
          }
        }}
        initial={editingForm}
        onSubmit={handleSubmit}
        isSaving={isSaving}
      />
    </section>
  );
}
