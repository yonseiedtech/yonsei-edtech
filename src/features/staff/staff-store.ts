"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/bkend";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StaffNotice {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "planning" | "active" | "done";

export interface StaffProject {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  status: ProjectStatus;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "doing" | "review" | "done";

export interface TaskChecklist {
  label: string;
  done: boolean;
}

export interface StaffTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  status: TaskStatus;
  checklist?: TaskChecklist[];
  dueDate?: string;
  order: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Notices ────────────────────────────────────────────────────────────────────

const NOTICES_TABLE = "staff_notices";

function docToNotice(doc: Record<string, unknown>): StaffNotice {
  return {
    id: String(doc.id ?? ""),
    title: String(doc.title ?? ""),
    body: String(doc.body ?? ""),
    pinned: Boolean(doc.pinned),
    authorId: String(doc.authorId ?? ""),
    authorName: String(doc.authorName ?? ""),
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

export function useStaffNotices() {
  return useQuery({
    queryKey: ["staff_notices"],
    queryFn: async () => {
      const res = await dataApi.list<Record<string, unknown>>(NOTICES_TABLE, { limit: 100 });
      const notices = res.data.map(docToNotice);
      // pinned first, then createdAt desc
      notices.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      return notices;
    },
  });
}

export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      body: string;
      pinned: boolean;
      authorId: string;
      authorName: string;
    }) => dataApi.create<Record<string, unknown>>(NOTICES_TABLE, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_notices"] }),
  });
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffNotice> }) =>
      dataApi.update<Record<string, unknown>>(NOTICES_TABLE, id, data as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_notices"] }),
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataApi.delete(NOTICES_TABLE, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_notices"] }),
  });
}

// ── Projects ───────────────────────────────────────────────────────────────────

const PROJECTS_TABLE = "staff_projects";

function docToProject(doc: Record<string, unknown>): StaffProject {
  return {
    id: String(doc.id ?? ""),
    name: String(doc.name ?? ""),
    description: doc.description ? String(doc.description) : undefined,
    ownerId: String(doc.ownerId ?? ""),
    ownerName: String(doc.ownerName ?? ""),
    status: (doc.status as ProjectStatus) ?? "planning",
    dueDate: doc.dueDate ? String(doc.dueDate) : undefined,
    createdBy: String(doc.createdBy ?? ""),
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

export function useStaffProjects() {
  return useQuery({
    queryKey: ["staff_projects"],
    queryFn: async () => {
      const res = await dataApi.list<Record<string, unknown>>(PROJECTS_TABLE, { limit: 100 });
      const projects = res.data.map(docToProject);
      projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return projects;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StaffProject, "id" | "createdAt" | "updatedAt">) =>
      dataApi.create<Record<string, unknown>>(PROJECTS_TABLE, data as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StaffProject> }) =>
      dataApi.update<Record<string, unknown>>(PROJECTS_TABLE, id, data as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dataApi.delete(PROJECTS_TABLE, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff_projects"] });
      qc.invalidateQueries({ queryKey: ["staff_tasks"] });
    },
  });
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

const TASKS_TABLE = "staff_tasks";

function parseChecklist(raw: unknown): TaskChecklist[] | undefined {
  if (!raw) return undefined;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as TaskChecklist[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as TaskChecklist[];
  return undefined;
}

function docToTask(doc: Record<string, unknown>): StaffTask {
  return {
    id: String(doc.id ?? ""),
    projectId: String(doc.projectId ?? ""),
    title: String(doc.title ?? ""),
    description: doc.description ? String(doc.description) : undefined,
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : undefined,
    assigneeName: doc.assigneeName ? String(doc.assigneeName) : undefined,
    status: (doc.status as TaskStatus) ?? "todo",
    checklist: parseChecklist(doc.checklist),
    dueDate: doc.dueDate ? String(doc.dueDate) : undefined,
    order: Number(doc.order ?? 0),
    createdBy: String(doc.createdBy ?? ""),
    createdAt: String(doc.createdAt ?? ""),
    updatedAt: String(doc.updatedAt ?? ""),
  };
}

export function useStaffTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["staff_tasks", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await dataApi.list<Record<string, unknown>>(TASKS_TABLE, {
        "filter[projectId]": projectId,
        limit: 200,
      });
      return res.data.map(docToTask).sort((a, b) => a.order - b.order);
    },
    enabled: !!projectId,
  });
}

/** All tasks across projects — used for portfolio (project list) progress. */
export function useAllStaffTasks() {
  return useQuery({
    queryKey: ["staff_tasks", "__all__"],
    queryFn: async () => {
      const res = await dataApi.list<Record<string, unknown>>(TASKS_TABLE, { limit: 500 });
      return res.data.map(docToTask);
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StaffTask, "id" | "createdAt" | "updatedAt">) => {
      const payload = {
        ...data,
        checklist: data.checklist ? JSON.stringify(data.checklist) : undefined,
      };
      return dataApi.create<Record<string, unknown>>(TASKS_TABLE, payload as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; projectId: string; data: Partial<StaffTask> }) => {
      const payload: Record<string, unknown> = { ...data };
      if (data.checklist !== undefined) {
        payload.checklist = JSON.stringify(data.checklist);
      }
      return dataApi.update<Record<string, unknown>>(TASKS_TABLE, id, payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) => dataApi.delete(TASKS_TABLE, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff_tasks"] }),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** D-day status based on dueDate vs today (KST-safe: string compare at midnight) */
export function getDueDateStatus(dueDate: string | undefined): "overdue" | "warn" | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays <= 3) return "warn";
  return null;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  review: "검토",
  done: "완료",
};

/** Tailwind semantic chip class string per task status — no raw color tokens */
export const TASK_STATUS_CHIP: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground border border-border",
  doing: "bg-info/10 text-info border border-info/20",
  review: "bg-warning/10 text-warning border border-warning/20",
  done: "bg-success/10 text-success border border-success/20",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "기획 중",
  active: "진행 중",
  done: "완료",
};

export const PROJECT_STATUS_CHIP: Record<ProjectStatus, string> = {
  planning: "bg-muted text-muted-foreground border border-border",
  active: "bg-info/10 text-info border border-info/20",
  done: "bg-success/10 text-success border border-success/20",
};

export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "doing", "review", "done"];
