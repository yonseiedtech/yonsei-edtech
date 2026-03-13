import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import AboutPreview from "@/components/home/AboutPreview";
import NoticePreview from "@/components/home/NoticePreview";
import SeminarPreview from "@/components/home/SeminarPreview";
import PromotionPreview from "@/components/home/PromotionPreview";
import NewsletterPreview from "@/components/home/NewsletterPreview";
import ActivityCards from "@/components/home/ActivityCards";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://yonsei-edtech.vercel.app",
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutPreview />
      <NoticePreview />
      <SeminarPreview />
      <PromotionPreview />
      <NewsletterPreview />
      <ActivityCards />
    </>
  );
}
