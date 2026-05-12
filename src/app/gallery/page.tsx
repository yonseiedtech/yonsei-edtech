"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { albumsApi, photosApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import type { PhotoAlbum, Photo } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Camera, Plus, ArrowLeft, X, Upload, Loader2, Trash2,
  ChevronLeft, ChevronRight, ImageIcon, AlertCircle,
} from "lucide-react";

// ── 앨범 목록 ──────────────────────────────────────────────────────────────
export default function GalleryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isStaff = isAtLeast(user, "staff");
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [albumForm, setAlbumForm] = useState({ title: "", description: "" });

  const { data: albums = [], isLoading, error } = useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const res = await albumsApi.list();
      return (res.data as unknown as PhotoAlbum[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
  });

  const createAlbum = useMutation({
    mutationFn: (data: Record<string, unknown>) => albumsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      setShowCreateAlbum(false);
      setAlbumForm({ title: "", description: "" });
      toast.success("앨범이 생성되었습니다.");
    },
  });

  const deleteAlbum = useMutation({
    mutationFn: (id: string) => albumsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast.success("앨범이 삭제되었습니다.");
    },
  });

  function handleCreateAlbum() {
    if (!albumForm.title.trim()) { toast.error("앨범 제목을 입력하세요."); return; }
    createAlbum.mutate({
      title: albumForm.title,
      description: albumForm.description,
      photoCount: 0,
      createdBy: user!.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (selectedAlbum) {
    return (
      <AlbumDetail
        album={selectedAlbum}
        isStaff={isStaff}
        onBack={() => setSelectedAlbum(null)}
      />
    );
  }

  const staffActions = isStaff ? (
    <Button onClick={() => setShowCreateAlbum(true)} size="sm">
      <Plus size={15} className="mr-1.5" aria-hidden />
      앨범 만들기
    </Button>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* ── 페이지 헤더 ── */}
        <PageHeader
          icon={Camera}
          title="포토갤러리"
          description="학회 활동 사진을 앨범별로 확인하세요."
          actions={staffActions}
        />

        <Separator className="mt-6" />

        {/* ── 본문 ── */}
        <div className="mt-6">
          {isLoading ? (
            <AlbumGridSkeleton />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="앨범을 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          ) : albums.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="아직 등록된 앨범이 없습니다"
              description="학회 활동 사진이 등록되면 여기에 표시됩니다."
              {...(isStaff
                ? { actionLabel: "첫 앨범 만들기", onAction: () => setShowCreateAlbum(true) }
                : {})}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  isStaff={isStaff}
                  onClick={() => setSelectedAlbum(album)}
                  onDelete={() => {
                    if (confirm("앨범을 삭제하시겠습니까?")) deleteAlbum.mutate(album.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 앨범 생성 다이얼로그 ── */}
      <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 앨범 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="album-title" className="text-sm font-semibold">
                앨범 제목
              </label>
              <Input
                id="album-title"
                className="mt-1"
                value={albumForm.title}
                onChange={(e) => setAlbumForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="예: 2026년 봄 세미나"
              />
            </div>
            <div>
              <label htmlFor="album-desc" className="text-sm font-semibold">
                설명 <span className="font-normal text-muted-foreground">(선택)</span>
              </label>
              <Textarea
                id="album-desc"
                className="mt-1"
                value={albumForm.description}
                onChange={(e) => setAlbumForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="앨범에 대한 간단한 설명"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAlbum(false)}>
              취소
            </Button>
            <Button onClick={handleCreateAlbum} disabled={createAlbum.isPending}>
              {createAlbum.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 앨범 카드 ───────────────────────────────────────────────────────────────
function AlbumCard({
  album,
  isStaff,
  onClick,
  onDelete,
}: {
  album: PhotoAlbum;
  isStaff: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {/* 커버 이미지 */}
      <button
        onClick={onClick}
        className="w-full overflow-hidden rounded-t-2xl focus-visible:outline-none"
        aria-label={`${album.title} 앨범 열기`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera size={40} className="text-muted-foreground/20" aria-hidden />
            </div>
          )}
          {/* 사진 수 배지 */}
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-sm">
              {album.photoCount}장
            </Badge>
          </div>
        </div>
      </button>

      {/* 메타 */}
      <div className="px-5 py-4">
        <button
          onClick={onClick}
          className="w-full text-left focus-visible:outline-none"
          tabIndex={-1}
          aria-hidden
        >
          <h3 className="font-semibold leading-snug transition-colors group-hover:text-primary">
            {album.title}
          </h3>
          {album.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {album.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(album.createdAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </button>
      </div>

      {/* 운영진 삭제 */}
      {isStaff && (
        <div className="border-t px-5 py-2.5">
          <button
            onClick={onDelete}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${album.title} 앨범 삭제`}
          >
            삭제
          </button>
        </div>
      )}
    </article>
  );
}

// ── 앨범 그리드 스켈레톤 ────────────────────────────────────────────────────
function AlbumGridSkeleton() {
  return (
    <div
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="앨범 불러오는 중"
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="rounded-2xl border bg-card shadow-sm">
          <Skeleton className="aspect-[4/3] rounded-t-2xl rounded-b-none" />
          <div className="space-y-2 px-5 py-4">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 앨범 상세 (사진 목록) ───────────────────────────────────────────────────
function AlbumDetail({
  album,
  isStaff,
  onBack,
}: {
  album: PhotoAlbum;
  isStaff: boolean;
  onBack: () => void;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos = [], isLoading, error } = useQuery({
    queryKey: ["photos", album.id],
    queryFn: async () => {
      const res = await photosApi.list(album.id);
      return (res.data as unknown as Photo[]).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    },
  });

  const deletePhoto = useMutation({
    mutationFn: (id: string) => photosApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos", album.id] });
      qc.invalidateQueries({ queryKey: ["albums"] });
      toast.success("사진이 삭제되었습니다.");
    },
  });

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !user) return;

      setUploading(true);
      let uploaded = 0;
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: 5MB 이하 파일만 업로드 가능합니다.`);
          continue;
        }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          await photosApi.create({
            albumId: album.id,
            url: dataUrl,
            caption: "",
            uploadedBy: user.id,
            uploadedByName: user.name,
            createdAt: new Date().toISOString(),
          });
          uploaded++;
        } catch {
          toast.error(`${file.name} 업로드 실패`);
        }
      }
      if (uploaded > 0) {
        const res = await photosApi.list(album.id);
        const allPhotos = res.data as unknown as Photo[];
        await albumsApi.update(album.id, {
          photoCount: allPhotos.length,
          coverUrl: allPhotos[0]?.url ?? "",
          updatedAt: new Date().toISOString(),
        });
        qc.invalidateQueries({ queryKey: ["photos", album.id] });
        qc.invalidateQueries({ queryKey: ["albums"] });
        toast.success(`${uploaded}장 업로드 완료`);
      }
      setUploading(false);
      e.target.value = "";
    },
    [album.id, user, qc],
  );

  const uploadAction = isStaff ? (
    <label>
      <span
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        사진 업로드
      </span>
      <input
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleUpload}
        disabled={uploading}
        aria-label="사진 업로드"
      />
    </label>
  ) : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 py-8 sm:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* ── 뒤로가기 ── */}
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="갤러리 목록으로 돌아가기"
        >
          <ArrowLeft size={15} aria-hidden />
          갤러리로 돌아가기
        </button>

        {/* ── 앨범 헤더 ── */}
        <PageHeader
          icon={Camera}
          title={album.title}
          description={album.description || undefined}
          actions={uploadAction}
        />

        <Separator className="mt-6" />

        {/* ── 사진 그리드 ── */}
        <div className="mt-6">
          {isLoading ? (
            <PhotoGridSkeleton />
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="사진을 불러오는 중 오류가 발생했습니다"
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              actionLabel="다시 시도"
              onAction={() => window.location.reload()}
            />
          ) : photos.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="아직 사진이 없습니다"
              description="이 앨범에 사진을 업로드하면 여기에 표시됩니다."
            />
          ) : (
            <div
              className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              role="list"
              aria-label={`${album.title} 사진 목록`}
            >
              {photos.map((photo, idx) => (
                <PhotoCell
                  key={photo.id}
                  photo={photo}
                  idx={idx}
                  isStaff={isStaff}
                  onOpen={() => setLightboxIndex(idx)}
                  onDelete={() => {
                    if (confirm("이 사진을 삭제하시겠습니까?")) deletePhoto.mutate(photo.id);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 라이트박스 ── */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

// ── 사진 셀 ─────────────────────────────────────────────────────────────────
function PhotoCell({
  photo,
  idx,
  isStaff,
  onOpen,
  onDelete,
}: {
  photo: Photo;
  idx: number;
  isStaff: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative"
      role="listitem"
    >
      <button
        onClick={onOpen}
        className="aspect-square w-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={photo.caption || `사진 ${idx + 1} 크게 보기`}
      >
        <img
          src={photo.url}
          alt={photo.caption || `사진 ${idx + 1}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </button>

      {/* 운영진 삭제 버튼 */}
      {isStaff && (
        <button
          onClick={onDelete}
          className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={`${photo.caption || `사진 ${idx + 1}`} 삭제`}
        >
          <Trash2 size={13} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ── 사진 그리드 스켈레톤 ────────────────────────────────────────────────────
function PhotoGridSkeleton() {
  return (
    <div
      className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="사진 불러오는 중"
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="aspect-square rounded-2xl" />
      ))}
    </div>
  );
}

// ── 라이트박스 ──────────────────────────────────────────────────────────────
function Lightbox({
  photos,
  index,
  onClose,
  onChange,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const photo = photos[index];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
    if (e.key === "ArrowRight" && index < photos.length - 1) onChange(index + 1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* 닫기 */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="라이트박스 닫기"
      >
        <X size={22} aria-hidden />
      </button>

      {/* 이전 */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="이전 사진"
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
      )}

      {/* 다음 */}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="다음 사진"
        >
          <ChevronRight size={24} aria-hidden />
        </button>
      )}

      {/* 이미지 */}
      <img
        src={photo.url}
        alt={photo.caption || `사진 ${index + 1}`}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* 하단 메타 */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-sm text-white/70"
        aria-live="polite"
      >
        <span>{index + 1} / {photos.length}</span>
        {photo.caption && (
          <span className="ml-3 text-white/90">{photo.caption}</span>
        )}
      </div>
    </div>
  );
}

// ── 유틸 ────────────────────────────────────────────────────────────────────
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
