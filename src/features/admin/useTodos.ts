"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { todosApi } from "@/lib/bkend";
import type { AdminTodo } from "@/types";

export function useTodos() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-todos"],
    queryFn: async () => {
      const res = await todosApi.list();
      return res.data as AdminTodo[];
    },
    retry: false,
  });

  // 사이클 99: dataApi.list 가 배열을 보장하지만, 런타임에 비배열이 들어오는 케이스 방어
  // (eb.filter/D.filter is not a function 크래시 — 마이페이지·콘솔 흰화면 원인)
  return { todos: Array.isArray(data) ? data : [], isLoading };
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: Omit<AdminTodo, "id" | "createdAt" | "updatedAt">) => {
      return await todosApi.create(data as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
    },
  });

  return { createTodo: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<AdminTodo>) => {
      return await todosApi.update(id, data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
    },
  });

  return { updateTodo: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      return await todosApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-todos"] });
    },
  });

  return { deleteTodo: mutation.mutateAsync, isLoading: mutation.isPending };
}
