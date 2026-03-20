import { create } from "zustand";
import { dataApi } from "@/lib/bkend";

export interface NewsletterSection {
  id: string;
  postId: string;
  title: string;
  content: string;
  authorName: string;
  /** 섹션 유형 */
  type: "feature" | "interview" | "review" | "column" | "news";
  order: number;
}

export interface NewsletterIssue {
  id: string;
  /** 호수 (예: 12) */
  issueNumber: number;
  title: string;
  subtitle: string;
  /** 표지 색상 테마 */
  coverColor: string;
  publishDate: string;
  editorName: string;
  sections: NewsletterSection[];
  status: "draft" | "published";
  createdAt: string;
}

const SECTION_TYPE_LABELS: Record<NewsletterSection["type"], string> = {
  feature: "특집",
  interview: "인터뷰",
  review: "리뷰",
  column: "칼럼",
  news: "소식",
};

export { SECTION_TYPE_LABELS };

// ── Firestore CRUD helpers ──

const TABLE = "newsletters";

export async function fetchNewsletters(): Promise<NewsletterIssue[]> {
  const res = await dataApi.list<Record<string, unknown>>(TABLE, {
    sort: "issueNumber:desc",
    limit: 100,
  });
  return res.data.map(docToIssue);
}

export async function createNewsletter(
  data: Omit<NewsletterIssue, "id" | "createdAt">
): Promise<NewsletterIssue> {
  const payload = {
    issueNumber: data.issueNumber,
    title: data.title,
    subtitle: data.subtitle,
    coverColor: data.coverColor,
    publishDate: data.publishDate,
    editorName: data.editorName,
    sections: JSON.stringify(data.sections),
    status: data.status,
  };
  const doc = await dataApi.create<Record<string, unknown>>(TABLE, payload);
  return docToIssue(doc);
}

export async function updateNewsletter(
  id: string,
  data: Partial<NewsletterIssue>
): Promise<NewsletterIssue> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.subtitle !== undefined) payload.subtitle = data.subtitle;
  if (data.coverColor !== undefined) payload.coverColor = data.coverColor;
  if (data.publishDate !== undefined) payload.publishDate = data.publishDate;
  if (data.editorName !== undefined) payload.editorName = data.editorName;
  if (data.status !== undefined) payload.status = data.status;
  if (data.issueNumber !== undefined) payload.issueNumber = data.issueNumber;
  if (data.sections !== undefined) payload.sections = JSON.stringify(data.sections);

  const doc = await dataApi.update<Record<string, unknown>>(TABLE, id, payload);
  return docToIssue(doc);
}

export async function deleteNewsletter(id: string): Promise<void> {
  await dataApi.delete(TABLE, id);
}

function docToIssue(doc: Record<string, unknown>): NewsletterIssue {
  let sections: NewsletterSection[] = [];
  if (typeof doc.sections === "string") {
    try {
      sections = JSON.parse(doc.sections);
    } catch {
      sections = [];
    }
  } else if (Array.isArray(doc.sections)) {
    sections = doc.sections as NewsletterSection[];
  }

  return {
    id: doc.id as string,
    issueNumber: (doc.issueNumber as number) ?? 0,
    title: (doc.title as string) ?? "",
    subtitle: (doc.subtitle as string) ?? "",
    coverColor: (doc.coverColor as string) ?? "from-violet-600 to-indigo-700",
    publishDate: (doc.publishDate as string) ?? "",
    editorName: (doc.editorName as string) ?? "",
    sections,
    status: (doc.status as "draft" | "published") ?? "draft",
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
  };
}

// ── React Query hooks ──

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const QUERY_KEY = ["newsletters"];

export function useNewsletters() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNewsletters,
    staleTime: 1000 * 60 * 5,
  });
  return { issues: data ?? [], isLoading };
}

export function useCreateNewsletter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNewsletter,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateNewsletter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewsletterIssue> }) =>
      updateNewsletter(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteNewsletter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteNewsletter,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

// ── Zustand store (로컬 편집 상태 전용) ──

interface NewsletterState {
  issues: NewsletterIssue[];
  setIssues: (issues: NewsletterIssue[]) => void;
  addIssue: (issue: Omit<NewsletterIssue, "id" | "createdAt">) => void;
  updateIssue: (id: string, data: Partial<NewsletterIssue>) => void;
  addSection: (issueId: string, section: Omit<NewsletterSection, "id">) => void;
  updateSection: (issueId: string, sectionId: string, data: Partial<NewsletterSection>) => void;
  removeSection: (issueId: string, sectionId: string) => void;
  reorderSections: (issueId: string, sections: NewsletterSection[]) => void;
}

export const useNewsletterStore = create<NewsletterState>((set) => ({
  issues: [],

  setIssues: (issues) => set({ issues }),

  addIssue: (data) =>
    set((state) => ({
      issues: [
        { ...data, id: `nl-${Date.now()}`, createdAt: new Date().toISOString() },
        ...state.issues,
      ],
    })),

  updateIssue: (id, data) =>
    set((state) => ({
      issues: state.issues.map((i) => (i.id === id ? { ...i, ...data } : i)),
    })),

  addSection: (issueId, section) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, sections: [...i.sections, { ...section, id: `s${Date.now()}` }] }
          : i
      ),
    })),

  updateSection: (issueId, sectionId, data) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? {
              ...i,
              sections: i.sections.map((s) =>
                s.id === sectionId ? { ...s, ...data } : s
              ),
            }
          : i
      ),
    })),

  removeSection: (issueId, sectionId) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId
          ? { ...i, sections: i.sections.filter((s) => s.id !== sectionId) }
          : i
      ),
    })),

  reorderSections: (issueId, sections) =>
    set((state) => ({
      issues: state.issues.map((i) =>
        i.id === issueId ? { ...i, sections } : i
      ),
    })),
}));
