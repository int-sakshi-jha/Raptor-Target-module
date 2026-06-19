import React, { useMemo, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks"; // adjust path to your hooks file
import { AlertTriangle } from "lucide-react";
import LoadingWrapper from "./LoadingWrapper";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface AppLoadingScreenProps {
  error?: string | null;
  appName?: string;
  loadingMessage?: string;
}

type ThemeMode = "light" | "dark" | "system_default";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const STEPS = ["Authenticating", "Loading profile", "Building dashboard"];

/* ─────────────────────────────────────────────
   SEEDED RNG  – stable particle data across renders
───────────────────────────────────────────── */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/* ─────────────────────────────────────────────
   HOOK – apply dark class to <html> based on
   Redux theme value ("light" | "dark" | "system_default")
   Your app likely already does this globally —
   if so, remove this hook and keep only the
   useAppSelector line in the component.
───────────────────────────────────────────── */
function useApplyTheme(theme: ThemeMode) {
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system_default" && mediaQuery.matches);

      root.classList.toggle("dark", isDark);
    };

    applyTheme();

    if (theme === "system_default") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }
  }, [theme]);
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
const loadingQuotes = [
  "Negotiating with the clouds for a 15-minute ceasefire",
  "Polishing every individual photon before delivery",
  "Calculating how many sunbeams we've successfully caught today",
  "Waiting for the Sun to finish its morning coffee",
  "Applying SPF 50 to the database",
  "Convincing the panels that the moon isn't just a giant, useless lightbulb",
  "Waking up the inverter. It's not a morning piece of hardware",
  'Converting "Hot Yellow Circles" into "Cold Hard Cash"',
  "Dusting off virtual bird droppings for maximum efficiency",
  "Trying to find where the grid hid the extra 12 KW",
  "Praising the Sun. (Standard protocol)",
  "We are not liable for any broken screens as a result of waiting",
  "Wait... did a cloud just walk by? Recalibrating everything",
];

