import { create } from "zustand";
import { dataApi } from "@/lib/bkend";

export interface NewsletterSection {
  id: string;
  postId: string;
  title: string;
  content: string;
  authorName: string;
  /** 작성자 유형 */
  authorType?: string;
  /** 입학 학기 (예: "2024년 전기") */
  authorEnrollment?: string;
  /** 섹션 유형 */
  type: "feature" | "interview" | "review" | "column" | "news";
  order: number;
}

export const AUTHOR_TYPE_LABELS: Record<string, string> = {
  professor: "교수",
  representative: "전공대표",
  assistant: "조교",
  president: "학회장",
  staff: "운영진",
  student: "재학생",
  alumni: "졸업생",
};

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
  /** 예약 발송 일시 (ISO string). draft 상태에서만 유효 */
  publishAt?: string;
  createdAt: string;
  /** 마지막 수정자 이름 */
  lastEditedBy?: string;
  /** 마지막 수정 일시 (ISO string) — Firestore updatedAt */
  lastEditedAt?: string;
}

const SECTION_TYPE_LABELS: Record<NewsletterSection["type"], string> = {
  feature: "특집",
  interview: "인터뷰",
  review: "리뷰",
  column: "칼럼",
  news: "소식",
};

export { SECTION_TYPE_LABELS };

/** 섹션 유형별 배지 색상 (특집/인터뷰/리뷰/칼럼/소식) */
export const SECTION_TYPE_STYLES: Record<NewsletterSection["type"], string> = {
  feature: "bg-violet-100 text-violet-700 border-violet-200",
  interview: "bg-sky-100 text-sky-700 border-sky-200",
  review: "bg-emerald-100 text-emerald-700 border-emerald-200",
  column: "bg-amber-100 text-amber-800 border-amber-200",
  news: "bg-rose-100 text-rose-700 border-rose-200",
};

/** 작성자 유형별 배지 색상 */
export const AUTHOR_TYPE_STYLES: Record<string, string> = {
  professor: "bg-indigo-100 text-indigo-700 border-indigo-200",
  representative: "bg-teal-100 text-teal-700 border-teal-200",
  assistant: "bg-cyan-100 text-cyan-700 border-cyan-200",
  president: "bg-purple-100 text-purple-700 border-purple-200",
  staff: "bg-blue-100 text-blue-700 border-blue-200",
  student: "bg-green-100 text-green-700 border-green-200",
  alumni: "bg-orange-100 text-orange-700 border-orange-200",
};

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
  const payload: Record<string, unknown> = {
    issueNumber: data.issueNumber,
    title: data.title,
    subtitle: data.subtitle,
    coverColor: data.coverColor,
    publishDate: data.publishDate,
    editorName: data.editorName,
    sections: JSON.stringify(data.sections),
    status: data.status,
  };
  if (data.publishAt !== undefined) payload.publishAt = data.publishAt;
  if (data.lastEditedBy !== undefined) payload.lastEditedBy = data.lastEditedBy;
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
  if (data.publishAt !== undefined) payload.publishAt = data.publishAt;
  if (data.lastEditedBy !== undefined) payload.lastEditedBy = data.lastEditedBy;

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
    publishAt: (doc.publishAt as string | undefined) ?? undefined,
    createdAt: (doc.createdAt as string) ?? new Date().toISOString(),
    lastEditedBy: (doc.lastEditedBy as string | undefined) ?? undefined,
    lastEditedAt: (doc.updatedAt as string | undefined) ?? undefined,
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
