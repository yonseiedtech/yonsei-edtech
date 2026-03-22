"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { registrationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_REGISTRATION_FIELDS } from "@/types";
import type { RegistrationFieldConfig } from "@/types";

interface Props {
  seminarId: string;
  seminarTitle: string;
  fields?: RegistrationFieldConfig[];
  onSubmitted?: () => void;
}

export default function SeminarRegistrationForm({ seminarId, seminarTitle, fields, onSubmitted }: Props) {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);

  const activeFields = (fields ?? DEFAULT_REGISTRATION_FIELDS).filter((f) => f.enabled);

  const defaults: Record<string, string> = {};
  for (const f of activeFields) {
    if (f.key === "name") defaults[f.key] = user?.name ?? "";
    else if (f.key === "email") defaults[f.key] = user?.email ?? "";
    else defaults[f.key] = "";
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({ defaultValues: defaults });

  async function onSubmit(data: Record<string, string>) {
    try {
      const payload: Record<string, unknown> = { seminarId, userId: user?.id ?? undefined };
      for (const f of activeFields) {
        const val = data[f.key]?.trim();
        if (val) payload[f.key] = val;
      }
      await registrationsApi.create(payload);
      setSubmitted(true);
      onSubmitted?.();
      toast.success("신청이 완료되었습니다.");
    } catch {
      toast.error("신청에 실패했습니다. 다시 시도해주세요.");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-bold">신청 완료</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          &ldquo;{seminarTitle}&rdquo; 세미나 참석 신청이 완료되었습니다.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border bg-white p-8"
    >
      <h3 className="text-lg font-bold">세미나 참석 신청</h3>
      <p className="text-sm text-muted-foreground">
        아래 정보를 입력하고 참석을 신청하세요. 비회원도 신청 가능합니다.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {activeFields.map((field) => {
          if (field.type === "textarea") return null;
          return (
            <div key={field.key}>
              <label className="mb-1.5 block text-sm font-medium">
                {field.label} {field.required ? "*" : <span className="text-muted-foreground">(선택)</span>}
              </label>
              {field.type === "select" && field.options ? (
                <select
                  {...register(field.key, field.required ? { required: `${field.label}을(를) 선택하세요` } : undefined)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- 선택 --</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type}
                  {...register(field.key, field.required ? { required: `${field.label}을(를) 입력하세요` } : undefined)}
                  placeholder={field.placeholder}
                />
              )}
              {errors[field.key] && (
                <p className="mt-1 text-xs text-destructive">{errors[field.key]?.message as string}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Textarea fields rendered full-width */}
      {activeFields.filter((f) => f.type === "textarea").map((field) => (
        <div key={field.key}>
          <label className="mb-1.5 block text-sm font-medium">
            {field.label} {field.required ? "*" : <span className="text-muted-foreground">(선택)</span>}
          </label>
          <Textarea
            {...register(field.key, field.required ? { required: `${field.label}을(를) 입력하세요` } : undefined)}
            placeholder={field.placeholder}
            rows={3}
          />
          {errors[field.key] && (
            <p className="mt-1 text-xs text-destructive">{errors[field.key]?.message as string}</p>
          )}
        </div>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          <Send size={16} className="mr-1" />
          {isSubmitting ? "신청 중..." : "참석 신청"}
        </Button>
      </div>
    </form>
  );
}
