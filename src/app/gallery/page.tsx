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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Camera, Plus, ArrowLeft, X, Upload, Loader2, Trash2, ChevronLeft, ChevronRight, ImageIcon,
} from "lucide-react";

// ── 앨범 목록 ──
export default function GalleryPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isStaff = isAtLeast(user, "staff");
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [albumForm, setAlbumForm] = useState({ title: "", description: "" });

  const { data: albums = [], isLoading } = useQuery({
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Camera size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">포토갤러리</h1>
            <p className="text-sm text-muted-foreground">
              학회 활동 사진을 앨범별로 확인하세요.
            </p>
          </div>
        </div>
        {isStaff && (
          <Button onClick={() => setShowCreateAlbum(true)} size="sm">
            <Plus size={16} className="mr-1" />
            앨범 만들기
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : albums.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon size={48} className="text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">아직 등록된 앨범이 없습니다.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbum(album)}
              className="group overflow-hidden rounded-xl border bg-white text-left transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera size={40} className="text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary" className="bg-black/60 text-white">
                    {album.photoCount}장
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold group-hover:text-primary">{album.title}</h3>
                {album.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{album.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(album.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </div>
              {isStaff && (
                <div className="border-t px-4 py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("앨범을 삭제하시겠습니까?")) deleteAlbum.mutate(album.id);
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 앨범 생성 다이얼로그 */}
      <Dialog open={showCreateAlbum} onOpenChange={setShowCreateAlbum}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 앨범 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">앨범 제목</label>
              <Input
                value={albumForm.title}
                onChange={(e) => setAlbumForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="예: 2026년 봄 세미나"
              />
            </div>
            <div>
              <label className="text-sm font-medium">설명 (선택)</label>
              <Textarea
                value={albumForm.description}
                onChange={(e) => setAlbumForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="앨범에 대한 간단한 설명"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAlbum(false)}>취소</Button>
            <Button onClick={handleCreateAlbum} disabled={createAlbum.isPending}>
              {createAlbum.isPending && <Loader2 size={16} className="mr-1 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 앨범 상세 (사진 목록) ──
function AlbumDetail({ album, isStaff, onBack }: { album: PhotoAlbum; isStaff: boolean; onBack: () => void }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
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
        // 앨범 커버 & 카운트 업데이트
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        갤러리로 돌아가기
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{album.title}</h1>
          {album.description && <p className="mt-1 text-muted-foreground">{album.description}</p>}
        </div>
        {isStaff && (
          <label>
            <span className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              사진 업로드
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : photos.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon size={48} className="text-muted-foreground/30" />
          <p className="mt-4 text-muted-foreground">아직 사진이 없습니다.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="group relative">
              <button
                onClick={() => setLightboxIndex(idx)}
                className="aspect-square w-full overflow-hidden rounded-lg bg-muted"
              >
                <img
                  src={photo.url}
                  alt={photo.caption || `사진 ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              {isStaff && (
                <button
                  onClick={() => {
                    if (confirm("이 사진을 삭제하시겠습니까?")) deletePhoto.mutate(photo.id);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 라이트박스 */}
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

// ── 라이트박스 ──
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X size={24} />
      </button>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index - 1); }}
          className="absolute left-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index + 1); }}
          className="absolute right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight size={24} />
        </button>
      )}

      <img
        src={photo.url}
        alt={photo.caption || ""}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
        {index + 1} / {photos.length}
        {photo.caption && <span className="ml-3">{photo.caption}</span>}
      </div>
    </div>
  );
}

// ── 유틸 ──
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
