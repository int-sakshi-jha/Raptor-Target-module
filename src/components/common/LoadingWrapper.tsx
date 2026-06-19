import React from "react";
import Logo from "./Logo";

interface LoadingWrapperProps {
  appName?: string;
  ariaLabel?: string;
  role?: React.AriaRole;
  ariaLive?: "off" | "assertive" | "polite";
  outerClassName?: string;
  cardClassName?: string;
  logoClassName?: string;
  loaderSize?: "default" | "compact";
  cardBackdropClassName?: string;
  borderClassName?: string;
  showLoader?: boolean;
  showLiveBadge?: boolean;
  showShimmer?: boolean;
  glassOverlayStyle?: React.CSSProperties;
  backgroundExtras?: React.ReactNode;
  overlayContent?: React.ReactNode;
  children: React.ReactNode;
}

export const STATUS_SCREEN_KEYFRAMES = `
  @keyframes ls-cardReveal {
    from { opacity: 0; transform: translateY(28px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }
  @keyframes ls-orbDrift {
    0%,100% { transform: translate(0,0)       scale(1);    }
    25%     { transform: translate(22px,-28px) scale(1.06); }
    50%     { transform: translate(-16px,20px) scale(0.94); }
    75%     { transform: translate(18px,28px)  scale(1.04); }
  }
  @keyframes ls-gridScroll {
    from { background-position: 0 0; }
    to   { background-position: 52px 52px; }
  }
  @keyframes ls-borderPulse {
    0%,100% { opacity: 0.35; }
    50%     { opacity: 0.90; }
  }
      @keyframes ls-borderPulse {
    0%,100% { opacity: 0.35; }
    50%     { opacity: 0.90; }
  }

  @keyframes ls-shimmerSweep {
    0%   { background: linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.06) 50%, transparent 58%);
           background-size: 200% 100%; background-position: 200% 0; }
    45%  { background-position: -200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes ls-logoFloat {
    0%,100% { transform: translateY(0);   }
    50%     { transform: translateY(-7px); }
  }
  @keyframes ls-haloBreath {
    0%,100% { transform: scale(1);    opacity: 0.55; }
    50%     { transform: scale(1.22); opacity: 1;    }
  }
  @keyframes ls-badgePing {
    0%,100% { transform: scale(1);    opacity: 1;    }
    50%     { transform: scale(1.55); opacity: 0.50; }
  }
  @keyframes ls-spinCW  { to { transform: rotate(360deg);  } }
  @keyframes ls-spinCCW { to { transform: rotate(-360deg); } }
  @keyframes ls-sunPulse {
    0%,100% { transform: translate(-50%,-50%) scale(1);    }
    50%     { transform: translate(-50%,-50%) scale(1.15); }
  }
`;

