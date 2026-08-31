import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";

const HERO_VIDEO_SRC = "/hero-bg.mp4?v=3556014";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ---------------- WordsPullUp ---------------- */
interface WordsPullUpProps {
  text: string;
  className?: string;
  showAsterisk?: boolean;
  nowrap?: boolean;
  style?: CSSProperties;
}

export const WordsPullUp = ({ text, className = "", showAsterisk = false, nowrap = false, style }: WordsPullUpProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const words = text.split(" ");

  return (
    <div ref={ref} className={`inline-flex ${nowrap ? "flex-nowrap" : "flex-wrap"} ${className}`} style={style}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1;
        return (
          <motion.span
            key={`${word}-${i}`}
            initial={{ y: 20, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
            className="relative inline-block"
            style={{ marginRight: isLast ? 0 : "0.25em" }}
          >
            {word}
            {showAsterisk && isLast && (
              <span className="absolute -right-[0.3em] top-[0.65em] text-[0.31em] text-accent">*</span>
            )}
          </motion.span>
        );
      })}
    </div>
  );
};

/* ---------------- WordsPullUpMultiStyle ---------------- */
interface Segment {
  text: string;
  className?: string;
}

interface WordsPullUpMultiStyleProps {
  segments: Segment[];
  className?: string;
  style?: CSSProperties;
}

export const WordsPullUpMultiStyle = ({ segments, className = "", style }: WordsPullUpMultiStyleProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const words: { word: string; className?: string }[] = [];
  segments.forEach((seg) => {
    seg.text.split(" ").forEach((w) => {
      if (w) words.push({ word: w, className: seg.className });
    });
  });

  return (
    <div ref={ref} className={`inline-flex flex-wrap justify-center ${className}`} style={style}>
      {words.map((w, i) => (
        <motion.span
          key={`${w.word}-${i}`}
          initial={{ y: 20, opacity: 0 }}
          animate={isInView ? { y: 0, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: i * 0.08, ease: EASE_OUT }}
          className={`inline-block ${w.className ?? ""}`}
          style={{ marginRight: "0.25em" }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
};

/* ---------------- Hero ---------------- */
const PrismaHero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !videoRef.current || !sectionRef.current) return;
      const compact = window.matchMedia("(max-width: 767px)").matches;
      gsap.fromTo(
        videoRef.current,
        { scale: compact ? 1.05 : 1.12 },
        {
          scale: 1,
          duration: 2.4,
          ease: "power2.out",
        },
      );
      gsap.to(videoRef.current, {
        yPercent: compact ? 7 : 14,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="h-[100dvh] w-full p-2 md:p-3">
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-primary md:rounded-[2rem]">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full origin-center object-cover object-[center_40%] will-change-transform md:object-center"
          src={HERO_VIDEO_SRC}
        />

        <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-overlay" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/35 to-primary/92 sm:from-primary/55 sm:via-primary/15 sm:to-primary/85" />

        <div className="absolute inset-x-0 bottom-0 px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.75rem))] pt-24 sm:px-10 sm:pb-10 md:px-14 md:pb-12 lg:px-16 lg:pb-14">
          <div className="grid grid-cols-12 items-end gap-4 sm:gap-8 lg:gap-12">
            <div className="col-span-12 lg:col-span-8 lg:pr-8">
              <h1 className="flex flex-col gap-1 font-display text-[clamp(2.15rem,9vw,2.85rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-primary-foreground sm:gap-2.5 sm:text-[7vw] sm:leading-none sm:tracking-[-0.03em] md:text-[5.8vw] lg:gap-3 lg:text-[4.8vw] xl:text-[4.2vw]">
                <span className="hidden sm:block">
                  <WordsPullUp text="Quer comprar um carro" />
                </span>
                <span className="block sm:hidden">
                  <WordsPullUp text="Quer comprar" nowrap />
                </span>
                <span className="block sm:hidden">
                  <WordsPullUp text="um carro" nowrap />
                </span>
                <span className="hidden text-accent sm:block">
                  <WordsPullUp text="sem perder tempo?" />
                </span>
                <span className="block text-accent sm:hidden">
                  <WordsPullUp text="sem perder" nowrap />
                </span>
                <span className="block text-accent sm:hidden">
                  <WordsPullUp text="tempo?" nowrap />
                </span>
              </h1>
            </div>

            <div className="col-span-12 flex flex-col gap-3 sm:gap-5 lg:col-span-4">
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: EASE_OUT }}
                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent sm:text-xs"
              >
                Stands verificados · Resposta em 24h
              </motion.p>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.58, ease: EASE_OUT }}
                className="max-w-md text-[13px] leading-snug text-primary-foreground/85 sm:text-base"
              >
                Diga o que procura e receba propostas reais. Compare lado a lado e feche o melhor negócio — sem compromisso e sem voltas.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT }}
              >
                <Link
                  to="/quero-carro"
                  className="group inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-full bg-accent py-1 pl-5 pr-1 text-[15px] font-medium text-accent-foreground shadow-accent transition-all hover:gap-3 sm:min-h-0 sm:w-auto sm:justify-start sm:text-base"
                >
                  Quero o meu carro
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary transition-transform group-hover:scale-110">
                    <ArrowRight className="h-4 w-4 text-primary-foreground" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export { PrismaHero };
