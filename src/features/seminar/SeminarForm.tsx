"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Video, Eye, PenLine, Calendar, MapPin, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCreateSeminar } from "./useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import type { Seminar } from "@/types";

interface FormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  onlineUrl: string;
  speaker: string;
  speakerBio: string;
  maxAttendees: string;
  registrationUrl: string;
}

export default function SeminarForm() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { createSeminar } = useCreateSeminar();
  const [isOnline, setIsOnline] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();

  const w = watch();

  async function onSubmit(data: FormData) {
    try {
      await createSeminar({
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        location: isOnline ? (data.location || "온라인 (ZOOM)") : data.location,
        isOnline,
        onlineUrl: isOnline ? (data.onlineUrl || undefined) : undefined,
        speaker: data.speaker,
        speakerBio: data.speakerBio || undefined,
        maxAttendees: data.maxAttendees ? Number(data.maxAttendees) : undefined,
        registrationUrl: data.registrationUrl || undefined,
        attendeeIds: [],
        status: "upcoming" as Seminar["status"],
        createdBy: user?.id ?? "",
      } as unknown as Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">);
      toast.success("세미나가 등록되었습니다.");
      router.push("/seminars");
    } catch {
      toast.error("세미나 등록에 실패했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/seminars")}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={16} />
        목록으로
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">세미나 등록</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? <PenLine size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
          {showPreview ? "편집" : "미리보기"}
        </Button>
      </div>

      {showPreview ? (
        /* ── 세미나 미리보기 (상세 페이지와 동일한 레이아웃) ── */
        <div className="mt-6 rounded-2xl border bg-white p-8">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-xs text-primary" variant="secondary">
              예정
            </Badge>
            {isOnline && (
              <Badge variant="secondary" className="bg-blue-50 text-xs text-blue-700">
                ONLINE
              </Badge>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-bold">
            {w.title || "(세미나 제목)"}
          </h2>

          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>
                {w.date || "____-__-__"} {w.time || "__:__"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? <Video size={16} className="text-blue-500" /> : <MapPin size={16} />}
              <span>{w.location || (isOnline ? "온라인 (ZOOM)" : "(장소)")}</span>
            </div>
            {isOnline && w.onlineUrl && (
              <div className="flex items-center gap-2 pl-6">
                <a
                  href={w.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  ZOOM 접속 링크
                </a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>
                참석 0{w.maxAttendees ? ` / ${w.maxAttendees}` : ""}명
              </span>
            </div>
          </div>

          {/* 발표자 */}
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserPlus size={24} />
              </div>
              <div>
                <span className="text-sm font-medium">
                  {w.speaker || "(발표자)"}
                </span>
                {w.speakerBio && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {w.speakerBio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
            {w.description || "(세미나 설명)"}
          </div>

          {/* 미리보기 안내 */}
          <div className="mt-8 rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-xs text-muted-foreground">
            이것은 미리보기입니다. &quot;편집&quot; 버튼을 눌러 수정하거나, 폼을 제출하세요.
          </div>
        </div>
      ) : (
        /* ── 편집 폼 ── */
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-6 space-y-4 rounded-2xl border bg-white p-8"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">제목</label>
            <Input
              {...register("title", { required: "제목을 입력하세요" })}
              placeholder="세미나 제목"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">설명</label>
            <Textarea
              {...register("description", { required: "설명을 입력하세요" })}
              placeholder="세미나 소개 및 내용..."
              rows={5}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">날짜</label>
              <Input
                type="date"
                {...register("date", { required: "날짜를 선택하세요" })}
              />
              {errors.date && (
                <p className="mt-1 text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">시간</label>
              <Input
                type="time"
                {...register("time", { required: "시간을 선택하세요" })}
              />
              {errors.time && (
                <p className="mt-1 text-xs text-destructive">{errors.time.message}</p>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">장소</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Video size={14} className="text-blue-500" />
                온라인 (ZOOM)
              </label>
            </div>
            <Input
              {...register("location", { required: !isOnline ? "장소를 입력하세요" : false })}
              placeholder={isOnline ? "온라인 (ZOOM) — 비워두면 자동 입력" : "예: 교육과학관 203호"}
            />
            {errors.location && (
              <p className="mt-1 text-xs text-destructive">{errors.location.message}</p>
            )}
            {isOnline && (
              <div className="mt-2">
                <Input
                  {...register("onlineUrl")}
                  placeholder="ZOOM 링크 (https://zoom.us/j/...)"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  참석자에게 표시될 접속 링크입니다.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">발표자</label>
              <Input
                {...register("speaker", { required: "발표자를 입력하세요" })}
                placeholder="발표자 이름"
              />
              {errors.speaker && (
                <p className="mt-1 text-xs text-destructive">{errors.speaker.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                최대 인원 <span className="text-muted-foreground">(선택)</span>
              </label>
              <Input
                type="number"
                {...register("maxAttendees")}
                placeholder="제한 없음"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              발표자 소개 <span className="text-muted-foreground">(선택)</span>
            </label>
            <Input
              {...register("speakerBio")}
              placeholder="발표자 약력"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              외부 신청 URL <span className="text-muted-foreground">(선택)</span>
            </label>
            <Input
              {...register("registrationUrl")}
              placeholder="https://forms.gle/..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/seminars")}>
              취소
            </Button>
            <Button type="submit">
              <Send size={16} className="mr-1" />
              등록
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
