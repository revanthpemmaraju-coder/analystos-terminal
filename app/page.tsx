/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Terminal, Shield, ArrowRight, Lock, Unlock, Copy, Check, 
  ExternalLink, Search, BarChart3, LineChart, Cpu, BookOpen, 
  DollarSign, FileText, ChevronRight, RefreshCw, Send, CheckSquare,
  Sparkles, Plus, Award, TrendingUp, AlertTriangle, Command
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TickerBar from "@/components/ticker-bar";
import CinematicIntro from "@/components/cinematic-intro";
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import PricingCoin from "@/components/pricing-coin";
import confetti from "canvas-confetti";
import { useRouter } from "next/navigation";


const formatIndianCurrency = (num: number) => {
  if (num >= 10000000) {
    return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return '₹' + (num / 100000).toFixed(2) + ' Lakh';
  }
  return '₹' + num.toLocaleString('en-IN');
};

const TiltCard = ({ children, className, style }: { children: React.ReactNode; className?: string; style?: any }) => {
  const rotateX = useSpring(useMotionValue(0), { stiffness: 150, damping: 22 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 150, damping: 22 });
  const spotlightX = useMotionValue(0);
  const spotlightY = useMotionValue(0);
  const [opacity, setOpacity] = useState(0);

  const spotlightBg = useMotionTemplate`radial-gradient(350px circle at ${spotlightX}px ${spotlightY}px, rgba(167, 139, 250, 0.15), transparent 80%)`;

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    spotlightX.set(x);
    spotlightY.set(y);
    setOpacity(1);

    const mouseX = x - width / 2;
    const mouseY = y - height / 2;
    rotateX.set(-(mouseY / (height / 2)) * 6);
    rotateY.set((mouseX / (width / 2)) * 6);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    setOpacity(0);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: "1000px",
        position: "relative",
        ...style
      }}
      className={`${className} overflow-hidden`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-inherit z-10 transition-opacity duration-300"
        style={{
          opacity,
          background: spotlightBg,
        }}
      />
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </motion.div>
  );
};

const FloatingStatCard = ({ 
  label, val, sub, className, delay, duration 
}: { 
  label: string; 
  val: string; 
  sub: string; 
  className?: string; 
  delay: number;
  duration: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ 
        opacity: 1,
        y: [0, -15, 0],
        rotateX: [-2, 2, -2],
        rotateY: [2, -2, 2]
      }}
      viewport={{ once: true }}
      transition={{
        opacity: { delay: delay, duration: 0.8 },
        y: { repeat: Infinity, duration: duration, ease: "easeInOut" },
        rotateX: { repeat: Infinity, duration: duration, ease: "easeInOut" },
        rotateY: { repeat: Infinity, duration: duration, ease: "easeInOut" }
      }}
      style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      className={`w-[160px] bg-white/[0.03] border border-white/[0.08] rounded-2xl flex flex-col justify-between p-4 backdrop-blur-[4px] text-left hover:border-[#a78bfa]/35 hover:bg-white/[0.06] transition-all select-none ${className}`}
    >
      <span className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-sans">{label}</span>
      <span className="text-[22px] font-bold text-white font-display mt-1 leading-none">{val}</span>
      <span className="text-[10px] text-[#a78bfa] font-sans font-normal mt-2">{sub}</span>
    </motion.div>
  );
};

const MagneticButton = ({ 
  children, 
  className, 
  onClick, 
  href, 
  type = "button", 
  disabled = false 
}: { 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void; 
  href?: string; 
  type?: "button" | "submit" | "reset"; 
  disabled?: boolean; 
}) => {
  const x = useSpring(useMotionValue(0), { stiffness: 120, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 120, damping: 15 });

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX * 0.35);
    y.set(mouseY * 0.35);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  if (href) {
    return (
      <motion.a
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x, y }}
        className={className}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.button>
  );
};

