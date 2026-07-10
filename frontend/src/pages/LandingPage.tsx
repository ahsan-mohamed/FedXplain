// pages/LandingPage.tsx
import { PublicLayout } from "@/layouts/PublicLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { ArchitectureSection } from "@/components/home/ArchitectureSection";
import { ResearchSection, ContactSection } from "@/components/home/ResearchSection";

export function LandingPage() {
  return (
    <PublicLayout>
      <HeroSection />
      <HowItWorksSection />
      <ArchitectureSection />
      <ResearchSection />
      <ContactSection />
    </PublicLayout>
  );
}
