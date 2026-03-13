import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";
import AboutPreview from "@/components/home/AboutPreview";
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
      <ActivityCards />
    </>
  );
}
