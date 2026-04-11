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

  return { todos: data ?? [], isLoading };
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
