import { create } from "zustand";
import type { Inquiry } from "@/types";
import { MOCK_INQUIRIES } from "./inquiry-data";

interface InquiryState {
  inquiries: Inquiry[];
  addInquiry: (data: Pick<Inquiry, "name" | "email" | "message">) => void;
  updateStatus: (id: string, reply: string) => void;
  deleteInquiry: (id: string) => void;
}

export const useInquiryStore = create<InquiryState>((set) => ({
  inquiries: MOCK_INQUIRIES,

  addInquiry: (data) =>
    set((state) => ({
      inquiries: [
        {
          ...data,
          id: `inq${Date.now()}`,
          status: "pending" as const,
          createdAt: new Date().toISOString(),
        },
        ...state.inquiries,
      ],
    })),

  updateStatus: (id, reply) =>
    set((state) => ({
      inquiries: state.inquiries.map((inq) =>
        inq.id === id
          ? {
              ...inq,
              status: "replied" as const,
              reply,
              repliedAt: new Date().toISOString(),
            }
          : inq
      ),
    })),

  deleteInquiry: (id) =>
    set((state) => ({
      inquiries: state.inquiries.filter((inq) => inq.id !== id),
    })),
}));
