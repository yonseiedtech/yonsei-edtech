import type {
  User,
  ResearchReport,
  ResearchPaper,
  StudySession,
  ResearchProposal,
  ResearchDesign,
  WritingPaper,
} from "@/types";

export interface UserResearchSummary {
  user: User;
  report?: ResearchReport;
  proposal?: ResearchProposal;
  design?: ResearchDesign;
  writing?: WritingPaper;
  papers: ResearchPaper[];
  sessions: StudySession[];
  totalMinutes: number;
  reportProgress: number; // 0~100
  proposalProgress: number; // 0~100
  designProgress: number; // 0~100
  writingCharCount: number;
  lastActivityAt?: string;
}
