"use client";

/**
 * 다회성 모임 개설 폼 (DialogContent 내부 전용)
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_GROUP_CATEGORIES,
  type ActivityGroupCategory,
  type ActivityGroupStatus,
} from "@/types";
import type { User } from "@/types";
import { activityGroupsApi, activityGroupMembersApi } from "@/features/activity-groups/api";

const COVER_EMOJI_OPTIONS = ["📚", "🍷", "🎸", "⚽", "🎨", "🏃", "🎬", "🍳", "🌿", "✏️"];

interface Props {
  user: User;
  onClose: () => void;
  onCreated: () => void;
}

export default function ActivityGroupCreateForm({ user, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ActivityGroupCategory>("기타");
  const [coverEmoji, setCoverEmoji] = useState("📚");
  const [cadence, setCadence] = useState("");
  const [place, setPlace] = useState("");
  const [memberLimit, setMemberLimit] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      toast.error("모임 이름과 설명을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const group = await activityGroupsApi.create({
        name: name.trim(),
        description: description.trim(),
        category,
        coverEmoji,
        leaderId: user.id,
        leaderName: user.name,
        cadence: cadence.trim() || undefined,
        place: place.trim() || undefined,
        status: "recruiting" as ActivityGroupStatus,
        memberLimit: memberLimit ? Number(memberLimit) : undefined,
        createdBy: user.id,
      });

      // 개설자를 리더로 멤버에 자동 등록
      await activityGroupMembersApi.join(group.id, user.id, user.name, "leader");

      toast.success("모임이 개설되었습니다!");
      onCreated();
    } catch (err) {
      console.error(err);
      toast.error("모임 개설에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 이모지 선택 */}
      <div className="space-y-1.5">
        <Label>아이콘</Label>
        <div className="flex flex-wrap gap-2">
          {COVER_EMOJI_OPTIONS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setCoverEmoji(em)}
              className={`rounded-lg border px-2.5 py-1.5 text-xl transition-colors ${
                coverEmoji === em
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* 모임 이름 */}
      <div className="space-y-1.5">
        <Label htmlFor="ag-name">모임 이름 *</Label>
        <Input
          id="ag-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 교육공학 독서모임"
          maxLength={40}
          required
        />
      </div>

      {/* 설명 */}
      <div className="space-y-1.5">
        <Label htmlFor="ag-desc">설명 *</Label>
        <Textarea
          id="ag-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="모임의 목적, 활동 내용을 간략히 소개해주세요."
          maxLength={300}
          rows={3}
          required
        />
      </div>

      {/* 카테고리 */}
      <div className="space-y-1.5">
        <Label htmlFor="ag-category">카테고리</Label>
        <select
          id="ag-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ActivityGroupCategory)}
          className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
        >
          {ACTIVITY_GROUP_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 모임 주기 */}
        <div className="space-y-1.5">
          <Label htmlFor="ag-cadence">모임 주기</Label>
          <Input
            id="ag-cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            placeholder="예: 격주 목요일 19시"
            maxLength={40}
          />
        </div>

        {/* 장소 */}
        <div className="space-y-1.5">
          <Label htmlFor="ag-place">주로 만나는 곳</Label>
          <Input
            id="ag-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="예: 신촌 카페, 온라인"
            maxLength={40}
          />
        </div>
      </div>

      {/* 정원 */}
      <div className="space-y-1.5">
        <Label htmlFor="ag-limit">정원 (선택 — 빈칸은 무제한)</Label>
        <Input
          id="ag-limit"
          type="number"
          min={2}
          max={100}
          value={memberLimit}
          onChange={(e) => setMemberLimit(e.target.value)}
          placeholder="예: 10"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          취소
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "개설 중..." : "모임 개설"}
        </Button>
      </div>
    </form>
  );
}
