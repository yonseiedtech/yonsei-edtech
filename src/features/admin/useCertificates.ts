"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { certificatesApi } from "@/lib/bkend";
import type { Certificate } from "@/types";

export function useCertificates(seminarId?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ["certificates", seminarId ?? "all"],
    queryFn: () => certificatesApi.list(seminarId),
  });

  const certificates = (data?.data ?? []) as unknown as Certificate[];

  return { certificates, isLoading };
}

export function useDeleteCertificate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => certificatesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}
