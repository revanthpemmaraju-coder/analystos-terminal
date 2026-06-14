"use client";

import React, { useState, useEffect } from "react";

interface CinematicIntroProps {
  onFadeInLanding: () => void;
  onComplete: () => void;
}

const STATUSES = [
  "LOADING MARKET DATA",
  "FETCHING FINANCIALS",
  "CALIBRATING AI ENGINE",
  "BUILDING RESEARCH LAYER",
  "TERMINAL READY"
];

const TICKERS = [
  "NIFTY50 ▲ 0.38% │ RELIANCE ▲ 2.41% │ TCS ▼ 0.82% │ INFY ▲ 1.15%",
  "P/E SCAN RUNNING │ MOMENTUM SIGNALS ACTIVE │ SECTOR WEIGHTS LOADED",
  "DCF MODEL CALIBRATED │ VALUATION LAYER READY │ AI INSIGHTS ON",
  "INSTITUTIONAL DATA SYNCED │ RESEARCH ENGINE ONLINE │ ALL SYSTEMS GO"
];

export default function CinematicIntro({ onFadeInLanding, onComplete }: CinematicIntroProps) {
  const [statusIndex, setStatusIndex] = useState(-1);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 1. Ticker cycles every 900ms starting immediately
    const tickerInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKERS.length);
    }, 900);

    // 2. Status labels begin cycling at 1.6s, updates every 700ms
    const statusStartTimeout = setTimeout(() => {
      setStatusIndex(0);
      const statusInterval = setInterval(() => {
        setStatusIndex((prev) => {
          if (prev < STATUSES.length - 1) {
            return prev + 1;
          }
          clearInterval(statusInterval);
          return prev;
        });
      }, 700);
    }, 1600);

    // 3. Intro begins fading out at 4.2s
    const fadeOutTimeout = setTimeout(() => {
      setFadeOut(true);
    }, 4200);

    // 4. Landing page begins fading in at 4.4s (0.2s after fade out starts)
    const landingFadeTimeout = setTimeout(() => {
      onFadeInLanding();
    }, 4400);

    // 5. Intro removed completely at 5.2s (1s after fade out starts)
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 5200);

    return () => {
      clearInterval(tickerInterval);
      clearTimeout(statusStartTimeout);
      clearTimeout(fadeOutTimeout);
      clearTimeout(landingFadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onFadeInLanding, onComplete]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .intro-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #000000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Courier New', monospace;
          overflow: hidden;
          opacity: 1;
          pointer-events: all;
        }

        .intro-overlay.intro-fade-out {
          opacity: 0;
          transition: opacity 1000ms cubic-bezier(0.4, 0, 1, 1);
        }

        .intro-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 255, 140, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 140, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        .scan-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 140, 0.6), transparent);
          animation: scan 3s linear infinite;
          pointer-events: none;
        }

        @keyframes scan {
          from { top: 0; }
          to { top: 100%; }
        }

        .corner-bracket {
          position: absolute;
          width: 40px;
          height: 40px;
          border-color: rgba(0, 255, 140, 0.5);
          border-style: solid;
          pointer-events: none;
        }

        .bracket-tl { top: 24px; left: 24px; border-width: 2px 0 0 2px; }
        .bracket-tr { top: 24px; right: 24px; border-width: 2px 2px 0 0; }
        .bracket-bl { bottom: 24px; left: 24px; border-width: 0 0 2px 2px; }
        .bracket-br { bottom: 24px; right: 24px; border-width: 0 2px 2px 0; }

        .status-top {
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          letter-spacing: 4px;
          color: rgba(0, 255, 140, 0.5);
          text-transform: uppercase;
          white-space: nowrap;
        }

        .center-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .wordmark {
          font-size: 48px;
          font-weight: 700;
          color: #00FF8C;
          letter-spacing: 12px;
          text-transform: uppercase;
          opacity: 0;
          animation: wordmark-reveal 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 400ms;
          text-align: center;
        }

        @keyframes wordmark-reveal {
          from {
            opacity: 0;
            letter-spacing: 24px;
          }
          to {
            opacity: 1;
            letter-spacing: 12px;
          }
        }

        .tagline {
          font-size: 11px;
          letter-spacing: 5px;
          color: rgba(255, 255, 255, 0.35);
          margin-top: 12px;
          opacity: 0;
          animation: tagline-reveal 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 1100ms;
          text-align: center;
          white-space: nowrap;
        }

        @keyframes tagline-reveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .progress-container {
          width: 280px;
          height: 2px;
          background: rgba(255, 255, 255, 0.08);
          margin-top: 32px;
          position: relative;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          width: 0%;
          background: #00FF8C;
          animation: fill-bar 2200ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 1600ms;
        }

        @keyframes fill-bar {
          from { width: 0%; }
          to { width: 100%; }
        }

        .status-label {
          font-size: 9px;
          letter-spacing: 3px;
          color: rgba(0, 255, 140, 0.45);
          margin-top: 16px;
          height: 12px;
          text-align: center;
          text-transform: uppercase;
        }

        .ticker-container {
          position: absolute;
          bottom: 48px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          letter-spacing: 2px;
          color: rgba(0, 255, 140, 0.25);
          white-space: nowrap;
          text-align: center;
          width: 100%;
          padding: 0 24px;
          box-sizing: border-box;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}} />

      <div className={`intro-overlay ${fadeOut ? "intro-fade-out" : ""}`}>
        <div className="intro-grid" />
        <div className="scan-line" />
        
        {/* Corner Reticle Brackets */}
        <div className="corner-bracket bracket-tl" />
        <div className="corner-bracket bracket-tr" />
        <div className="corner-bracket bracket-bl" />
        <div className="corner-bracket bracket-br" />

        {/* Top Status */}
        <div className="status-top">SYSTEM INITIALIZING . . .</div>

        {/* Central Core Content */}
        <div className="center-content">
          <div className="wordmark">ANALYSTOS</div>
          <div className="tagline">AI Equity Research Terminal</div>
          <div className="progress-container">
            <div className="progress-bar-fill" />
          </div>
          <div className="status-label">
            {statusIndex >= 0 ? STATUSES[statusIndex] : ""}
          </div>
        </div>

        {/* Bottom Data Stream Ticker */}
        <div className="ticker-container">
          {TICKERS[tickerIndex]}
        </div>
      </div>
    </>
  );
}
