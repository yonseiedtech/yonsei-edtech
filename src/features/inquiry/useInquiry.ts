"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inquiriesApi } from "@/lib/bkend";
import { useInquiryStore } from "./inquiry-store";
import type { Inquiry } from "@/types";

export function useInquiries() {
  const storeInquiries = useInquiryStore((s) => s.inquiries);

  const { data, isLoading } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const res = await inquiriesApi.list();
      return res.data as unknown as Inquiry[];
    },
    placeholderData: () => storeInquiries,
    retry: false,
  });

  const inquiries = data ?? storeInquiries;
  return { inquiries, isLoading };
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();
  const addInquiry = useInquiryStore((s) => s.addInquiry);

  const mutation = useMutation({
    mutationFn: async (data: Pick<Inquiry, "name" | "email" | "message">) => {
      try {
        return await inquiriesApi.create({
          name: data.name,
          email: data.email,
          message: data.message,
          category: "general",
          status: "pending",
        });
      } catch {
        addInquiry(data);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  return { createInquiry: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();
  const updateStatus = useInquiryStore((s) => s.updateStatus);

  const mutation = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      try {
        return await inquiriesApi.update(id, {
          status: "replied",
          reply,
          repliedAt: new Date().toISOString(),
        });
      } catch {
        updateStatus(id, reply);
        return null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });

  return { updateInquiryStatus: mutation.mutateAsync, isLoading: mutation.isPending };
}
