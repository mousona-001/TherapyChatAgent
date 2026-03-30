import {
  Nav,
  HeroSection,
  LogosBanner,
  StatsBand,
  HowItWorksSection,
  FeaturesBentoGrid,
  HybridSection,
  TestimonialsSection,
  CtaSection,
  Footer
} from "../features/landing/components";

export default function Home() {
  return (
    <main className="min-h-screen bg-surface selection:bg-primary-container selection:text-primary overflow-x-hidden">
      <Nav />
      <HeroSection />
      <LogosBanner />
      <StatsBand />
      <HowItWorksSection />
      <FeaturesBentoGrid />
      <HybridSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
