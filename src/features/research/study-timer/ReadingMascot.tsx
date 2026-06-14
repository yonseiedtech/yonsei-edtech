"use client";

/**
 * ReadingMascot — 논문 읽기 타이머 마스코트 (사이클 120)
 * 읽기 세션(type:"reading") 활성 시 타이머에 등장하는 책 읽는 부엉이.
 * 눈 깜빡임·미세 부유 애니메이션으로 "지금 읽는 중"을 살아있게 표현한다.
 * 외부 의존 0 (순수 SVG + CSS). prefers-reduced-motion 존중.
 */

interface Props {
  /** 일시정지 시 졸린 표정 + 애니메이션 정지 */
  isPaused?: boolean;
  /** 완독 직후 축하 표정 (눈 ^^) */
  celebrate?: boolean;
  size?: number;
  className?: string;
}

export default function ReadingMascot({
  isPaused = false,
  celebrate = false,
  size = 36,
  className,
}: Props) {
  const state = celebrate ? "celebrate" : isPaused ? "paused" : "reading";
  return (
    <span
      className={`omc-mascot ${state} ${className ?? ""}`}
      style={{ width: size, height: size, display: "inline-block", lineHeight: 0 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} className="omc-mascot-svg">
        {/* 귀깃 */}
        <path d="M12 12 L15 4 L20 11 Z" fill="currentColor" opacity="0.85" />
        <path d="M36 12 L33 4 L28 11 Z" fill="currentColor" opacity="0.85" />
        {/* 몸통 */}
        <ellipse cx="24" cy="25" rx="15" ry="16" fill="currentColor" />
        {/* 배 (밝은 톤) */}
        <ellipse cx="24" cy="29" rx="9" ry="11" fill="#fff" opacity="0.28" />
        {/* 눈 흰자 */}
        <g className="omc-mascot-eyes">
          <circle cx="18" cy="21" r="6" fill="#fff" />
          <circle cx="30" cy="21" r="6" fill="#fff" />
          {/* 동공 */}
          <circle className="omc-pupil" cx="18.5" cy="21.5" r="2.6" fill="#1f2937" />
          <circle className="omc-pupil" cx="29.5" cy="21.5" r="2.6" fill="#1f2937" />
          {/* 축하 표정용 ^^ (celebrate 시 노출) */}
          <path className="omc-happy" d="M15 21 L18 18.5 L21 21" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path className="omc-happy" d="M27 21 L30 18.5 L33 21" stroke="#1f2937" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* 부리 */}
        <path d="M24 24 L21.5 27 L26.5 27 Z" fill="#f59e0b" />
        {/* 책 (펼친 페이지) */}
        <g className="omc-mascot-book">
          <path d="M11 36 L24 33 L24 43 L11 45 Z" fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
          <path d="M37 36 L24 33 L24 43 L37 45 Z" fill="#fff" stroke="#cbd5e1" strokeWidth="0.8" />
          <path d="M24 33 L24 43" stroke="#94a3b8" strokeWidth="1" />
        </g>
      </svg>

      <style jsx>{`
        .omc-mascot {
          color: inherit;
        }
        .omc-mascot-svg {
          display: block;
          animation: omc-bob 2.6s ease-in-out infinite;
        }
        .omc-mascot-eyes {
          transform-box: fill-box;
          transform-origin: center;
          animation: omc-blink 4.2s infinite;
        }
        .omc-happy {
          display: none;
        }
        @keyframes omc-bob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1.5px);
          }
        }
        @keyframes omc-blink {
          0%,
          90%,
          100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.12);
          }
        }
        /* 일시정지: 졸린 눈 + 정지 */
        .omc-mascot.paused .omc-mascot-svg {
          animation: none;
        }
        .omc-mascot.paused .omc-mascot-eyes {
          animation: none;
          transform: scaleY(0.45);
        }
        /* 완독: 책 살짝 들썩 + ^^ 표정 */
        .omc-mascot.celebrate .omc-pupil {
          display: none;
        }
        .omc-mascot.celebrate .omc-happy {
          display: block;
        }
        .omc-mascot.celebrate .omc-mascot-svg {
          animation: omc-cheer 0.7s ease-in-out;
        }
        @keyframes omc-cheer {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          30% {
            transform: translateY(-3px) rotate(-5deg);
          }
          60% {
            transform: translateY(-3px) rotate(5deg);
          }
        }
        /* 읽는 동작: 눈동자 좌우 스캔 + 책 미세 넘김 (사이클 120 폴리시) */
        .omc-mascot.reading .omc-pupil {
          transform-box: fill-box;
          transform-origin: center;
          animation: omc-read 3s ease-in-out infinite;
        }
        @keyframes omc-read {
          0%,
          100% {
            transform: translateX(-0.7px);
          }
          45%,
          55% {
            transform: translateX(0.9px);
          }
        }
        .omc-mascot.reading .omc-mascot-book {
          transform-box: fill-box;
          transform-origin: center top;
          animation: omc-page 3.6s ease-in-out infinite;
        }
        @keyframes omc-page {
          0%,
          100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.95);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .omc-mascot-svg,
          .omc-mascot-eyes,
          .omc-pupil,
          .omc-mascot-book {
            animation: none !important;
          }
        }
      `}</style>
    </span>
  );
}
