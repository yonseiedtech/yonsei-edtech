"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inquiriesApi } from "@/lib/bkend";
import type { Inquiry } from "@/types";

export function useInquiries(options?: { enabled?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const res = await inquiriesApi.list();
      return res.data as unknown as Inquiry[];
    },
    retry: false,
    enabled: options?.enabled ?? true,
  });

  return { inquiries: data ?? [], isLoading };
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Pick<Inquiry, "name" | "email" | "message">) => {
      return await inquiriesApi.create({
        name: data.name,
        email: data.email,
        message: data.message,
        category: "general",
        status: "pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  return { createInquiry: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      return await inquiriesApi.update(id, {
        status: "replied",
        reply,
        repliedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  return { updateInquiryStatus: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useDeleteInquiry() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await inquiriesApi.update(id, { status: "deleted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  return { deleteInquiry: mutation.mutateAsync, isLoading: mutation.isPending };
}
