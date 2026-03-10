"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type PointerOffset = {
  x: number
  y: number
}

const INITIAL_OFFSET: PointerOffset = { x: 0, y: 0 }

export default function Premium404Page() {
  const [visible, setVisible] = useState(false)
  const [offset, setOffset] = useState<PointerOffset>(INITIAL_OFFSET)

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 180)

    const handleMouseMove = (event: MouseEvent) => {
      const x = (window.innerWidth / 2 - event.clientX) / 40
      const y = (window.innerHeight / 2 - event.clientY) / 40
      setOffset({ x, y })
    }

    const handleMouseLeave = () => setOffset(INITIAL_OFFSET)

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return (
    <main className="error404-root" aria-labelledby="error404-title">
      <div className="error404-stage">
        <section className={`error404-container ${visible ? "show" : ""}`}>
          <h1 id="error404-title">Oooops! We have a problem.</h1>
          <h2>Error 404</h2>
          <h3>Access denied</h3>
          <p>
            The email joined does not have permission for access to the shift management system.
            <br />
            Please, go back.
          </p>
          <Link href="/" className="error404-button">
            Go back
          </Link>
        </section>

        <aside
          className="error404-scene"
          aria-hidden="true"
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotateY(${offset.x * 0.34}deg) rotateX(${-offset.y * 0.34}deg)`,
          }}
        >
          <div className="error404-glow" />

          <svg className="error404-clipper" viewBox="0 0 320 460" role="presentation">
            <defs>
              <linearGradient id="clipperBody" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="42%" stopColor="#F1F2F5" />
                <stop offset="100%" stopColor="#D9DCE3" />
              </linearGradient>
              <linearGradient id="clipperEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F7F8FB" />
                <stop offset="100%" stopColor="#C9CDD7" />
              </linearGradient>
              <linearGradient id="clipperGlass" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0D111A" />
                <stop offset="100%" stopColor="#1A1F2C" />
              </linearGradient>
              <linearGradient id="clipperAccent" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2563EB" />
              </linearGradient>
            </defs>

            <g opacity="0.88">
              {Array.from({ length: 18 }).map((_, index) => (
                <rect
                  key={`blade-${index}`}
                  x={78 + index * 9}
                  y={18}
                  width="6"
                  height="18"
                  rx="2"
                  fill="#1B1E25"
                />
              ))}
            </g>

            <rect x="74" y="34" width="172" height="24" rx="8" fill="#141720" />
            <rect x="82" y="50" width="156" height="378" rx="74" fill="url(#clipperBody)" />
            <rect x="84" y="52" width="152" height="374" rx="72" fill="url(#clipperEdge)" opacity="0.45" />

            <path
              d="M112 96 C116 76 132 62 160 62 C188 62 204 76 208 96 L213 248 C216 286 190 318 160 318 C130 318 104 286 107 248 Z"
              fill="url(#clipperGlass)"
            />
            <path
              d="M121 108 C126 92 139 84 160 84 C181 84 194 92 199 108 L203 242 C205 270 184 293 160 293 C136 293 115 270 117 242 Z"
              fill="#0B0F18"
              opacity="0.62"
            />

            <path d="M130 176 H190 M130 194 H190 M130 212 H190" stroke="#FF0E70" strokeWidth="6" strokeLinecap="round" opacity="0.72" />

            <rect x="94" y="150" width="6" height="154" rx="3" fill="#2CC46A" opacity="0.75" />
            <rect x="220" y="150" width="6" height="154" rx="3" fill="#7DE89F" opacity="0.68" />

            <rect x="58" y="118" width="26" height="78" rx="9" fill="#DCE0E9" />
            <rect x="64" y="126" width="12" height="62" rx="5" fill="#BFC6D4" />

            <circle cx="160" cy="332" r="18" fill="#E7EAF0" />
            <circle cx="160" cy="332" r="9" fill="#CDD2DC" />
            <rect x="146" y="356" width="28" height="26" rx="6" fill="#11151E" />
            <text x="160" y="374" textAnchor="middle" fill="#EDF1F8" fontSize="16" fontWeight="700">
              B
            </text>

            <ellipse cx="160" cy="426" rx="76" ry="20" fill="#0A0C12" opacity="0.28" />
          </svg>

          <svg className="error404-astronaut" viewBox="0 0 240 220" role="presentation">
            <defs>
              <linearGradient id="helmetGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2E3442" />
                <stop offset="100%" stopColor="#0F141E" />
              </linearGradient>
              <linearGradient id="helmetReflection" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
            </defs>

            <circle cx="106" cy="64" r="44" fill="#F4F7FF" stroke="#2B313E" strokeWidth="6" />
            <circle cx="106" cy="64" r="33" fill="url(#helmetGlass)" />
            <ellipse cx="94" cy="52" rx="12" ry="20" fill="url(#helmetReflection)" />

            <rect x="70" y="98" width="78" height="64" rx="22" fill="#F6F8FC" stroke="#2B313E" strokeWidth="4" />

            <rect x="144" y="118" width="42" height="20" rx="6" fill="#DDE2EB" stroke="#2B313E" strokeWidth="4" />
            <rect x="180" y="106" width="18" height="46" rx="5" fill="#CDD4DF" stroke="#2B313E" strokeWidth="4" />

            <rect x="64" y="152" width="34" height="18" rx="8" fill="#F6F8FC" stroke="#2B313E" strokeWidth="4" />
            <rect x="92" y="158" width="24" height="16" rx="7" fill="#F6F8FC" stroke="#2B313E" strokeWidth="4" />

            <rect x="132" y="146" width="54" height="30" rx="6" fill="#C9CED8" stroke="#2B313E" strokeWidth="4" />
            <line x1="136" y1="161" x2="181" y2="161" stroke="#8C94A3" strokeWidth="3" />
            <rect x="154" y="176" width="12" height="14" rx="4" fill="#A8B1BF" />
          </svg>
        </aside>
      </div>

      <footer className="error404-footer">© 2026 ViaggioStyle — Private System</footer>

      <style jsx>{`
        .error404-root {
          --bg: #f4f4f4;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --accent: #2563eb;
          --accent-light: #60a5fa;

          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: var(--bg);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 42px 42px 82px;
          isolation: isolate;
          font-family:
            -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
        }

        :global(.dark) .error404-root {
          --bg: #1c1c1c;
          --text-primary: #f2f2f2;
          --text-secondary: #a1a1aa;
        }

        .error404-stage {
          position: relative;
          width: min(1160px, 100%);
          min-height: 560px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin: 0 auto;
        }

        .error404-container {
          position: relative;
          z-index: 3;
          width: min(100%, 620px);
          margin-left: clamp(0px, 2vw, 18px);
          text-align: left;
          opacity: 0;
          transform: translateY(28px) scale(0.98);
          filter: blur(10px);
          transition: all 1000ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .error404-container.show {
          opacity: 1;
          transform: translateY(0) scale(1);
          filter: blur(0);
        }

        h1 {
          margin: 0 0 10px 0;
          font-size: clamp(30px, 4.2vw, 36px);
          line-height: 1.15;
          letter-spacing: -0.02em;
          font-weight: 700;
        }

        h2 {
          margin: 0;
          font-size: clamp(68px, 10vw, 86px);
          line-height: 0.95;
          font-weight: 800;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, var(--accent), var(--accent-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        h3 {
          margin: 14px 0 20px 0;
          font-size: clamp(22px, 3vw, 26px);
          font-weight: 650;
          letter-spacing: -0.01em;
        }

        p {
          margin: 0 0 28px 0;
          font-size: 16px;
          line-height: 1.62;
          color: var(--text-secondary);
          max-width: 560px;
        }

        .error404-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 28px;
          border-radius: 14px;
          text-decoration: none;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.01em;
          background: var(--accent);
          color: #ffffff;
          transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid transparent;
        }

        .error404-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 34px rgba(37, 99, 235, 0.32);
        }

        :global(.dark) .error404-button {
          background: rgba(37, 99, 235, 0.16);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(37, 99, 235, 0.45);
        }

        .error404-scene {
          position: absolute;
          right: 0;
          bottom: -2px;
          width: 520px;
          height: 520px;
          pointer-events: none;
          transition: transform 240ms ease-out;
          transform-style: preserve-3d;
          perspective: 1200px;
          z-index: 2;
        }

        .error404-glow {
          position: absolute;
          right: 56px;
          bottom: 0;
          width: 360px;
          height: 190px;
          border-radius: 50%;
          background: radial-gradient(
            circle at center,
            rgba(37, 99, 235, 0.34) 0%,
            rgba(37, 99, 235, 0.08) 56%,
            transparent 100%
          );
          filter: blur(18px);
        }

        .error404-clipper {
          position: absolute;
          right: 72px;
          bottom: 20px;
          width: 280px;
          animation: float 6s ease-in-out infinite;
          filter: drop-shadow(0 20px 42px rgba(37, 99, 235, 0.24));
          transform: translateZ(22px);
        }

        .error404-astronaut {
          position: absolute;
          right: 160px;
          bottom: 256px;
          width: 140px;
          animation: float 6s ease-in-out infinite;
          animation-delay: -1.25s;
          filter: drop-shadow(0 14px 24px rgba(37, 99, 235, 0.2));
          transform: translateZ(58px);
        }

        .error404-footer {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 20px;
          font-size: 13px;
          color: var(--text-secondary);
          text-align: center;
          z-index: 3;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @media (max-width: 900px) {
          .error404-root {
            justify-content: center;
            padding: 28px 24px 72px;
          }

          .error404-stage {
            min-height: auto;
            justify-content: center;
          }

          .error404-scene {
            display: none;
          }

          .error404-container {
            margin-left: 0;
            width: min(100%, 620px);
          }

          .error404-footer {
            left: 50%;
            right: auto;
            transform: translateX(-50%);
            bottom: 16px;
          }
        }
      `}</style>
    </main>
  )
}