const randomQuote =
  loadingQuotes[Math.floor(Math.random() * loadingQuotes.length)];

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  error = null,
  appName = "Raptor",
  loadingMessage = randomQuote,
}) => {
  /* ── Theme from Redux ── */
  const { theme } = useAppSelector((state) => state.auth);
  useApplyTheme(theme);
  // NOTE: If your app already manages the `dark` class on <html> globally
  // (e.g. in a ThemeProvider), remove `useApplyTheme` above entirely.
  // Tailwind's dark: variants will just work automatically.

  /* ── Stable particles ── */
  const particles = useMemo(() => {
    const rng = makeRng(0xdeadbeef);
    return Array.from({ length: 26 }, (_, i) => ({
      id: i,
      left: rng() * 100,
      size: 2 + rng() * 2.5,
      duration: 7 + rng() * 9,
      delay: rng() * 9,
      dx: (rng() - 0.5) * 90,
    }));
  }, []);

  /* ── Step cycling ── */
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    if (error) return;
    const id = setInterval(
      () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1)),
      1400,
    );
    return () => clearInterval(id);
  }, [error]);

  /* ── Canvas: twinkling dots (dark) / warm specks (light) ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      cvs.width = cvs.offsetWidth;
      cvs.height = cvs.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const rng = makeRng(0xcafe);
    const dots = Array.from({ length: 100 }, () => ({
      x: rng(),
      y: rng(),
      r: rng() * 1.4,
      a: 0.2 + rng() * 0.7,
      speed: 0.002 + rng() * 0.005,
      phase: rng() * Math.PI * 2,
    }));

    let raf: number;
    let t = 0;
    const isDarkTheme = () => {
      const t = themeRef.current;
      return (
        t === "dark" ||
        (t === "system_default" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    };

    const draw = () => {
      const w = cvs.width,
        h = cvs.height;
      ctx.clearRect(0, 0, w, h);
      const dark = isDarkTheme();
      dots.forEach((d) => {
        const alpha = d.a * (0.4 + 0.6 * Math.sin(t * d.speed + d.phase));
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = dark
          ? `rgba(255,255,255,${(alpha * 0.6).toFixed(3)})`
          : `rgba(233,113,36,${(alpha * 0.2).toFixed(3)})`;
        ctx.fill();
      });
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []); // once — themeRef carries live value

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <LoadingWrapper
      appName={appName}
      outerClassName="fixed inset-0 z-[9999] min-h-0 px-0 py-0"
      loaderSize="default"
      cardClassName={`
        w-auto max-w-[calc(100vw-40px)]
        px-10 pt-12 pb-7
        ${error ? "shadow-[0_0_0_1px_rgba(220,38,38,0.30),0_32px_72px_rgba(0,0,0,0.11)] dark:shadow-[0_0_0_1px_rgba(220,38,38,0.28),0_48px_96px_rgba(0,0,0,0.70)]" : ""}
      `}
      borderClassName={
        error
          ? "border border-red-400/30 dark:border-red-500/28 [animation:none]"
          : "border border-brand-500/45 dark:border-brand-500/38 [animation:ls-borderPulse_3s_ease-in-out_infinite]"
      }
      role="status"
      ariaLive="polite"
      ariaLabel={error ? "Application failed to load" : `Loading ${appName}`}
      showLoader={!error}
      showLiveBadge={!error}
      showShimmer={!error}
      backgroundExtras={
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      }
      overlayContent={
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-0 rounded-full bg-brand-500"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                boxShadow: "0 0 6px rgba(233,113,36,0.55)",
                opacity: 0,
                animationName: "ls-floatUp",
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                ["--dx" as string]: `${p.dx}px`,
              }}
            />
          ))}
        </div>
      }
    >
      {/* ── Error icon ── */}
        {error && (
          <div className="relative mb-5">
            {" "}
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />{" "}
            <AlertTriangle
              className="relative z-10 w-[52px] h-[52px] text-red-600 dark:text-red-400 animate-bounce"
              strokeWidth={1.8}
            />{" "}
          </div>
        )}

        {/* ── Title & subtitle ── */}
        <div className="relative z-10 text-center mb-4 w-full">
          {error ? (
            <>
              <h2
                className="
                text-2xl font-semibold tracking-tight mb-2
                text-red-700 dark:text-red-400
              "
              >
                Connection Failed
              </h2>
              <p className="text-md leading-relaxed text-neutral-500 dark:text-neutral-400">
                Oops! The sun showed up for work. The server didn’t.
              </p>
            </>
          ) : (
            <>
              <p
                className="
    relative max-w-xs mx-auto leading-relaxed text-lg sm:text-lg md:text-xl font-medium mb-3
    text-transparent bg-clip-text
    bg-[length:300%_100%]
    animate-[solarTextGlow_5.5s_ease-in-out_infinite]

    /* Light mode gradient — dark brown base + vivid orange sweep */
    [background-image:linear-gradient(90deg,#7c3a0e_0%,#7c3a0e_20%,#d45d00_36%,#ff6a00_48%,#ffaa33_56%,#7c3a0e_72%,#7c3a0e_100%)]

    /* Dark mode gradient — white/45 base + orange sweep */
    dark:[background-image:linear-gradient(90deg,rgba(255,255,255,0.45)_0%,rgba(255,255,255,0.45)_20%,#b85810_36%,#E97124_48%,#ffc060_56%,rgba(255,255,255,0.45)_72%,rgba(255,255,255,0.45)_100%)]
  "
              >
                {loadingMessage ?? randomQuote}
              </p>
            </>
          )}
        </div>

        {/* ── Step chips (loading only) ── */}
        {!error && (
          <div className="relative z-10 flex flex-wrap gap-1.5 items-center justify-center [animation:ls-textFade_0.7s_0.7s_both]">
            {STEPS.map((label, i) => {
              const isDone = i < activeStep;
              const isActive = i === activeStep;

              return (
                <div
                  key={label}
                  className={`
                    flex items-center gap-1.5 text-[11px] tracking-wide
                    px-2.5 py-1 rounded-full
                    border transition-all duration-300
                    ${
                      isActive
                        ? "text-brand-500 border-brand-500/40 bg-brand-500/10"
                        : isDone
                          ? "text-[#6b3a1a]  dark:text-white/45 border-black/[0.12] dark:border-white/[0.10]"
                          : "text-neutral-400 dark:text-white/25 border-black/[0.08] dark:border-white/[0.07]"
                    }
                  `}
                >
                  <span
                    className={`
                      w-[5px] h-[5px] rounded-full flex-shrink-0
                      ${
                        isActive
                          ? "bg-brand-500 shadow-[0_0_6px_rgba(233,113,36,0.9)] [animation:ls-dotPulse_1s_ease-in-out_infinite]"
                          : isDone
                            ? "bg-neutral-400 dark:bg-white/40"
                            : "bg-current"
                      }
                    `}
                  />
                  {label}
                </div>
              );
            })}
          </div>
        )}
      <style>{KEYFRAMES}</style>
    </LoadingWrapper>
  );
};

/* ─────────────────────────────────────────────
   KEYFRAMES  – all animation names prefixed
   with "ls-" to avoid collisions
───────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes ls-textFade {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes ls-progressSweep {
    0%   { width: 0%;  margin-left: 0;    }
    50%  { width: 65%; margin-left: 18%;  }
    100% { width: 0%;  margin-left: 100%; }
  }
  @keyframes ls-dotPulse {
    0%,100% { transform: scale(1);    }
    50%     { transform: scale(1.65); }
  }
  @keyframes ls-floatUp {
    0%   { transform: translateY(0) translateX(0) scale(1);                        opacity: 0;    }
    7%   { opacity: 0.65; }
    88%  { opacity: 0.40; }
    100% { transform: translateY(-105vh) translateX(var(--dx, 0px)) scale(0.3);    opacity: 0;    }
  }
  @keyframes solarTextGlow {
  0% {
    background-position: 200% 0;
    filter: brightness(1);
  }

  20% {
    filter: brightness(1.05);
  }

  50% {
    filter: brightness(1.25);
  }

  80% {
    filter: brightness(1.05);
  }

  100% {
    background-position: -200% 0;
    filter: brightness(1);
  }
}
`;

export default AppLoadingScreen;
