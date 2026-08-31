import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PrismaHero } from "@/components/ui/prisma-hero";
import { Features } from "@/components/ui/features-8";
import { ComoFuncionaSection } from "@/components/ComoFuncionaSection";
import { useHashScroll } from "@/hooks/use-hash-scroll";

const Index = () => {
  useHashScroll();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader overlay />
      <PrismaHero />
      <ComoFuncionaSection />
      <Features />
      <SiteFooter />
    </div>
  );
};

export default Index;
