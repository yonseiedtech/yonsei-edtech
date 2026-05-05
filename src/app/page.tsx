import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import TrustIndicators from "@/components/home/TrustIndicators";
import AboutPreview from "@/components/home/AboutPreview";
import NoticePreview from "@/components/home/NoticePreview";
import SeminarPreview from "@/components/home/SeminarPreview";
import PromotionPreview from "@/components/home/PromotionPreview";
import NewsletterPreview from "@/components/home/NewsletterPreview";
import GuestSpeakersSection from "@/components/home/GuestSpeakersSection";
import ActivityCards from "@/components/home/ActivityCards";
import InteractiveHome from "@/components/home/InteractiveWrap";
import HomeRedirectGate from "@/components/home/HomeRedirectGate";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://yonsei-edtech.vercel.app",
  },
};

export default function HomePage() {
  return (
    <>
      <HomeRedirectGate />
      <InteractiveHome>
        <HeroSection />
        <TrustIndicators />
        <AboutPreview />
        <NoticePreview />
        <SeminarPreview />
        <PromotionPreview />
        <NewsletterPreview />
        <GuestSpeakersSection />
        <ActivityCards />
      </InteractiveHome>
    </>
  );
}