const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  appName = "Raptor",
  ariaLabel,
  role,
  ariaLive,
  outerClassName = "",
  cardClassName = "",
  logoClassName = "w-52 h-auto",
  loaderSize = "default",
  cardBackdropClassName = "backdrop-blur-[2px]",
  showLoader = true,
  showLiveBadge = true,
  showShimmer = true,
  glassOverlayStyle = {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.01) 100%)",
  },
  borderClassName = "border border-brand-500/45 dark:border-brand-500/38 [animation:ls-borderPulse_3s_ease-in-out_infinite]",
  backgroundExtras,
  overlayContent,
  children,
}) => {
  const loaderClassName =
    loaderSize === "compact"
      ? "w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] mb-8 sm:mb-9 mx-auto"
      : "w-[130px] h-[130px] mb-9";

  return (
    <div
      className={`
        min-h-dvh w-full flex items-center justify-center px-4 py-12 relative overflow-hidden
        bg-stone-100 dark:bg-[#0d0d14]
        transition-colors duration-500
        ${outerClassName}
      `}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {backgroundExtras}

        <div
          className="
            absolute inset-0
            opacity-[0.18] dark:opacity-[0.22]
            [animation:ls-gridScroll_18s_linear_infinite]
          "
          style={{
            backgroundImage:
              "linear-gradient(rgba(233,113,36,1) 1px, transparent 1px), linear-gradient(90deg, rgba(233,113,36,1) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
            maskImage:
              "radial-gradient(ellipse 90% 85% at 50% 50%, black 10%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 90% 85% at 50% 50%, black 10%, transparent 100%)",
          }}
        />

        <div
          className="
            absolute -top-36 -left-24 w-[520px] h-[520px] rounded-full
            blur-[80px] pointer-events-none
            [animation:ls-orbDrift_22s_ease-in-out_infinite]
          "
          style={{
            background:
              "radial-gradient(circle, rgba(233,113,36,0.22) 0%, transparent 70%)",
          }}
        />

        <div
          className="
            absolute -bottom-28 -right-20 w-[420px] h-[420px] rounded-full
            blur-[80px] pointer-events-none
            [animation:ls-orbDrift_28s_ease-in-out_infinite_-11s]
          "
          style={{
            background:
              "radial-gradient(circle, rgba(255,179,71,0.18) 0%, transparent 70%)",
          }}
        />

        <div
          className="
            absolute top-[42%] right-[14%] w-[320px] h-[320px] rounded-full
            blur-[70px] pointer-events-none
            [animation:ls-orbDrift_19s_ease-in-out_infinite_-6s]
          "
          style={{
            background:
              "radial-gradient(circle, rgba(23,74,191,0.11) 0%, transparent 70%)",
          }}
        />

        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(255,248,240,0.60) 0%, transparent 80%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.10) 100%)",
          }}
        />
      </div>

      {overlayContent}

      <div
        className={`
          relative z-10 w-auto max-w-lg
          flex flex-col items-center
          px-8 pt-[52px] pb-12 overflow-visible
          rounded-xs ${cardBackdropClassName}
          border border-white/60 dark:border-neutral-dark-200
          bg-white/20 dark:bg-white/[0.05] shadow-lg
          dark:shadow-[0_20px_50px_rgba(0,0,0,0.75)]
          transition-[background,border-color,box-shadow] duration-500
          [animation:ls-cardReveal_0.9s_cubic-bezier(0.16,1,0.3,1)_both]
          ${cardClassName}
        `}
        role={role}
        aria-live={ariaLive}
        aria-label={ariaLabel}
      >
        <div
          className="absolute inset-0 pointer-events-none rounded-xs dark:block hidden"
          style={glassOverlayStyle}
          aria-hidden
        />

        <div
          className={`absolute -inset-px rounded-xs pointer-events-none
            ${borderClassName}
          `}
            
          aria-hidden
        />

        {showShimmer && (
          <div
            className="
              absolute inset-0 rounded-xs overflow-hidden pointer-events-none
              [animation:ls-shimmerSweep_5s_ease-in-out_infinite]
            "
            aria-hidden
          />
        )}

        <div className="relative z-10 mb-6 flex items-center justify-center [animation:ls-logoFloat_4.5s_ease-in-out_infinite]">
          <div
            className="absolute -inset-6 rounded-full blur-[18px] pointer-events-none [animation:ls-haloBreath_3.5s_ease-in-out_infinite]"
            style={{
              background:
                "radial-gradient(circle, rgba(233,113,36,0.24) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <Logo alt={appName} className={`relative z-10 ${logoClassName}`} />
          {showLiveBadge && (
            <div
              className="
                absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full
                bg-brand-500
                shadow-[0_0_14px_rgba(233,113,36,1)]
                [animation:ls-badgePing_1.8s_ease-in-out_infinite]
              "
              aria-hidden
            />
          )}
        </div>

        {showLoader && (
          <div
            className={`relative z-10 ${loaderClassName} flex-shrink-0`}
            aria-hidden
          >
            <svg
              viewBox="0 0 120 120"
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="shared-g1"
                  x1="0"
                  y1="0"
                  x2="120"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#E97124" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#E97124" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient
                  id="shared-g2"
                  x1="120"
                  y1="0"
                  x2="0"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#ffb347" stopOpacity="0.90" />
                  <stop offset="100%" stopColor="#ffb347" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient
                  id="shared-g3"
                  x1="60"
                  y1="0"
                  x2="60"
                  y2="120"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity="0.65"
                  />
                  <stop offset="100%" stopColor="#E97124" stopOpacity="0.60" />
                </linearGradient>
              </defs>

              <circle
                cx="60"
                cy="60"
                r="54"
                className="stroke-black/[0.07] dark:stroke-white/[0.06]"
                strokeWidth="1.5"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="40"
                className="stroke-black/[0.07] dark:stroke-white/[0.06]"
                strokeWidth="1.5"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="26"
                className="stroke-black/[0.07] dark:stroke-white/[0.06]"
                strokeWidth="1.5"
                fill="none"
              />

              <g
                style={{
                  animation: "ls-spinCW 2.8s linear infinite",
                  transformOrigin: "60px 60px",
                }}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  stroke="url(#shared-g1)"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="270 68"
                />
              </g>
              <g
                style={{
                  animation: "ls-spinCCW 2.0s linear infinite",
                  transformOrigin: "60px 60px",
                }}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="40"
                  stroke="url(#shared-g2)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="175 77"
                />
              </g>
              <g
                style={{
                  animation: "ls-spinCW 1.4s linear infinite",
                  transformOrigin: "60px 60px",
                }}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="26"
                  stroke="url(#shared-g3)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="95 68"
                />
              </g>

              <circle cx="60" cy="6" r="2.5" fill="rgba(233,113,36,0.85)" />
              <circle cx="114" cy="60" r="2.5" fill="rgba(233,113,36,0.55)" />
              <circle cx="60" cy="114" r="2.5" fill="rgba(233,113,36,0.30)" />
              <circle cx="6" cy="60" r="2.5" fill="rgba(233,113,36,0.55)" />
            </svg>

            <div
              className="
                absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-[26px] h-[26px] rounded-full
                shadow-[0_0_12px_rgba(233,113,36,1),0_0_30px_rgba(233,113,36,0.70),0_0_60px_rgba(233,113,36,0.40)]
                dark:shadow-[0_0_12px_rgba(233,113,36,1),0_0_30px_rgba(233,113,36,0.70),0_0_60px_rgba(233,113,36,0.40)]
                [animation:ls-sunPulse_2s_ease-in-out_infinite]
              "
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, #ffe0a0, #E97124)",
              }}
            />
          </div>
        )}

        {children}
      </div>

      <style>{STATUS_SCREEN_KEYFRAMES}</style>
    </div>
  );
};

export default LoadingWrapper;