const AnimatedTerminalPreview = () => {
  const [lines, setLines] = useState<string[]>([]);
  
  useEffect(() => {
    const scripts = [
      ">> ANALYST.OS SYSTEMS CONNECTING SECURE CLIENT NODE...",
      ">> CONNECTED DIRECTLY TO NSE MULTICAST INDEX SOCKETS",
      ">> NSE_NODE LIVE STREAM CHANNEL ONLINE [12ms LATENCY]",
      ">> CORE_VALUATION_ENGINE INITIALIZED IN WEBASSEMBLY",
      ">> SYS_COMPILE: Scanning active Reliance assumptions...",
      "   - EBITDA: ₹1,20,000 Lakhs | exit Multiple: 14.0x",
      "   - Discount rate (WACC): 9.0% | Cash flow CAGR: 15.0%",
      ">> COMPILING SENSITIVITY GRADIENT MODELS AT 60 FPS",
      ">> INTRINSIC PROJECTION: Fair market share price: ₹2,580.40",
      ">> TASK_STATUS: COMPLETED [SECURE VAULT ACCESS GRANTED]",
      "----------------------------------------------------------"
    ];

    let currentIdx = 0;
    setLines(scripts.slice(0, 3));
    currentIdx = 3;

    const interval = setInterval(() => {
      setLines(prev => {
        if (currentIdx < scripts.length) {
          const nextLines = [...prev, scripts[currentIdx]];
          currentIdx++;
          return nextLines;
        } else {
          currentIdx = 0;
          return [];
        }
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#05070a]/90 border border-white/10 rounded-xl p-5 font-mono text-[10px] text-slate-400 text-left h-[180px] overflow-y-auto select-none space-y-1.5 scrollbar-thin shadow-2xl relative">
      <div className="flex items-center space-x-1.5 border-b border-white/5 pb-2 mb-3 text-[9px] text-slate-500 uppercase">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff3860] animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffdd57]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
        <span className="font-bold ml-2">SYSTEMS_MONITOR_COMPILER</span>
      </div>
      {lines.map((ln, i) => (
        <div key={i} className={ln.startsWith(">>") ? "text-[#a78bfa]" : "text-slate-350"}>
          {ln}
        </div>
      ))}
      <span className="blinking-cursor" />
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const introSeen = sessionStorage.getItem("introSeen") === "true";
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!introSeen && !prefersReducedMotion) {
        setShowIntro(true);
        sessionStorage.setItem("introSeen", "true");
      } else {
        document.documentElement.classList.remove("intro-playing");
      }
    }
  }, []);

  const handleFadeInLanding = () => {
    document.documentElement.classList.remove("intro-playing");
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // Navigation countdown target date (June 14, 2026)
  const [countdown, setCountdown] = useState("");
  const LAUNCH_DATE = new Date("2026-06-14T09:00:00+05:30");

  // Cmd+K Command Palette states
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  // Onboarding Tour Guide states
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(1);
  const [showTourInvite, setShowTourInvite] = useState(false);

  // Mobile viewport detection
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => {
        setIsMobileDevice(window.innerWidth < 768);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Show a welcome tour invite card on first load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tourCompleted = localStorage.getItem("aos_landing_tour_completed") === "true";
      if (!tourCompleted) {
        const timer = setTimeout(() => {
          setShowTourInvite(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Sync Tour Step 4 with opening Command Palette
  useEffect(() => {
    if (tourActive && tourStep === 4) {
      setCommandPaletteOpen(true);
    }
  }, [tourActive, tourStep]);

  useEffect(() => {
    const updateCountdown = () => {
      const diff = LAUNCH_DATE.getTime() - new Date().getTime();
      if (diff <= 0) {
        setCountdown("LIVE ACCESS ACTIVE 🟢");
      } else {
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setCountdown(`${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Three.js Ref
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  // Custom 2D Grid Page Navigation
  const [activeSection, setActiveSection] = useState(0);
  const globeDragRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    targetRotX: 0,
    targetRotY: 0,
    spinX: 0,      // current momentum speed X
    spinY: 0.003   // current momentum speed Y (starts as auto-rotate)
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [infoHubActive, setInfoHubActive] = useState(false);
  const [pricingTableOpen, setPricingTableOpen] = useState(false);

  const sectionCoordinates = [
    { x: 0,   y: 0 },   // 01. HERO (x: 0, y: 0)
    { x: 100, y: 0 },   // 02. GLOBAL INTELLIGENCE (x: 100, y: 0)
    { x: 200, y: 0 },   // 03. FEATURES (x: 200, y: 0)
    { x: 200, y: 100 }, // 04. METRICS (x: 200, y: 100)
    { x: 100, y: 100 }, // 05. PRICING (x: 100, y: 100)
    { x: 100, y: 200 }, // 06. ROADMAP (x: 100, y: 200)
    { x: 0,   y: 200 }, // 07. SECURE VAULT (x: 0, y: 200)
  ];

  const scrollLeft = typeof window !== "undefined" ? activeSection * window.innerWidth : 0;
  const scrollProgress = activeSection / 6;

  const scrollToSection = (idx: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setActiveSection(idx);
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  // Track activeSection in a Ref for Three.js rendering
  const activeSectionRef = useRef(0);
  useEffect(() => {
    activeSectionRef.current = activeSection;
  }, [activeSection]);

  // Touch swipe states
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (pricingTableOpen || infoHubActive) return;
      e.preventDefault();
      if (isTransitioning) return;

      const threshold = 35;
      if (Math.abs(e.deltaY) < threshold && Math.abs(e.deltaX) < threshold) return;

      setIsTransitioning(true);
      if (e.deltaY > 0 || e.deltaX > 0) {
        setActiveSection(prev => Math.min(6, prev + 1));
      } else if (e.deltaY < 0 || e.deltaX < 0) {
        setActiveSection(prev => Math.max(0, prev - 1));
      }

      setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Listen for Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        return;
      }

      if (commandPaletteOpen) return;
      if (pricingTableOpen || infoHubActive) return;
      if (["ArrowDown", "ArrowRight", "Space"].includes(e.key)) {
        e.preventDefault();
        scrollToSection(Math.min(6, activeSection + 1));
      } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
        e.preventDefault();
        scrollToSection(Math.max(0, activeSection - 1));
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (pricingTableOpen || infoHubActive) return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (pricingTableOpen || infoHubActive || !touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = touchStartRef.current.x - t.clientX;
      const dy = touchStartRef.current.y - t.clientY;
      const swipeThreshold = 50;

      if (Math.abs(dx) > swipeThreshold || Math.abs(dy) > swipeThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) {
            scrollToSection(Math.min(6, activeSection + 1));
          } else {
            scrollToSection(Math.max(0, activeSection - 1));
          }
        } else {
          if (dy > 0) {
            scrollToSection(Math.min(6, activeSection + 1));
          } else {
            scrollToSection(Math.max(0, activeSection - 1));
          }
        }
      }
      touchStartRef.current = null;
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isTransitioning, activeSection, pricingTableOpen, infoHubActive, commandPaletteOpen]);

  // Three.js interactive background setup
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020010);
    scene.fog = new THREE.Fog(0x020010, 1, 1200);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 600);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: window.devicePixelRatio <= 1, 
      alpha: true,
      powerPreference: "high-performance",
      precision: "mediump"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x020010, 1);
    container.appendChild(renderer.domElement);

    const particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // Lights
    const pLight1 = new THREE.PointLight(0xa78bfa, 4.0, 2000);
    pLight1.position.set(300, 150, 200);
    scene.add(pLight1);

    const pLight2 = new THREE.PointLight(0x60a5fa, 3.0, 2000);
    pLight2.position.set(-300, -150, 100);
    scene.add(pLight2);

    const pLight3 = new THREE.PointLight(0x34d399, 2.5, 2000);
    pLight3.position.set(0, 300, -200);
    scene.add(pLight3);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    // 120 Sphere Particles distributed in 900x700x500 space
    const colors = [0xa78bfa, 0x60a5fa, 0x34d399];
    const sphereGeometry = new THREE.SphereGeometry(1.5, 12, 12);
    const particles: Array<{
      mesh: THREE.Mesh;
      baseY: number;
      amplitude: number;
      duration: number;
      timeOffset: number;
    }> = [];

    for (let i = 0; i < 120; i++) {
      const colorHex = colors[i % 3];
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0,
        metalness: 0.3,
        emissive: colorHex,
        emissiveIntensity: 0.3
      });

      const sphereMesh = new THREE.Mesh(sphereGeometry, mat);
      const posX = (Math.random() - 0.5) * 900;
      const posY = (Math.random() - 0.5) * 700;
      const posZ = (Math.random() - 0.5) * 500;
      sphereMesh.position.set(posX, posY, posZ);
      particleGroup.add(sphereMesh);

      const amplitude = Math.random() * (24 - 8) + 8;
      const duration = Math.random() * (22 - 6) + 6;
      const timeOffset = Math.random() * 100;

      particles.push({
        mesh: sphereMesh,
        baseY: posY,
        amplitude,
        duration,
        timeOffset
      });
    }

    // Grid Plane Y = -280, 2000x2000
    const gridGeometry = new THREE.PlaneGeometry(2000, 2000, 40, 40);
    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -280;
    scene.add(gridMesh);

    // Restored 3D Wireframe Globe centerpiece scaled up by 100
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeRadius = 160;
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const globeWireMesh = new THREE.Mesh(sphereGeo, wireMat);
    globeGroup.add(globeWireMesh);

    const dotsCount = 400;
    const dotGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(dotsCount * 3);
    for (let i = 0; i < dotsCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      positions[i * 3] = globeRadius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = globeRadius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = globeRadius * Math.cos(phi);
    }
    dotGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.5,
      transparent: true,
      opacity: 0.35
    });
    const globeDots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(globeDots);

    // routes
    const connectionHubs = [
      { from: [1.2, 0.8, 0.7], to: [-0.8, -0.6, -1.1] },
      { from: [-1.4, 0.4, 0.6], to: [0.5, -1.2, 0.9] },
      { from: [0.2, 1.5, -0.4], to: [-0.9, -0.8, 1.1] },
      { from: [1.3, -0.9, -0.3], to: [-1.2, 0.9, -0.4] },
      { from: [-0.5, 1.4, 0.5], to: [1.1, -1.0, -0.7] }
    ];

    connectionHubs.forEach(hub => {
      const p1 = new THREE.Vector3(hub.from[0], hub.from[1], hub.from[2]).normalize().multiplyScalar(globeRadius);
      const p2 = new THREE.Vector3(hub.to[0], hub.to[1], hub.to[2]).normalize().multiplyScalar(globeRadius);
      const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.7);
      midPoint.add(new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      ));
      const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
      const points = curve.getPoints(20);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
      const curveMat = new THREE.LineBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.15
      });
      const routeLine = new THREE.Line(curveGeo, curveMat);
      globeGroup.add(routeLine);
    });

    // Green particles INSIDE the globe (rotate with drag)
    const greenParticleCount = 500;
    const greenGeo = new THREE.BufferGeometry();
    const greenPositions = new Float32Array(greenParticleCount * 3);
    const greenSpeeds: { freq: number; phase: number; nx: number; ny: number; nz: number; baseR: number }[] = [];
    for (let i = 0; i < greenParticleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = globeRadius * (0.4 + Math.random() * 0.6);
      
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.sin(phi) * Math.sin(theta);
      const nz = Math.cos(phi);
      
      greenPositions[i * 3] = r * nx;
      greenPositions[i * 3 + 1] = r * ny;
      greenPositions[i * 3 + 2] = r * nz;
      
      greenSpeeds.push({ 
        freq: Math.random() * 2 + 0.5, 
        phase: Math.random() * Math.PI * 2,
        nx,
        ny,
        nz,
        baseR: r
      });
    }
    greenGeo.setAttribute("position", new THREE.BufferAttribute(greenPositions, 3));
    const greenMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 2.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const greenParticles = new THREE.Points(greenGeo, greenMat);
    globeGroup.add(greenParticles);


    // 60 connecting lines
    const connections: Array<{
      p1: typeof particles[0];
      p2: typeof particles[0];
      mesh: THREE.Mesh;
    }> = [];
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1, 4);
    const connectionMaterial = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.2
    });

    let attempts = 0;
    while (connections.length < 60 && attempts < 3000) {
      attempts++;
      const idx1 = Math.floor(Math.random() * particles.length);
      const idx2 = Math.floor(Math.random() * particles.length);
      if (idx1 === idx2) continue;

      const duplicate = connections.some(c => 
        (c.p1 === particles[idx1] && c.p2 === particles[idx2]) || 
        (c.p1 === particles[idx2] && c.p2 === particles[idx1])
      );
      if (duplicate) continue;

      const p1 = particles[idx1];
      const p2 = particles[idx2];
      const dist = p1.mesh.position.distanceTo(p2.mesh.position);
      if (dist < 120) {
        const cylinderMesh = new THREE.Mesh(cylinderGeometry, connectionMaterial);
        scene.add(cylinderMesh);
        connections.push({ p1, p2, mesh: cylinderMesh });
      }
    }

    let mouseX = 0;
    let mouseY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    const camRot = { x: 0, y: 0 };
    const camVel = { x: 0, y: 0 };

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouseY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      targetRotX = -mouseY * (10 * Math.PI / 180);
      targetRotY = -mouseX * (12 * Math.PI / 180);

      // Globe drag rotation
      const drag = globeDragRef.current;
      if (drag.isDragging) {
        const dx = event.clientX - drag.prevX;
        const dy = event.clientY - drag.prevY;
        
        // Softly increment target rotation values instead of direct harsh updates
        drag.targetRotY += dx * 0.007;
        drag.targetRotX += dy * 0.007;
        
        // Track momentum speed
        drag.spinY = dx * 0.007;
        drag.spinX = dy * 0.007;
        
        drag.prevX = event.clientX;
        drag.prevY = event.clientY;
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      // Don't drag on Metrics Sandbox (3) or Pricing Plans (4) sections as it interferes with sliders and the coin
      if (activeSectionRef.current === 3 || activeSectionRef.current === 4) return;
      // Don't drag if clicking interactive elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === "BUTTON" || 
        target.tagName === "INPUT" || 
        target.tagName === "A" || 
        target.tagName === "TEXTAREA" ||
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input")
      ) {
        return;
      }
      const drag = globeDragRef.current;
      drag.isDragging = true;
      drag.prevX = event.clientX;
      drag.prevY = event.clientY;
      drag.spinX = 0;
      drag.spinY = 0;
      
      // Initialize targets to current rotation so there are no sudden jumps
      drag.targetRotX = globeGroup.rotation.x;
      drag.targetRotY = globeGroup.rotation.y;
    };

    const handleMouseUp = () => {
      globeDragRef.current.isDragging = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    // High-performance static reuse caches to eliminate GC spikes inside the render loop
    const _dir = new THREE.Vector3();
    const _mid = new THREE.Vector3();
    const _align = new THREE.Vector3(0, 1, 0);
    const _quat = new THREE.Quaternion();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.1);

      // Scroll progress mapping driven smoothly by activeSectionRef coordinate Z interpolation
      const currProgress = activeSectionRef.current / 6;
      const targetZ = 600 - currProgress * (600 - 350);
      camera.position.z += (targetZ - camera.position.z) * 0.05;

      // Oscillations
      particles.forEach(p => {
        const theta = (time + p.timeOffset) * (Math.PI * 2 / p.duration);
        p.mesh.position.y = p.baseY + Math.sin(theta) * p.amplitude;
      });

      // Connections — fully optimized to reuse static instances, zero object allocations in render loop
      connections.forEach(c => {
        const posA = c.p1.mesh.position;
        const posB = c.p2.mesh.position;
        _dir.subVectors(posB, posA);
        const len = _dir.length();
        c.mesh.scale.set(1, len, 1);
        _mid.addVectors(posA, posB).multiplyScalar(0.5);
        c.mesh.position.copy(_mid);
        _dir.normalize();
        _quat.setFromUnitVectors(_align, _dir);
        c.mesh.quaternion.copy(_quat);
      });

      gridMesh.rotation.z += 0.000349;

      // Tilts
      const forceX = -80 * (camRot.x - targetRotX) - 20 * camVel.x;
      camVel.x += forceX * dt;
      camRot.x += camVel.x * dt;

      const forceY = -80 * (camRot.y - targetRotY) - 20 * camVel.y;
      camVel.y += forceY * dt;
      camRot.y += camVel.y * dt;

      camera.rotation.x = camRot.x;
      camera.rotation.y = camRot.y;

      // Globe centerpiece — buttery-smooth target damping and inertia decay physics
      const drag = globeDragRef.current;
      if (drag.isDragging) {
        // Smoothly interpolate towards the target coordinates using a damping factor
        const damping = 0.12;
        globeGroup.rotation.y += (drag.targetRotY - globeGroup.rotation.y) * damping;
        globeGroup.rotation.x += (drag.targetRotX - globeGroup.rotation.x) * damping;
      } else {
        // Apply physics inertia decay
        drag.spinY *= 0.95;
        drag.spinX *= 0.95;
        
        // Blend in baseline slow auto-rotation so it stays active
        const targetAutoY = 0.0022;
        const targetAutoX = 0.0006;
        drag.spinY += (targetAutoY - drag.spinY) * 0.04;
        drag.spinX += (targetAutoX - drag.spinX) * 0.04;
        
        globeGroup.rotation.y += drag.spinY;
        globeGroup.rotation.x += drag.spinX;
        
        // Keep the drag target aligned with active auto-rotation to prevent jumpy snaps when clicking again
        drag.targetRotY = globeGroup.rotation.y;
        drag.targetRotX = globeGroup.rotation.x;
      }

      // Scale globe up when on Section 1 (Global Intelligence)
      const isGlobeSection = activeSectionRef.current === 1;
      const targetGlobeScale = isGlobeSection ? 1.6 : 1.0;
      const currentGlobeScale = globeGroup.scale.x;
      const newGlobeScale = currentGlobeScale + (targetGlobeScale - currentGlobeScale) * 0.04;
      globeGroup.scale.setScalar(newGlobeScale);

      // Increase globe opacity when active
      const targetWireOpacity = isGlobeSection ? 0.18 : 0.08;
      (wireMat as any).opacity += (targetWireOpacity - (wireMat as any).opacity) * 0.05;
      const targetDotOpacity = isGlobeSection ? 0.65 : 0.35;
      (dotMat as any).opacity += (targetDotOpacity - (dotMat as any).opacity) * 0.05;

      // Green particles pulse animation — fully precalculated vector directions to avoid Math.sqrt / division GC and CPU lag
      const greenPosArr = greenParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < greenParticleCount; i++) {
        const sp = greenSpeeds[i];
        const pulseFactor = sp.baseR + Math.sin(time * sp.freq + sp.phase) * 5;
        greenPosArr[i * 3] = sp.nx * pulseFactor;
        greenPosArr[i * 3 + 1] = sp.ny * pulseFactor;
        greenPosArr[i * 3 + 2] = sp.nz * pulseFactor;
      }
      greenParticles.geometry.attributes.position.needsUpdate = true;
      const targetGreenOpacity = isGlobeSection ? 0.8 : 0.45;
      (greenMat as any).opacity += (targetGreenOpacity - (greenMat as any).opacity) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Pro GPU Memory (VRAM) Disposal: Traverse and release WebGL objects
      scene.traverse((obj: any) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat: any) => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Parallax mouse effect — use MotionValues to avoid React re-renders on every mousemove
  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);
  // Smoothed parallax values for CSS transform
  const smoothParX = useSpring(parallaxX, { stiffness: 40, damping: 20 });
  const smoothParY = useSpring(parallaxY, { stiffness: 40, damping: 20 });

  useEffect(() => {
    let rafId: number | null = null;
    const moveCursor = (e: MouseEvent) => {
      // Parallax: throttle via RAF to avoid overloading
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
        const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        parallaxX.set(x);
        parallaxY.set(y);
        rafId = null;
      });
    };

    window.addEventListener("mousemove", moveCursor, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  // Sidebar commands hub panel
  const [activeHubTab, setActiveHubTab] = useState<string>("home");

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactFirm, setContactFirm] = useState("student");
  const [contactMsg, setContactMsg] = useState("");
  const [contactRef, setContactRef] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await supabase.from("waitlist").insert([
        { 
          email: contactEmail, 
          segment: `contact_${contactFirm}`, 
          metadata: { name: contactName, message: contactMsg } 
        }
      ]);
    } catch (err) {
      console.warn("Bypassed support ticket Supabase logging: ", err);
    }
    setTimeout(() => {
      setContactLoading(false);
      setContactRef(`REF_${Math.floor(Math.random() * 900000 + 100000)}`);
      setContactName("");
      setContactEmail("");
      setContactMsg("");
    }, 1500);
  };

  const openHub = (tab: string) => {
    setActiveHubTab(tab);
    setInfoHubActive(true);
  };

  // DCF recalcs sandbox
  const [dcfEbitda, setDcfEbitda] = useState(120); 
  const [dcfGrowth, setDcfGrowth] = useState(15); 
  const [dcfWacc, setDcfWacc] = useState(9.0); 
  const [dcfMultiple, setDcfMultiple] = useState(14); 
  const sharesOutstanding = 10000000;

  const ebitdaVal = dcfEbitda * 100000;
  const growthVal = dcfGrowth / 100;
  const waccVal = dcfWacc / 100;

  let currentCashFlow = ebitdaVal;
  let sumPV = 0;
  for (let yr = 1; yr <= 5; yr++) {
    currentCashFlow = currentCashFlow * (1 + growthVal);
    const pv = currentCashFlow / Math.pow(1 + waccVal, yr);
    sumPV += pv;
  }
  const terminalVal = currentCashFlow * dcfMultiple;
  const pvOfTerminalVal = terminalVal / Math.pow(1 + waccVal, 5);
  const enterpriseValue = sumPV + pvOfTerminalVal;
  const impliedSharePrice = enterpriseValue / sharesOutstanding;

  const multiplesList = [dcfMultiple - 2, dcfMultiple, dcfMultiple + 2];
  const waccList = [dcfWacc - 1.0, dcfWacc, dcfWacc + 1.0];

  const calculateCellPrice = (w: number, m: number) => {
    const wDecimal = w / 100;
    let tempCashFlow = ebitdaVal;
    let tempSumPV = 0;
    for (let yr = 1; yr <= 5; yr++) {
      tempCashFlow = tempCashFlow * (1 + growthVal);
      const pv = tempCashFlow / Math.pow(1 + wDecimal, yr);
      tempSumPV += pv;
    }
    const tv = tempCashFlow * m;
    const pvOfTv = tv / Math.pow(1 + wDecimal, 5);
    const ev = tempSumPV + pvOfTv;
    return ev / sharesOutstanding;
  };

  const pvPercent = Math.max(5, Math.min(95, (sumPV / enterpriseValue) * 100)) || 40;
  const tvPercent = 100 - pvPercent;

  // waitlist & templates
  // waitlist & templates
  const [vaultEmail, setVaultEmail] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultEmail) return;
    setVaultLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: vaultEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setWaitlistPosition(data.position);
        setReferralCode(data.referral_code);
        setVaultUnlocked(true);
        
        // Confetti burst!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      } else {
        console.warn("Waitlist API error:", data.error);
        setVaultUnlocked(true);
      }
    } catch (err) {
      console.warn("Bypassed database waitlist insert: ", err);
      setVaultUnlocked(true);
    } finally {
      setVaultLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // AI chat cockpit sequences
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: string; content: string }>>([
    { role: "system", content: "ANALYST.OS RESEARCH PIPELINE INITIALIZED [CONNECTED NSE NODE]" },
    { role: "user", content: "Compile valuation report on RELIANCE for Q3 FY26 assumptions." },
    { role: "system", content: "COMPILING VALUATION METRICS...\nRELIANCE assumptions EBITDA ₹120L, WACC 9.0%, Exit Multiple 14.0x. Implied intrinsic share price calculated: ₹1,854. EV of ₹18.54 Cr is mathematically consistent under pro-forma forecasts." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  const handleSendAiMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    const msg = aiInput;
    setAiChatHistory(prev => [...prev, { role: "user", content: msg }]);
    setAiInput("");
    setIsAiTyping(true);

    setTimeout(() => {
      let reply = "";
      const cmd = msg.toUpperCase();
      if (cmd.includes("HELP")) {
        reply = "AVAILABLE COMMANDS: HELP | SYS_PING | LIST_STOCKS | RUN_VALUATION [TICKER]";
      } else if (cmd.includes("SYS_PING")) {
        reply = "SYS_STATUS: PING 28ms - NSE_NODE ALIVE - CORE_SYSTEMS OPERATIONAL [v1.0.4]";
      } else if (cmd.includes("LIST_STOCKS")) {
        reply = "TICKERS: RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, KOTAKBANK";
      } else if (cmd.includes("RUN_VALUATION") || cmd.includes("RELIANCE")) {
        reply = "DCF_COMPILING: Intrinsic valuation model running. EV implies ₹18.54 Cr. Target fair value is positive over active margins.";
      } else {
        reply = `CONNECTING TO LOCAL FINANCIAL INDEX NODES...\nUNABLE TO RESOLVE CO-PILOT PIPELINES DIRECTLY FOR '${msg}'.\nENTER HELP FOR OPTIONS.`;
      }
      setAiChatHistory(prev => [...prev, { role: "system", content: reply }]);
      setIsAiTyping(false);
    }, 1000);
  };

  // Reusable Framer Motion variants for cinematic reveals
  const headingVariants: any = {
    inactive: { y: "115%", opacity: 0, filter: "blur(4px)" },
    active: (customDelay: number = 0) => ({ 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.9, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const textVariants: any = {
    inactive: { y: 25, opacity: 0, filter: "blur(4px)" },
    active: (customDelay: number = 0.15) => ({ 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.8, delay: customDelay, ease: "easeOut" } 
    })
  };

  const cardVariants: any = {
    inactive: { y: 70, opacity: 0, filter: "blur(8px)" },
    active: (customDelay: number = 0.3) => ({ 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.9, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const alternatingLeftVariants: any = {
    inactive: { x: -80, opacity: 0, filter: "blur(6px)" },
    active: (customDelay: number = 0.1) => ({ 
      x: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.9, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const alternatingRightVariants: any = {
    inactive: { x: 80, opacity: 0, filter: "blur(6px)" },
    active: (customDelay: number = 0.1) => ({ 
      x: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.9, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const terminalBootVariants: any = {
    inactive: { opacity: 0, scale: 0.98, filter: "blur(4px)" },
    active: (customDelay: number = 0.2) => ({ 
      opacity: 1, 
      scale: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.7, delay: customDelay, ease: "easeOut" } 
    })
  };

  const downwardVariants: any = {
    inactive: { y: -70, opacity: 0, filter: "blur(6px)" },
    active: (customDelay: number = 0.2) => ({ 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.8, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const pricingScaleVariants: any = {
    inactive: { y: 60, scale: 0.94, opacity: 0, filter: "blur(6px)" },
    active: (customDelay: number = 0.3) => ({ 
      y: 0, 
      scale: 1, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.9, delay: customDelay, ease: [0.16, 1, 0.3, 1] } 
    })
  };

  const timelineStepVariants: any = {
    inactive: { y: 30, opacity: 0, filter: "blur(4px)" },
    active: (customDelay: number = 0.2) => ({ 
      y: 0, 
      opacity: 1, 
      filter: "blur(0px)",
      transition: { duration: 0.8, delay: customDelay, ease: "easeOut" } 
    })
  };

  const executeCommand = (cmd: string) => {
    const formatted = cmd.trim().toLowerCase();
    setCommandPaletteOpen(false);
    setCommandQuery("");
    
    if (formatted === "tour" || formatted === "onboarding") {
      setTourActive(true);
      setTourStep(1);
      scrollToSection(0);
    } else if (formatted === "login") {
      router.push("/login");
    } else if (formatted === "signup") {
      router.push("/signup");
    } else if (formatted === "founder" || formatted === "backdoor") {
      router.push("/dashboard?founder=true");
    } else if (formatted === "mobile" || formatted === "lite") {
      router.push("/mobile");
    } else if (formatted === "hero" || formatted === "sec1") {
      scrollToSection(0);
    } else if (formatted === "globe" || formatted === "sec2") {
      scrollToSection(1);
    } else if (formatted === "features" || formatted === "sec3") {
      scrollToSection(2);
    } else if (formatted === "sandbox" || formatted === "sec4") {
      scrollToSection(3);
    } else if (formatted === "pricing" || formatted === "sec5") {
      scrollToSection(4);
    } else if (formatted === "roadmap" || formatted === "sec6") {
      scrollToSection(5);
    } else if (formatted === "vault" || formatted === "sec7") {
      scrollToSection(6);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#020010] text-slate-100 font-sans selection:bg-[#a78bfa]/30 selection:text-white relative">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var introSeen = sessionStorage.getItem('introSeen') === 'true';
              var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              if (!introSeen && !prefersReducedMotion) {
                document.documentElement.classList.add('intro-playing');
              }
            })();
          `
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          #landing-page-wrapper {
            transition: opacity 1000ms ease-out;
          }
          html.intro-playing #landing-page-wrapper {
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `
      }} />

      <div id="landing-page-wrapper" className="flex flex-col h-full w-full relative">
        <script
          type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "SoftwareApplication",
                "@id": "https://analystos-terminal.vercel.app/#software",
                "name": "AnalystOS",
                "url": "https://analystos-terminal.vercel.app",
                "applicationCategory": "FinanceApplication",
                "operatingSystem": "All",
                "description": "Next-generation AI-powered financial research terminal for investors, hedge funds, and analysts.",
                "image": "https://analystos-terminal.vercel.app/app-icon.png",
                "offers": {
                  "@type": "Offer",
                  "price": "0.00",
                  "priceCurrency": "USD"
                }
              },
              {
                "@type": "FinancialService",
                "@id": "https://analystos-terminal.vercel.app/#service",
                "name": "AnalystOS Equity Research Services",
                "url": "https://analystos-terminal.vercel.app",
                "logo": "https://analystos-terminal.vercel.app/app-icon.png",
                "description": "Interactive financial operating system delivering live DCF models, AI Investment Committee scores, and multi-asset metrics."
              }
            ]
          })
        }}
      />
      
      {/* Parallax Layer 1: Ambient Glow Orbs — section offset via CSS transition */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ 
          transform: `translate3d(${-sectionCoordinates[activeSection].x * 0.25}vw, ${-sectionCoordinates[activeSection].y * 0.25}vh, 0)`,
          transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform"
        }}
      >
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#a78bfa] opacity-[0.12] blur-[120px]" style={{ left: "60vw", top: "20vh" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#60a5fa] opacity-[0.09] blur-[150px]" style={{ left: "170vw", top: "60vh" }} />
        <div className="absolute w-[450px] h-[450px] rounded-full bg-[#34d399] opacity-[0.08] blur-[130px]" style={{ left: "280vw", top: "15vh" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] opacity-[0.11] blur-[140px]" style={{ left: "390vw", top: "50vh" }} />
      </div>

      {/* Parallax Layer 2: Technical Grid Vector */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ 
          transform: `translate3d(${-sectionCoordinates[activeSection].x * 0.18}vw, ${-sectionCoordinates[activeSection].y * 0.18}vh, 0)`,
          transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform"
        }}
      >
        <div className="absolute inset-y-0 w-[500vw] opacity-[0.03]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      </div>

      {/* Parallax Layer 3: Foreground Dust Particles */}
      <div 
        className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
        style={{ 
          transform: `translate3d(${-sectionCoordinates[activeSection].x * 0.05}vw, ${-sectionCoordinates[activeSection].y * 0.05}vh, 0)`,
          transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform"
        }}
      >
        <div className="absolute text-[#a78bfa]/20 font-mono text-sm" style={{ left: "110vw", top: "25vh" }}>+</div>
        <div className="absolute text-[#60a5fa]/20 font-mono text-sm" style={{ left: "215vw", top: "75vh" }}>+</div>
        <div className="absolute text-[#34d399]/20 font-mono text-sm" style={{ left: "320vw", top: "30vh" }}>+</div>
        <div className="absolute text-[#a78bfa]/20 font-mono text-sm" style={{ left: "425vw", top: "80vh" }}>+</div>
      </div>

      {/* 2. WebGL Three.js Scene container */}
      <div 
        ref={canvasContainerRef} 
        id="hero-canvas-container" 
        className="fixed inset-0 z-0 pointer-events-none" 
        style={{
          transform: `translate3d(${activeSection <= 1 ? 0 : -sectionCoordinates[activeSection].x * 0.12}vw, ${-sectionCoordinates[activeSection].y * 0.12}vh, 0)`,
          transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform"
        }}
      />


      {/* 3. Global Top Navigation (Fixed, 72px transparent) */}
      <header className="w-full bg-transparent h-[72px] px-8 flex items-center justify-between font-sans fixed top-0 left-0 z-40 select-none">
        <div className="flex items-center space-x-6">
          <button onClick={() => scrollToSection(0)} className="text-[18px] font-extrabold tracking-[0.12em] font-display flex items-center cursor-none bg-transparent border-none outline-none">
            <span className="text-white">ANALYST</span>
            <span className="text-[#a78bfa] ml-0.5">OS</span>
          </button>
          <span className="hidden md:inline-flex bg-white/[0.04] border border-[#34d399]/20 px-2.5 py-1 text-[#34d399] rounded text-[10px] items-center space-x-1.5 font-mono">
            <span className="w-1.5 h-1.5 bg-[#34d399] rounded-full animate-ping"></span>
            <span>SYSTEMS ONLINE</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {[
            { label: "Features", index: 1 },
            { label: "Metrics", index: 2 },
            { label: "Pricing", index: 3 },
            { label: "Roadmap", index: 4 },
            { label: "Vault", index: 5 }
          ].map(link => (
            <button
              key={link.label}
              onClick={() => {
                scrollToSection(link.index);
              }}
              className="text-[13px] uppercase tracking-[0.08em] text-white/55 hover:text-[#a78bfa] transition-colors font-sans font-normal cursor-none bg-transparent border-none"
            >
              {link.label}
            </button>
          ))}
          <span className="text-white/20">|</span>
          <Link href="/mobile" className="text-[13px] uppercase tracking-[0.08em] text-[#34d399] hover:text-[#34d399]/80 transition-colors font-sans font-normal cursor-none font-bold">
            [MOBILE_LITE]
          </Link>
          <span className="text-white/20">|</span>
          <Link href="/login" className="text-[13px] uppercase tracking-[0.08em] text-white/55 hover:text-white transition-colors font-sans font-normal cursor-none">
            [LOG_IN]
          </Link>
          <Link
            href="/signup"
            className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold text-[11px] px-4 py-1.5 rounded transition-all font-sans uppercase tracking-[0.05em] cursor-none"
          >
            [SIGN_UP]
          </Link>
        </nav>
      </header>

      {/* 4. Right side dot navigation indicators */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col space-y-4 z-40 select-none">
        {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
          const isActive = activeSection === idx;
          return (
            <button
              key={idx}
              onClick={() => scrollToSection(idx)}
              className={`w-3 h-3 rounded-full border transition-all duration-300 relative group cursor-none bg-transparent`}
              style={{
                borderColor: isActive ? "#00d4ff" : "rgba(255,255,255,0.2)",
                backgroundColor: isActive ? "#00d4ff" : "transparent",
              }}
            >
              <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-slate-400">
                {idx === 0 && "01. HERO COCKPIT"}
                {idx === 1 && "02. GLOBAL INTELLIGENCE"}
                {idx === 2 && "03. FEATURE GRID"}
                {idx === 3 && "04. DCF SANDBOX"}
                {idx === 4 && "05. PRICING PLANS"}
                {idx === 5 && "06. ABOUT TIMELINE"}
                {idx === 6 && "07. SECURE VAULT"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Bottom Scroll Progress Bar */}
      <div 
        className="fixed bottom-0 left-0 h-1 bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#34d399] z-50 transition-all duration-75 ease-out select-none"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      {/* 6. MAIN 2D TRANSLATING VIEWPORT CONTAINER */}
      <main className="flex-1 w-full h-full relative z-10 overflow-hidden">
        <motion.div
          animate={{
            x: `-${sectionCoordinates[activeSection].x}vw`,
            y: `-${sectionCoordinates[activeSection].y}vh`
          }}
          transition={{
            duration: 1.2,
            ease: [0.16, 1, 0.3, 1] // Premium ultra-smooth bezier curve!
          }}
          style={{ willChange: "transform" }}
          className="absolute inset-0 w-[300vw] h-[300vh]"
        >
        
          {/* ==========================================
          * SECTION 1: HERO COCKPIT
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex flex-col items-center justify-center px-8 md:px-16 pt-16 transition-all duration-1000"
            style={{
              left: "0vw",
              top: "0vh",
              transform: `scale(${activeSection === 0 ? 1 : 0.92}) rotate(${activeSection === 0 ? 0 : -2}deg)`,
              filter: `blur(${activeSection === 0 ? 0 : 2}px)`,
              opacity: activeSection === 0 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center">
            
            {/* Headline 1 (Masked Text Reveal - EXACTLY 64px) */}
            <div className="overflow-hidden mb-2">
              <motion.h1 
                variants={headingVariants}
                custom={0}
                animate={activeSection === 0 ? "active" : "inactive"}
                className="text-4xl md:text-[64px] font-extrabold tracking-tight text-white font-display uppercase leading-none select-none"
              >
                Analyze beyond
              </motion.h1>
            </div>

            {/* Headline 2 (Masked Text Reveal - EXACTLY 64px) */}
            <div className="overflow-hidden mb-10">
              <motion.h1 
                variants={headingVariants}
                custom={0.1}
                animate={activeSection === 0 ? "active" : "inactive"}
                className="text-4xl md:text-[64px] font-extrabold tracking-tight figma-gradient-text font-display uppercase leading-none select-none mt-2"
              >
                intelligence
              </motion.h1>
            </div>

            {/* Subtext - EXACTLY 20px with spacious leading */}
            <motion.p 
              variants={textVariants}
              custom={0.2}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="text-white/50 text-base md:text-[20px] font-sans font-normal max-w-[650px] leading-[1.8] mb-12 mx-auto"
            >
              A 3D-first analyst operating system where data, motion, and intelligence merge into one living interface.
            </motion.p>

            {/* CTAs */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="flex flex-row items-center gap-4 justify-center mb-12 font-sans"
            >
              <MagneticButton 
                href="/signup" 
                className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold text-xs md:text-[14px] uppercase tracking-wider px-8 py-3.5 rounded-full transition-all shadow-[0_0_30px_rgba(167,139,250,0.3)] flex items-center justify-center space-x-2 cursor-none"
              >
                <span>Launch AnalystOS</span>
                <ArrowRight className="w-4 h-4" />
              </MagneticButton>
              <MagneticButton 
                onClick={() => scrollToSection(1)}
                className="bg-transparent border border-white/20 hover:border-[#a78bfa] hover:text-white text-white/70 text-xs md:text-[14px] uppercase tracking-wider px-8 py-3.5 rounded-full transition-all cursor-none"
              >
                View Features
              </MagneticButton>
            </motion.div>

            {/* Pulsing Status Pill */}
            <motion.div 
              variants={cardVariants}
              custom={0.5}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="bg-white/[0.05] border border-white/[0.1] rounded-full px-5 py-2.5 backdrop-blur-[10px] flex items-center justify-center space-x-2.5 mx-auto text-center pointer-events-none select-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] figma-pulse-circle animate-pulse" />
              <span className="text-[11px] font-sans uppercase tracking-[0.08em] text-white/45 font-bold">
                Live intelligence engine · Swipe horizontally to navigate
              </span>
            </motion.div>

            <motion.div
              variants={cardVariants}
              custom={0.65}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="text-[10px] font-mono text-slate-500 flex items-center space-x-2 justify-center mt-4"
            >
              <span className="pulse-green"></span>
              <span>LAUNCH ACCESS IN:</span>
              <span className="text-[#34d399] font-bold">{countdown}</span>
            </motion.div>

            {/* Glowing 3D Hero Mock Cockpit Preview */}
            <motion.div
              variants={cardVariants}
              custom={0.8}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="mt-10 w-full max-w-lg select-none"
            >
              <AnimatedTerminalPreview />
            </motion.div>

          </div>
        </section>

          {/* ==========================================
          * SECTION 2: GLOBAL INTELLIGENCE (ORBITING TEXT OVER EXISTING GLOBE)
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center transition-all duration-1000"
            style={{
              left: "100vw",
              top: "0vh",
              transform: `scale(${activeSection === 1 ? 1 : 0.95})`,
              filter: `blur(${activeSection === 1 ? 0 : 2}px)`,
              opacity: activeSection === 1 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* Center text content */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={activeSection === 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-4xl px-6 text-center space-y-6 flex flex-col items-center"
            >
              <span className="text-[10px] font-bold tracking-[0.25em] font-mono text-[#00d4ff] uppercase block">
                02 — GLOBAL INTELLIGENCE
              </span>

              <h2 className="text-3xl md:text-[56px] font-[800] font-display text-white uppercase tracking-tight leading-none max-w-2xl text-center select-none mt-2">
                Markets move at the speed of light. So do we.
              </h2>

              <p className="text-white/40 text-sm md:text-[16px] font-sans max-w-lg leading-relaxed">
                Drag the globe to explore. Our intelligence network spans every exchange, every feed, every model.
              </p>

              {/* Orbiting stat pills — spin once on entrance */}
              <motion.div
                initial={{ rotateY: -180, opacity: 0 }}
                animate={activeSection === 1 ? { rotateY: 0, opacity: 1 } : { rotateY: -180, opacity: 0 }}
                transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                style={{ transformStyle: "preserve-3d", perspective: "800px" }}
                className="flex flex-wrap items-center justify-center gap-3 pt-4"
              >
                {["12ms Latency", "1,200+ Models", "99.4% Accuracy", "340+ Dashboards"].map((stat, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ scale: 0.8, opacity: 0, rotateX: 45 }}
                    animate={activeSection === 1 ? { scale: 1, opacity: 1, rotateX: 0 } : { scale: 0.8, opacity: 0, rotateX: 45 }}
                    transition={{ duration: 0.8, delay: 0.5 + idx * 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="border border-[#00d4ff]/15 bg-[#00d4ff]/5 hover:bg-[#00d4ff]/10 hover:border-[#00d4ff]/35 transition-colors px-4 py-1.5 rounded-full text-[11px] font-mono text-[#00d4ff] font-bold shadow-lg backdrop-blur-sm"
                  >
                    {stat}
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </section>

          {/* ==========================================
          * SECTION 3: FEATURE GRID & STAT CARDS
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
            style={{
              left: "200vw",
              top: "0vh",
              transform: `scale(${activeSection === 2 ? 1 : 0.94}) rotateY(${activeSection === 2 ? 0 : 12}deg)`,
              filter: `blur(${activeSection === 2 ? 0 : 2}px)`,
              opacity: activeSection === 2 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Description and Chat Terminal Cockpit */}
            <motion.div 
              variants={alternatingLeftVariants}
              custom={0.15}
              animate={activeSection === 2 ? "active" : "inactive"}
              className="lg:col-span-7 text-left space-y-4"
            >
              <span className="terminal-badge">02. FEATURES GRIDS</span>
              <h2 className="text-3xl md:text-[48px] font-bold font-display text-white uppercase tracking-tight leading-none mt-4">
                Unified Analytical Cockpit
              </h2>
              <p className="text-white/50 text-base md:text-[20px] max-w-xl font-sans leading-relaxed mt-6">
                Interact with high-performance dashboards, stock margin predictions, and secure databases. Our co-pilot chats directly with local NSE servers.
              </p>
              
              {/* Chat terminal widget cockpit */}
              <TiltCard className="w-full mt-4">
                <div className="w-full bg-[#0b0f19]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#070b13] text-[10px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#ff3860]" />
                      <span className="w-2 h-2 rounded-full bg-[#ffdd57]" />
                      <span className="w-2 h-2 rounded-full bg-[#34d399]" />
                      <span className="font-bold ml-2 text-slate-400">CO-PILOT.ANALYST.OS</span>
                    </div>
                    <span className="text-[#34d399]">NSE NODE ONLINE</span>
                  </div>

                  {/* history list */}
                  <div className="p-4 h-[160px] overflow-y-auto space-y-2 text-left bg-slate-950/40 select-text scrollbar-thin">
                    {aiChatHistory.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <span className={`text-[10px] font-bold ${
                          item.role === 'user' ? 'text-[#60a5fa]' : 'text-[#a78bfa]'
                        }`}>
                          {item.role === 'user' ? '>> COMMAND_INPUT' : '>> PIPELINE_REPLY'}
                        </span>
                        <pre className="text-slate-350 font-mono whitespace-pre-wrap leading-relaxed text-[11px]">{item.content}</pre>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="text-[#a78bfa] animate-pulse text-[11px]">{">>>>"} PARSING PIPELINE ASSUMPTIONS...</div>
                    )}
                  </div>

                  {/* Form console input */}
                  <form onSubmit={handleSendAiMessage} className="flex border-t border-white/10">
                    <input
                      type="text"
                      placeholder="Ask co-pilot... (e.g. HELP, SYS_PING, LIST_STOCKS)"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      className="flex-1 bg-[#05070a] border-none outline-none text-white text-xs px-4 py-2.5 font-mono cursor-none"
                    />
                    <button type="submit" className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold px-4 py-2.5 transition-colors cursor-none">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </TiltCard>
            </motion.div>

            {/* Right Panel: The 4 Figma stat cards floating 2x2 grid */}
            <motion.div 
              variants={alternatingRightVariants}
              custom={0.35}
              animate={activeSection === 2 ? "active" : "inactive"}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="grid grid-cols-2 gap-4">
                <FloatingStatCard 
                  label="Data Models" 
                  val="1,200+" 
                  sub="↑ Live pipelines" 
                  delay={0.1}
                  duration={14}
                />
                <FloatingStatCard 
                  label="Latency" 
                  val="12ms" 
                  sub="↑ Real-time" 
                  delay={0.2}
                  duration={18}
                />
                <FloatingStatCard 
                  label="Accuracy" 
                  val="99.4%" 
                  sub="↑ ML inference" 
                  delay={0.3}
                  duration={16}
                />
                <FloatingStatCard 
                  label="Dashboards" 
                  val="340+" 
                  sub="↑ Auto-generated" 
                  delay={0.4}
                  duration={20}
                />
              </div>
            </motion.div>

          </div>
        </section>

          {/* ==========================================
          * SECTION 4: METRICS 2×3 DCF SANDBOX
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
            style={{
              left: "200vw",
              top: "100vh",
              transform: `scale(${activeSection === 3 ? 1 : 0.93}) rotateX(${activeSection === 3 ? 0 : -10}deg)`,
              filter: `blur(${activeSection === 3 ? 0 : 2}px)`,
              opacity: activeSection === 3 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: The DCF assumptions sliders */}
            <motion.div 
              variants={downwardVariants}
              custom={0.15}
              animate={activeSection === 3 ? "active" : "inactive"}
              className="lg:col-span-5 text-left space-y-4"
            >
              <span className="terminal-badge">03. METRICS SANDBOX</span>
              <h2 className="text-3xl md:text-[48px] font-bold font-display text-white uppercase tracking-tight leading-none mt-4">
                Live DCF Model Recalculator
              </h2>
              <p className="text-white/50 text-base md:text-[20px] max-w-xl font-sans leading-relaxed mt-6">
                Recalculate implied valuations instantly. Drag assumptions sliders to update sensitivities and fair values.
              </p>
              
              {/* Scenario Selectors for Interactive Dashboard Transitions */}
              <div className="flex items-center space-x-2 font-mono text-[9px] select-none">
                <span className="text-slate-500 mr-1 uppercase">Scenarios:</span>
                <button
                  type="button"
                  onClick={() => {
                    setDcfEbitda(250);
                    setDcfGrowth(25);
                    setDcfWacc(8.0);
                    setDcfMultiple(18);
                  }}
                  className="bg-transparent border border-[#34d399]/40 hover:bg-[#34d399]/15 text-[#34d399] px-2 py-0.5 rounded cursor-none transition-all hover:scale-105 active:scale-95"
                >
                  [BULL_CASE]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDcfEbitda(120);
                    setDcfGrowth(15);
                    setDcfWacc(9.0);
                    setDcfMultiple(14);
                  }}
                  className="bg-transparent border border-white/20 hover:bg-white/10 text-white px-2 py-0.5 rounded cursor-none transition-all hover:scale-105 active:scale-95"
                >
                  [BASE_CASE]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDcfEbitda(70);
                    setDcfGrowth(5);
                    setDcfWacc(11.5);
                    setDcfMultiple(10);
                  }}
                  className="bg-transparent border border-[#ff3860]/40 hover:bg-[#ff3860]/15 text-[#ff3860] px-2 py-0.5 rounded cursor-none transition-all hover:scale-105 active:scale-95"
                >
                  [BEAR_CASE]
                </button>
              </div>

              {/* Slider form cards */}
              <TiltCard className="w-full">
                <div className="space-y-3 bg-[#0b0f19]/70 border border-white/5 p-4 rounded-xl font-mono text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Year EBITDA</span>
                      <span className="text-white font-bold">₹{dcfEbitda} Lakhs</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="500" 
                      value={dcfEbitda} 
                      onChange={e => setDcfEbitda(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-none accent-[#a78bfa]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>5-Yr EBITDA Growth</span>
                      <span className="text-[#60a5fa] font-bold">{dcfGrowth}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="40" 
                      value={dcfGrowth} 
                      onChange={e => setDcfGrowth(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-none accent-[#60a5fa]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>WACC Discount Rate</span>
                      <span className="text-[#34d399] font-bold">{dcfWacc.toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="5.0" 
                      max="15.0" 
                      step="0.5"
                      value={dcfWacc} 
                      onChange={e => setDcfWacc(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-none accent-[#34d399]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Terminal EBITDA Multiple</span>
                      <span className="text-[#ffdd57] font-bold">{dcfMultiple}x</span>
                    </div>
                    <input 
                      type="range" 
                      min="8" 
                      max="22" 
                      value={dcfMultiple} 
                      onChange={e => setDcfMultiple(Number(e.target.value))}
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-none accent-[#ffdd57]"
                    />
                  </div>
                </div>
              </TiltCard>
            </motion.div>

            {/* Right Panel: Metrics 2x3 Grid */}
            <div className="lg:col-span-7 w-full">
              <div className="grid grid-cols-3 gap-3">
                
                {/* 1. Implied Price Card */}
                <motion.div 
                  variants={downwardVariants}
                  custom={0.3}
                  animate={activeSection === 3 ? "active" : "inactive"}
                  className="col-span-2"
                >
                  <TiltCard className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between h-[95px] text-left hover:border-[#34d399]/20 transition-colors">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono flex items-center justify-between">
                      <span>DCF Intrinsic Fair Price</span>
                      <span className="text-[#34d399] text-[8px] animate-pulse">[LOAD_OK]</span>
                    </span>
                    <span className="text-2xl font-bold font-display text-white">₹{impliedSharePrice.toFixed(2)}</span>
                    <span className="text-[10px] text-[#34d399] font-mono font-medium">Implied Value per Share</span>
                  </TiltCard>
                </motion.div>

                {/* 2. NSE status node */}
                <motion.div 
                  variants={downwardVariants}
                  custom={0.45}
                  animate={activeSection === 3 ? "active" : "inactive"}
                  className="col-span-1"
                >
                  <TiltCard className="bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between h-[95px] text-left hover:border-[#a78bfa]/20 transition-colors">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">NSE NODE</span>
                    <div className="flex items-center space-x-1.5 mt-2">
                      <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                      <span className="text-[11px] font-bold text-white font-mono">LIVE_200</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-2 block">Systems safe</span>
                  </TiltCard>
                </motion.div>

                {/* Interactive Reactive Bar Chart */}
                <motion.div
                  variants={downwardVariants}
                  custom={0.5}
                  animate={activeSection === 3 ? "active" : "inactive"}
                  className="col-span-3 bg-white/[0.01] border border-white/[0.05] p-4 rounded-xl text-left"
                >
                  <span className="text-[9px] uppercase tracking-wider text-[#a78bfa] font-mono block mb-2">PRO-FORMA EBITDA CASH FLOW GRAPH PROJECTION</span>
                  <div className="flex items-end justify-between h-[65px] px-2 pt-2 border-b border-white/10 font-mono text-[8px] text-slate-500">
                    {[1, 2, 3, 4, 5].map((yr) => {
                      const yrFlow = ebitdaVal * Math.pow(1 + growthVal, yr);
                      const maxFlow = ebitdaVal * Math.pow(1 + 0.40, 5); // max 40% growth
                      const pctHeight = Math.max(15, Math.min(100, (yrFlow / maxFlow) * 100));
                      return (
                        <div key={yr} className="flex flex-col items-center flex-1 space-y-1 mx-1.5 h-full justify-end">
                          <span className="text-[9px] text-[#a78bfa] font-bold mb-0.5">₹{(yrFlow / 100000).toFixed(0)}L</span>
                          <motion.div 
                            animate={{ height: `${pctHeight}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="w-full bg-gradient-to-t from-[#a78bfa]/20 to-[#a78bfa] rounded-t border border-[#a78bfa]/40 hover:to-[#34d399] transition-colors"
                            style={{ minHeight: "4px" }}
                          />
                          <span className="mt-1">YR0{yr}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 3. WACC Table sensitivities */}
                <motion.div 
                  variants={downwardVariants}
                  custom={0.6}
                  animate={activeSection === 3 ? "active" : "inactive"}
                  className="col-span-3"
                >
                  <TiltCard className="bg-slate-950/60 border border-white/[0.05] p-3 rounded-xl hover:border-[#60a5fa]/20 transition-colors">
                    <span className="text-[9px] uppercase tracking-wider text-[#a78bfa] font-mono block text-left mb-1.5">EBITDA sensitivity score table</span>
                    <table className="w-full font-mono text-[9px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500">
                          <th className="text-left pb-1 font-normal">WACC \ Mult</th>
                          <th className="text-right pb-1 font-normal">{multiplesList[0]}x</th>
                          <th className="text-right pb-1 font-normal font-bold text-slate-400">{multiplesList[1]}x</th>
                          <th className="text-right pb-1 font-normal">{multiplesList[2]}x</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waccList.map((w, idx) => (
                          <tr key={idx} className="border-b border-white/5">
                            <td className="text-left py-1 text-slate-400 font-bold">{w.toFixed(1)}%</td>
                            <td className="text-right py-1 text-slate-350">₹{calculateCellPrice(w, multiplesList[0]).toFixed(1)}</td>
                            <td className="text-right py-1 font-bold text-[#34d399]">₹{calculateCellPrice(w, multiplesList[1]).toFixed(1)}</td>
                            <td className="text-right py-1 text-slate-350">₹{calculateCellPrice(w, multiplesList[2]).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TiltCard>
                </motion.div>

              </div>
            </div>

          </div>
        </section>

          {/* ==========================================
          * SECTION 5: PRICING PLANS MATRIX
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
            style={{
              left: "100vw",
              top: "100vh",
              transform: `scale(${activeSection === 4 ? 1 : 0.92}) translateZ(${activeSection === 4 ? 0 : -80}px)`,
              filter: `blur(${activeSection === 4 ? 0 : 2}px)`,
              opacity: activeSection === 4 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
            
            {/* Left Panel: Description */}
            <motion.div 
              variants={alternatingLeftVariants}
              custom={0.1}
              animate={activeSection === 4 ? "active" : "inactive"}
              className="lg:col-span-4 text-left space-y-4"
            >
              <span className="terminal-badge">04. LICENSE DESK</span>
              <h2 className="text-3xl md:text-[48px] font-bold font-display text-white uppercase tracking-tight leading-none mt-4">
                Institutional Access Licensing
              </h2>
              <p className="text-white/50 text-base md:text-[20px] max-w-xl font-sans leading-relaxed mt-6">
                Unlock low-latency financial intelligence pipelines. Choose a tier matching your analytical bandwidth. All pricing models compile live NSE data.
              </p>

              <button
                onClick={() => setPricingTableOpen(!pricingTableOpen)}
                className="bg-transparent border border-[#a78bfa]/35 hover:border-[#a78bfa] text-[#a78bfa] hover:text-white transition-all font-mono text-[10px] uppercase tracking-wider px-5 py-2.5 rounded cursor-none"
              >
                {pricingTableOpen ? "[CLOSE COMPARE]" : "[COMPARE LICENSE FEATURES]"}
              </button>
            </motion.div>

            {/* Right Panel: 3D Holographic Pricing Desk */}
            <div className="lg:col-span-8 w-full relative overflow-visible">
              <PricingCoin />
            </div>

            {/* Detailed comparison table reveal popup */}
            <AnimatePresence>
              {pricingTableOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-x-0 inset-y-4 bg-slate-950/95 border border-white/10 rounded-2xl p-6 z-50 overflow-y-auto backdrop-blur-xl font-mono text-[10px] text-left select-text"
                >
                  <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4">
                    <span className="text-[12px] font-bold text-white tracking-widest uppercase">Institutional License comparison table [SYS_COMPARE]</span>
                    <button 
                      onClick={() => setPricingTableOpen(false)}
                      className="text-slate-400 hover:text-white font-mono bg-transparent border-none text-[11px] cursor-none"
                    >
                      [CLOSE_X]
                    </button>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500">
                        <th className="pb-2 text-left font-normal">CAPABILITY</th>
                        <th className="pb-2 text-center font-normal">CORE</th>
                        <th className="pb-2 text-center font-normal text-[#a78bfa] font-bold">PRO_NODE</th>
                        <th className="pb-2 text-center font-normal">ENTERPRISE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { name: "Live DCF recals", core: "Yes", pro: "Yes", ent: "Yes" },
                        { name: "NSE Websocket data", core: "Static", pro: "12ms Live", ent: "Dedicated 8ms" },
                        { name: "AI Co-pilot chats", core: "Limited", pro: "Unlimited", ent: "Unlimited + Fine-tuned" },
                        { name: "Spreadsheet exports", core: "No", pro: "Yes", ent: "Yes (Audited)" },
                        { name: "Dedicated host node", core: "No", pro: "No", ent: "Yes" }
                      ].map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-white/5 py-2">
                          <td className="py-2.5 text-slate-400 font-bold">{row.name}</td>
                          <td className="py-2.5 text-center text-slate-300">{row.core}</td>
                          <td className="py-2.5 text-center text-[#34d399] font-bold">{row.pro}</td>
                          <td className="py-2.5 text-center text-slate-300">{row.ent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

          {/* ==========================================
          * SECTION 6: ABOUT ROADMAP TIMELINE
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
            style={{
              left: "100vw",
              top: "200vh",
              transform: `scale(${activeSection === 5 ? 1 : 0.94}) skewX(${activeSection === 5 ? 0 : 3}deg)`,
              filter: `blur(${activeSection === 5 ? 0 : 2}px)`,
              opacity: activeSection === 5 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Founders Note & Storytelling */}
            <motion.div 
              variants={downwardVariants}
              custom={0.15}
              animate={activeSection === 5 ? "active" : "inactive"}
              className="lg:col-span-5 text-left space-y-4"
            >
              <span className="terminal-badge">05. STAGES ROADMAP</span>
              <h2 className="text-3xl md:text-[48px] font-bold font-display text-white uppercase tracking-tight leading-none mt-4">
                Hedge-Fund Engineering Roadmap
              </h2>
              <p className="text-white/50 text-base md:text-[20px] max-w-xl font-sans leading-relaxed mt-6">
                AnalystOS is forged by institutional quantitative designers. Our stages ensure zero-latency execution pipelines and audited mathematical logic.
              </p>
              
              <div className="border border-white/10 rounded-xl p-4 bg-[#0b0f19]/35 max-w-sm font-mono text-[10px] text-slate-400">
                <span className="text-white font-bold block mb-1">FOUNDER_LOG: v1.0.4</span>
                "We set out to replace cluttered terminal tools with a unified 3D workspace. AnalystOS bridges raw sockets and pro-forma DCF formulas in one seamless interface."
              </div>
            </motion.div>

            {/* Right Panel: Story Timeline Progressive Roadmap */}
            <div className="lg:col-span-7 w-full relative pl-8 select-none">
              
              {/* Vertical timeline vector bar */}
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#a78bfa] via-[#60a5fa] to-[#34d399]/40 opacity-30" />

              <div className="space-y-4">
                {[
                  {
                    stage: "STAGE_01",
                    title: "Live NSE Socket Gateways",
                    desc: "Establishing direct multicast TCP connections to the National Stock Exchange for sub-12ms raw market data delivery.",
                    accent: "text-[#a78bfa]",
                    border: "border-[#a78bfa]/20",
                    bullet: "bg-[#a78bfa]",
                    delay: 0.3
                  },
                  {
                    stage: "STAGE_02",
                    title: "EBITDA DCF Sensitivity Engine",
                    desc: "Compiling real-time pro-forma forecast metrics in WebAssembly. Instantly mapping multiples grids at 60 FPS.",
                    accent: "text-[#60a5fa]",
                    border: "border-[#60a5fa]/20",
                    bullet: "bg-[#60a5fa]",
                    delay: 0.45
                  },
                  {
                    stage: "STAGE_03",
                    title: "Hedge Fund REST/GraphQL APIs",
                    desc: "Deploying secure audited endpoints with built-in sandbox locks and fully compliant JWT authorization models.",
                    accent: "text-[#34d399]",
                    border: "border-[#34d399]/20",
                    bullet: "bg-[#34d399]",
                    delay: 0.6
                  }
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    variants={downwardVariants}
                    custom={step.delay}
                    animate={activeSection === 5 ? "active" : "inactive"}
                    className={`bg-[#0b0f19]/30 border ${step.border} p-4 rounded-xl text-left relative hover:bg-white/[0.03] transition-colors`}
                  >
                    {/* Timeline bullet node */}
                    <div className={`absolute -left-[25px] top-[18px] w-2.5 h-2.5 rounded-full ${step.bullet} border border-slate-950 shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
                    
                    <span className={`text-[9px] font-mono ${step.accent} font-bold uppercase`}>{step.stage}</span>
                    <h4 className="text-[13px] font-bold font-display text-white mt-1 uppercase">{step.title}</h4>
                    <p className="text-white/45 text-[10px] font-sans mt-1.5 leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>

            </div>

          </div>
        </section>

          {/* ==========================================
          * SECTION 7: FINAL CTA & LOCKED VALUATION VAULT
          * ========================================== */}
          <section 
            className="absolute w-screen h-screen overflow-hidden flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
            style={{
              left: "0vw",
              top: "200vh",
              transform: `scale(${activeSection === 6 ? 1 : 0.91}) rotate(${activeSection === 6 ? 0 : 2}deg) translateY(${activeSection === 6 ? 0 : 30}px)`,
              filter: `blur(${activeSection === 6 ? 0 : 2}px)`,
              opacity: activeSection === 6 ? 1 : 0.6,
              perspective: "1200px",
              transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Waitlist locker capture form */}
            <motion.div 
              variants={cardVariants}
              custom={0.15}
              animate={activeSection === 6 ? "active" : "inactive"}
              className="lg:col-span-6 text-left space-y-4"
            >
              {/* Interactive Padlock Vector */}
              <div className="flex justify-start mb-1 select-none">
                <motion.div
                  animate={vaultUnlocked ? { rotate: 360, scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center ${
                    vaultUnlocked ? "border-[#34d399] bg-[#34d399]/10 text-[#34d399]" : "border-white/10 bg-white/[0.02] text-slate-400"
                  }`}
                >
                  {vaultUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5 animate-pulse text-[#a78bfa]" />}
                </motion.div>
              </div>

              <span className="terminal-badge">06. SECURE LOCKER</span>
              <h2 className="text-3xl md:text-[48px] font-bold font-display text-white uppercase tracking-tight leading-none mt-4">
                Unlock Free Valuation Vault
              </h2>
              <p className="text-white/50 text-base md:text-[20px] max-w-xl font-sans leading-relaxed mt-6">
                Enter your email to instantly activate your waitlist credentials and unlock 5 high-density pro-forma spreadsheets and reference handbooks.
              </p>

              {/* Locker Waitlist capture form */}
              <TiltCard className="w-full mt-4">
                <div className="bg-white/[0.01] border border-white/[0.06] rounded-xl p-6 backdrop-blur-sm">
                  {vaultUnlocked ? (
                    <div className="text-center py-4 space-y-4 font-sans animate-fade-in">
                      <span className="inline-flex bg-[#34d399]/10 border border-[#34d399]/35 text-[#34d399] font-mono px-3 py-1.5 rounded text-xs font-bold select-all tracking-wide">
                        ✓ YOU'RE #{waitlistPosition || 248} ON THE WAITLIST
                      </span>
                      <p className="text-slate-400 text-xs font-sans">You have successfully activated your credentials and unlocked the Valuation Vault!</p>
                      
                      {referralCode && (
                        <div className="bg-slate-950/80 border border-white/5 rounded-lg p-3 space-y-1.5 mt-2">
                          <span className="text-[10px] text-slate-500 font-mono block uppercase">Share your referral link to move up:</span>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="text" 
                              readOnly 
                              value={`https://analystos-terminal.vercel.app/signup?ref=${referralCode}`}
                              className="w-full bg-transparent border-none text-[10px] text-[#a78bfa] font-mono select-all outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`https://analystos-terminal.vercel.app/signup?ref=${referralCode}`);
                                confetti({ particleCount: 30, spread: 40 });
                              }}
                              className="bg-white/5 hover:bg-white/10 text-white p-1.5 rounded transition-all cursor-none"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Spots Remaining Indicator */}
                      <div className="space-y-1.5 select-none">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>WAITLIST TARGET PROGRESS</span>
                          <span>ONLY 153 SPOTS REMAINING</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "84.7%" }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] rounded-full"
                          />
                        </div>
                      </div>

                      <form onSubmit={handleUnlockVault} className="space-y-3 font-sans">
                        <input
                          type="email"
                          placeholder="Enter operational email address"
                          value={vaultEmail}
                          onChange={(e) => setVaultEmail(e.target.value)}
                          required
                          className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-xs text-white placeholder-slate-650 outline-none focus:border-[#a78bfa] transition-colors cursor-none font-mono"
                        />
                        <MagneticButton
                          type="submit"
                          disabled={vaultLoading}
                          className="w-full bg-[#a78bfa] hover:bg-[#a78bfa]/90 disabled:bg-[#a78bfa]/40 text-[#020010] font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition-all flex items-center justify-center space-x-2 cursor-none font-sans"
                        >
                          {vaultLoading ? (
                            <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-[#020010] border-t-transparent" />
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unlock Institutional Vault</span>
                            </>
                          )}
                        </MagneticButton>
                      </form>

                      {/* Perk pills */}
                      <div className="flex flex-wrap gap-2 pt-2 select-none justify-center">
                        {["3 months Pro free", "40% lifetime discount", "Founding member badge"].map((perk, i) => (
                          <span key={i} className="inline-flex items-center space-x-1.5 border border-white/[0.05] bg-white/[0.01] px-2.5 py-1 rounded-full text-[9px] text-slate-400 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" />
                            <span>{perk}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TiltCard>
            </motion.div>

            {/* Right Panel: Vault items copy scorecard links list */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 6 ? "active" : "inactive"}
              className="lg:col-span-6 w-full"
            >
              <TiltCard className="w-full font-mono text-[11px] text-left bg-slate-950/60 border border-white/[0.05] p-5 rounded-2xl">
                <div className="space-y-3">
                  {[
                    {
                      id: "dcf_temp",
                      label: "01. Corporate DCF Model Template (.xlsx)",
                      text: "[AnalystOS Corporate DCF Model Template v1.2]\nSheet 1: assumptions\nWACC = 9.0% | Exit EBITDA Multiple = 14.0x\nEBITDA Growth Rate = 15.0% (Yr 1-3), 8.0% (Yr 4-5)\nImplied Enterprise Value = ₹18.54 Cr\nDownload URL: https://analystos.com/resources/AnalystOS_DCF_Valuation_Model.xlsx"
                    },
                    {
                      id: "excel_short",
                      label: "02. Wall Street Excel Keyboard Shortcuts Guide (.pdf)",
                      text: "[AnalystOS Excel Shortcuts Handbook]\n- Ctrl + [ : Trace precedents\n- F5 + Enter: Return to cell\n- Alt + E + S + V: Paste Special as Values\n- Alt + H + O + I: Autofit column widths"
                    },
                    {
                      id: "ratios_cheat",
                      label: "03. Financial Ratios & Valuation Cheat Sheet (.pdf)",
                      text: "[AnalystOS Formula Cheat Sheet]\n1. EV = Market Cap + Debt - Cash\n2. WACC = (E/V * Ke) + (D/V * Kd * (1 - Tax))\n3. Ke = Rf + Beta * (Rm - Rf) [CAPM]\n4. FCFF = EBIT*(1-T) + D&A - Capex - dNWC"
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                      <span className="text-slate-350">{item.label}</span>
                      {vaultUnlocked ? (
                        <button
                          onClick={() => copyToClipboard(item.id, item.text)}
                          className="bg-transparent border border-white/10 text-slate-300 hover:border-[#34d399] hover:text-[#34d399] font-bold px-3 py-1 rounded transition-all flex items-center space-x-1 font-sans text-[10px] cursor-none"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>COPY DATA</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center space-x-1 text-slate-500">
                          <Lock className="w-3 h-3 text-[#ff3860]" />
                          <span className="text-[9px] uppercase font-bold tracking-wider text-[#ff3860]/80">LOCKED</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* connection partner nodes ticket support */}
                <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
                  <button onClick={() => openHub("contact")} className="hover:text-[#a78bfa] cursor-none bg-transparent border-none uppercase tracking-wider">[Open Support connection Desk]</button>
                  <span>SYS_PING: 28ms</span>
                </div>
              </TiltCard>
            </motion.div>

          </div>

          {/* Premium Smooth Fade-in Footer Reveal */}
          <motion.footer 
            initial={{ opacity: 0, y: 15 }}
            animate={activeSection === 6 ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="absolute bottom-6 left-0 right-0 px-12 md:px-20 flex flex-col md:flex-row items-center justify-between text-[11px] font-mono text-slate-500 select-none pointer-events-auto border-t border-white/[0.03] pt-4"
          >
            <div className="flex items-center space-x-4 mb-2 md:mb-0">
              <span>© 2026 ANALYST.OS INC. ALL RIGHTS RESERVED.</span>
              <span className="text-white/10">|</span>
              <span className="text-[#34d399] tracking-wider uppercase font-bold">[SECURE FINANCIAL NODE SEC-17A]</span>
            </div>
            <div className="flex items-center space-x-6">
              <button type="button" onClick={() => openHub("terms")} className="hover:text-white transition-colors cursor-none bg-transparent border-none uppercase">[TERMS_OF_SERVICE]</button>
              <button type="button" onClick={() => openHub("privacy")} className="hover:text-white transition-colors cursor-none bg-transparent border-none uppercase">[PRIVACY_SAFEGUARDS]</button>
              <button type="button" onClick={() => openHub("about")} className="hover:text-white transition-colors cursor-none bg-transparent border-none uppercase">[FOUNDERS_NOTE]</button>
            </div>
          </motion.footer>
        </section>

      </motion.div>
    </main>

      {/* 7. Fullscreen sidebar hub overlay overlay */}
      <AnimatePresence>
        {infoHubActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 select-none"
            style={{ cursor: "none" }}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl relative"
            >
              {/* Close Hub button */}
              <button 
                onClick={() => setInfoHubActive(false)}
                className="absolute top-4 right-4 bg-transparent border border-white/10 hover:border-[#ff3860] hover:text-[#ff3860] text-slate-400 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-none"
              >
                ✕
              </button>

              {/* Sidebar directory links */}
              <div className="w-1/4 border-r border-white/10 bg-[#070b13] p-6 text-left flex flex-col justify-between font-mono text-xs">
                <div className="space-y-4">
                  <div className="text-slate-400 font-bold text-[10px] tracking-widest uppercase">System Directories</div>
                  <div className="flex flex-col space-y-2">
                    {[
                      { id: "home", label: "[0] TERMINAL.HOME" },
                      { id: "about", label: "[1] FOUNDERS_NOTE" },
                      { id: "contact", label: "[2] SUPPORT_DESK" },
                      { id: "changelog", label: "[3] RELEASES_HISTORY" },
                      { id: "privacy", label: "[4] PRIVACY_SAFEGUARDS" },
                      { id: "terms", label: "[5] LICENSE_TERMS" }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveHubTab(tab.id)}
                        className={`text-left transition-colors cursor-none ${
                          activeHubTab === tab.id ? 'text-[#a78bfa] font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 uppercase leading-relaxed font-mono">
                  <span>AnalystOS Terminal v1.0.4</span>
                </div>
              </div>

              {/* Content panels */}
              <div className="flex-1 p-8 text-left overflow-y-auto scrollbar-thin select-text">
                {activeHubTab === "home" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">AnalystOS Terminal Info Hub</h3>
                    <p className="text-slate-350 font-sans text-xs leading-relaxed">
                      AnalystOS was conceived with a simple yet powerful mission: to democratize institutional-grade financial analysis tools. For too long, young professional analysts, candidates, and students have been priced out of professional Bloomberg, FactSet, or Capital IQ subscriptions (which cost ₹2.5 lakh/year).
                    </p>
                    <p className="text-slate-350 font-sans text-xs leading-relaxed">
                      We bridges this gap by combining raw real-time data feeds, customizable pro-forma calculations, responsive WebGL 3D layers, and secure databases inside a high-contrast minimalist browser cockpit.
                    </p>
                  </div>
                )}

                {activeHubTab === "about" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">Why I Built AnalystOS</h3>
                    <div className="border-l-2 border-[#a78bfa] pl-4 italic text-slate-350 text-xs font-sans">
                      "While learning DCF valuation, equity research, and financial modeling, I realized most tools were built for professionals. AnalystOS is my attempt to make institutional-grade research accessible to anyone willing to learn."
                    </div>
                  </div>
                )}

                {activeHubTab === "contact" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">Operational support ticket desk</h3>
                    {contactRef ? (
                      <div className="bg-[#34d399]/10 border border-[#34d399]/35 text-[#34d399] p-4 rounded font-mono text-xs space-y-1 animate-pulse">
                        <div className="font-bold">TICKET_RESOLVED: OK</div>
                        <div>Your ticket support index ref is {contactRef}. Connecting partners desk response queued.</div>
                      </div>
                    ) : (
                      <form onSubmit={handleContactSubmit} className="space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-500 block mb-1">Your Name</label>
                            <input
                              type="text"
                              value={contactName}
                              onChange={e => setContactName(e.target.value)}
                              required
                              className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-[#a78bfa] cursor-none"
                            />
                          </div>
                          <div>
                            <label className="text-slate-500 block mb-1">Operational Email</label>
                            <input
                              type="email"
                              value={contactEmail}
                              onChange={e => setContactEmail(e.target.value)}
                              required
                              className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-[#a78bfa] cursor-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-slate-500 block mb-1">Connection Segment</label>
                          <select
                            value={contactFirm}
                            onChange={e => setContactFirm(e.target.value)}
                            className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-[#a78bfa] cursor-default"
                          >
                            <option value="student">Student / CFA Candidate</option>
                            <option value="analyst">Buy-side or Sell-side Analyst</option>
                            <option value="partner">Corporate Partner Desk</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-500 block mb-1">Operational Message</label>
                          <textarea
                            rows={4}
                            value={contactMsg}
                            onChange={e => setContactMsg(e.target.value)}
                            required
                            className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-[#a78bfa] cursor-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={contactLoading}
                          className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold px-4 py-2 rounded transition-colors uppercase cursor-none"
                        >
                          {contactLoading ? "SUBMITTING_TICKET..." : "SUBMIT CONNECTION TICKET"}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {activeHubTab === "changelog" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">Operational Releases Index</h3>
                    <div className="font-mono text-xs space-y-4 leading-relaxed text-slate-350">
                      <div>
                        <span className="text-[#34d399] font-bold">RELEASE: v1.0.4 [2026-05-31]</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Replaced the static 3D globe with a custom 120-particle WebGL interactive horizontal-snapping environment.</li>
                          <li>Integrated spring cursor coordinates with dual-ring spring settings (stiffness 120, damping 18).</li>
                          <li>Constructed the 5 horizontal snapping sections (Hero, Features Grid, DCF Assumptions, Tech Stack, Vault Locker).</li>
                          <li>Deactivated movie intro overlays to prevent loading latency.</li>
                        </ul>
                      </div>
                      <div>
                        <span className="text-[#60a5fa] font-bold">RELEASE: v1.0.1 [2026-05-18]</span>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>Connected NSE market data pipelines directly to pro-forma sensitivities.</li>
                          <li>Linked waitlist lockers with Supabase database integrations.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeHubTab === "privacy" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">Privacy Safeguards</h3>
                    <p className="text-slate-350 font-sans text-xs leading-relaxed">
                      At AnalystOS, we prioritize the protection and security of your financial and personal data. We utilize enterprise-grade security structures through **Supabase PostgreSQL** and **Vercel** hosting platforms.
                    </p>
                  </div>
                )}

                {activeHubTab === "terms" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase">License Terms</h3>
                    <p className="text-slate-350 font-sans text-xs leading-relaxed">
                      Please read these terms carefully before accessing the AnalystOS terminal workspace. By creating an account, you agree to comply with these terms.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Lite Redirect Banner */}
      <AnimatePresence>
        {isMobileDevice && showMobileBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-4 right-4 md:hidden border border-[#a78bfa]/25 bg-[#0b0f19]/95 p-4 rounded-xl text-[10px] font-mono select-none text-left space-y-1.5 backdrop-blur-md z-[100] shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-between items-center">
              <span className="text-[#a78bfa] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
                <span>[MOBILE_DETECTOR: ON-THE-GO_VIEW]</span>
              </span>
              <button 
                onClick={() => setShowMobileBanner(false)}
                className="text-slate-500 hover:text-white cursor-none font-bold bg-transparent border-none animate-none p-0"
              >
                [X]
              </button>
            </div>
            <p className="text-slate-400 text-[9px] font-sans">We detected a mobile device. Switch to AnalystOS Mobile Lite for an optimized touchscreen terminal experience.</p>
            <Link href="/mobile" className="inline-block text-[#34d399] hover:text-[#34d399]/85 uppercase mt-1 cursor-none font-bold">
              ⚡ LAUNCH MOBILE LITE CONSOLE &gt;&gt;
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cmd+K Command Center HUD Overlay */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-6 select-none"
            onClick={() => setCommandPaletteOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-[#070b13]/95 border border-[#a78bfa]/20 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85),_inset_0_0_20px_rgba(255,255,255,0.01)] relative space-y-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Command className="w-4 h-4 text-[#a78bfa] animate-pulse" />
                  <span className="font-bold">ANALYST_OS_COMMAND_CONSOLE</span>
                </div>
                <span className="text-[9px] bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 px-2 py-0.5 rounded font-mono font-bold">[ESC TO CLOSE]</span>
              </div>

              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search layout, pricing, auth, or jump sections (e.g. sandbox, pricing, login)..."
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      executeCommand(commandQuery);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 text-xs bg-slate-950/80 border border-white/10 focus:outline-none focus:border-[#a78bfa]/40 rounded-xl text-white font-mono placeholder:text-slate-600 outline-none"
                />
              </div>

              {/* Categories & options list */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">Jump to Section</span>
                  {[
                    { name: "01. Cockpit Hero Desk", desc: "Jump to Cockpit preview", cmd: "hero" },
                    { name: "02. Wireframe Globe", desc: "Jump to 3D Globe section", cmd: "globe" },
                    { name: "03. Features Specifications", desc: "Jump to Features specs grid", cmd: "features" },
                    { name: "04. Sensitivities Sandbox", desc: "Jump to DCF model recalculator", cmd: "sandbox" },
                    { name: "05. Subscription Tiers", desc: "Jump to pricing modules", cmd: "pricing" },
                    { name: "06. Roadmap Progress", desc: "Jump to development timeline", cmd: "roadmap" },
                    { name: "07. Secure Database Locker", desc: "Jump to gate credentials locker", cmd: "vault" },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeCommand(item.cmd)}
                      className="w-full text-left p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/[0.04] transition-all flex items-center justify-between text-slate-400 hover:text-white cursor-none bg-transparent"
                    >
                      <span className="font-mono text-[#a78bfa]">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono pl-1">Gateway Operations</span>
                  {[
                    { name: "Launch Terminal Console (Founder)", desc: "Direct dashboard access with full PRO privileges", cmd: "founder" },
                    { name: "Launch Mobile Lite Terminal", desc: "Go to touchscreen-optimized console", cmd: "mobile" },
                    { name: "Verification Gateway", desc: "Go to Sign In credentials validation", cmd: "login" },
                    { name: "Registration Port", desc: "Go to Sign Up subscriptions", cmd: "signup" },
                    { name: "Restart Site Onboarding Tour", desc: "Start guided overview", cmd: "tour" },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => executeCommand(item.cmd)}
                      className="w-full text-left p-2 rounded-lg hover:bg-[#34d399]/5 border border-transparent hover:border-[#34d399]/20 transition-all flex items-center justify-between text-slate-400 hover:text-white cursor-none bg-transparent"
                    >
                      <span className="font-mono text-[#34d399] font-bold">{item.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tour Guide Overlay */}
      <AnimatePresence>
        {tourActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 max-w-sm w-full bg-[#0b0f19]/95 border border-[#a78bfa]/25 p-6 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.02)] z-[90] text-left backdrop-blur-md font-mono text-xs"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-[#a78bfa] font-bold tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#a78bfa] animate-pulse" />
                  <span>LANDING_TOUR ({tourStep}/4)</span>
                </span>
                <button 
                  onClick={() => setTourActive(false)} 
                  className="text-slate-500 hover:text-white text-[9px] cursor-none border-none bg-transparent"
                >
                  [SKIP_TOUR]
                </button>
              </div>

              <div className="space-y-2">
                {tourStep === 1 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">1. SEC-COMPLIANT TERMINAL COCKPIT</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      This interactive preview simulates high-speed network scans, ratio calculations, and valuation matrices in real-time. It displays the raw power of AnalystOS.
                    </p>
                  </div>
                )}

                {tourStep === 2 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">2. THREE.JS 3D GLOBAL INTELLIGENCE GLOBE</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Visualize global capital flows, server metrics, and macro signals on our customized WebGL globe. Drag or scroll to orbit and inspect live NSE server nodes.
                    </p>
                  </div>
                )}

                {tourStep === 3 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">3. INTERACTIVE DCF MODEL SANDBOX</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Drag discount rates and Perpetual Growth parameters to watch valuation multiples and equity fair value update instantly with zero latency.
                    </p>
                  </div>
                )}

                {tourStep === 4 && (
                  <div className="space-y-2">
                    <h4 className="text-white text-xs font-bold font-mono">4. KEYBOARD SHORTCUT COMMAND BAR</h4>
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      Press <strong>Cmd+K</strong> or <strong>Ctrl+K</strong> anywhere on the platform to summon the Command Console. Navigate, search tickers, or jump workspaces instantly.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-white/5 font-mono text-[10px]">
                <button
                  disabled={tourStep === 1}
                  onClick={() => {
                    const nextStep = tourStep - 1;
                    setTourStep(nextStep);
                    if (nextStep === 1) scrollToSection(0);
                    if (nextStep === 2) scrollToSection(1);
                    if (nextStep === 3) scrollToSection(3);
                  }}
                  className="text-slate-500 hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 cursor-none bg-transparent border-none"
                >
                  &lt; PREV
                </button>
                {tourStep < 4 ? (
                  <button
                    onClick={() => {
                      const nextStep = tourStep + 1;
                      setTourStep(nextStep);
                      if (nextStep === 1) scrollToSection(0);
                      if (nextStep === 2) scrollToSection(1);
                      if (nextStep === 3) scrollToSection(3);
                    }}
                    className="text-[#a78bfa] hover:text-white font-bold cursor-none bg-transparent border-none"
                  >
                    NEXT &gt;
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setTourActive(false);
                      localStorage.setItem("aos_landing_tour_completed", "true");
                    }}
                    className="text-[#34d399] hover:text-white font-bold cursor-none bg-transparent border-none"
                  >
                    [COMPLETE_TOUR]
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Tour Invite Card */}
      <AnimatePresence>
        {showTourInvite && !tourActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 max-w-sm w-full bg-[#0b0f19]/95 border border-[#34d399]/25 p-6 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),_inset_0_0_10px_rgba(255,255,255,0.02)] z-[90] text-left backdrop-blur-md font-mono text-xs"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-[10px] text-[#34d399] font-bold tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#34d399] animate-pulse" />
                  <span>SYSTEM_INTRO: TOUR_AVAILABLE</span>
                </span>
                <button 
                  onClick={() => {
                    setShowTourInvite(false);
                    localStorage.setItem("aos_landing_tour_completed", "true");
                  }} 
                  className="text-slate-500 hover:text-white text-[9px] cursor-none border-none bg-transparent"
                >
                  [DISMISS]
                </button>
              </div>
              <p className="text-slate-400 font-sans text-xs leading-relaxed">
                Welcome to the <strong>AnalystOS Cockpit</strong>. Would you like a quick 4-step tour to guide you through the interactive DCF sandbox, 3D globe servers, and keyboard shortcuts?
              </p>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowTourInvite(false);
                    setTourActive(true);
                    setTourStep(1);
                    scrollToSection(0);
                  }}
                  className="flex-1 bg-[#34d399] hover:bg-[#34d399]/85 text-[#020010] font-bold py-2 rounded text-center cursor-none border-none transition-all"
                >
                  START QUICK TOUR
                </button>
                <button
                  onClick={() => {
                    setShowTourInvite(false);
                    localStorage.setItem("aos_landing_tour_completed", "true");
                  }}
                  className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white rounded cursor-none bg-transparent transition-all"
                >
                  SKIP
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      {showIntro && (
        <CinematicIntro
          onFadeInLanding={handleFadeInLanding}
          onComplete={handleIntroComplete}
        />
      )}
    </div>
  );
}
