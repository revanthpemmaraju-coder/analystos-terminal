/* eslint-disable */
"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Terminal, Shield, ArrowRight, Lock, Unlock, Copy, Check, 
  ExternalLink, Search, BarChart3, LineChart, Cpu, BookOpen, 
  DollarSign, FileText, ChevronRight, RefreshCw, Send, CheckSquare,
  Sparkles, Plus, Award, TrendingUp, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import TickerBar from "@/components/ticker-bar";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";

const formatIndianCurrency = (num: number) => {
  if (num >= 10000000) {
    return '₹' + (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return '₹' + (num / 100000).toFixed(2) + ' Lakh';
  }
  return '₹' + num.toLocaleString('en-IN');
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

export default function LandingPage() {
  // Navigation countdown target date (June 14, 2026)
  const [countdown, setCountdown] = useState("");
  const LAUNCH_DATE = new Date("2026-06-14T09:00:00+05:30");

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
  
  // Horizontal Scroll Snapping States
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(1);
  const [clientWidth, setClientWidth] = useState(1);

  const activeSection = Math.round(scrollLeft / (clientWidth || 1));
  const scrollProgress = scrollLeft / (scrollWidth - clientWidth || 1);

  const handleScrollEvent = () => {
    if (scrollRef.current) {
      setScrollLeft(scrollRef.current.scrollLeft);
      setScrollWidth(scrollRef.current.scrollWidth);
      setClientWidth(scrollRef.current.clientWidth);
    }
  };

  const scrollToSection = (idx: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: idx * window.innerWidth,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", handleScrollEvent);
      // Initialize dimensions
      setTimeout(() => {
        setScrollLeft(el.scrollLeft);
        setScrollWidth(el.scrollWidth);
        setClientWidth(el.clientWidth);
      }, 500);
    }
    return () => el?.removeEventListener("scroll", handleScrollEvent);
  }, []);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // Pulse core
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds: { freq: number; phase: number }[] = [];
    const coreRadius = 85;

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      particlePositions[i * 3] = coreRadius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = coreRadius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = coreRadius * Math.cos(phi);
      particleSpeeds.push({
        freq: Math.random() * 2 + 1,
        phase: Math.random() * Math.PI * 2
      });
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 3.0,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const aiSphereParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(aiSphereParticles);

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
    };

    window.addEventListener("mousemove", handleMouseMove);

    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.1);

      // Scroll progress mapping (horizontally scrolls camera Z position from 600 down to 350)
      const currentScrollLeft = scrollRef.current ? scrollRef.current.scrollLeft : 0;
      const currentScrollWidth = scrollRef.current ? scrollRef.current.scrollWidth : 1;
      const currentClientWidth = scrollRef.current ? scrollRef.current.clientWidth : 1;
      const currProgress = currentScrollLeft / (currentScrollWidth - currentClientWidth || 1);
      
      // Update camera position Z over the horizontal snap coordinates
      camera.position.z = 600 - currProgress * (600 - 350);

      // Oscillations
      particles.forEach(p => {
        const theta = (time + p.timeOffset) * (Math.PI * 2 / p.duration);
        p.mesh.position.y = p.baseY + Math.sin(theta) * p.amplitude;
      });

      // Connections
      connections.forEach(c => {
        const posA = c.p1.mesh.position;
        const posB = c.p2.mesh.position;
        const dir = new THREE.Vector3().subVectors(posB, posA);
        const len = dir.length();
        c.mesh.scale.set(1, len, 1);
        const mid = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
        c.mesh.position.copy(mid);
        dir.normalize();
        const align = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(align, dir);
        c.mesh.quaternion.copy(quat);
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

      // Globe centerpiece
      globeGroup.rotation.y = time * 0.05;
      globeGroup.rotation.x = time * 0.02;

      const positionsArr = aiSphereParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const x = positionsArr[i * 3];
        const y = positionsArr[i * 3 + 1];
        const z = positionsArr[i * 3 + 2];
        const length = Math.sqrt(x*x + y*y + z*z);
        if (length === 0) continue;
        const nx = x / length;
        const ny = y / length;
        const nz = z / length;
        const speed = particleSpeeds[i];
        const pulseFactor = 85 + Math.sin(time * speed.freq + speed.phase) * 4.5;
        positionsArr[i * 3] = nx * pulseFactor;
        positionsArr[i * 3 + 1] = ny * pulseFactor;
        positionsArr[i * 3 + 2] = nz * pulseFactor;
      }
      aiSphereParticles.geometry.attributes.position.needsUpdate = true;
      aiSphereParticles.rotation.y = -time * 0.03;
      aiSphereParticles.rotation.z = time * 0.01;

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
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Parallax mouse effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseParallax = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseParallax);
    return () => window.removeEventListener("mousemove", handleMouseParallax);
  }, []);

  // Premium Custom Spring Cursor coordinates
  const [isHovered, setIsHovered] = useState(false);
  const mouseCursorX = useMotionValue(-100);
  const mouseCursorY = useMotionValue(-100);
  const cursorRingX = useSpring(mouseCursorX, { stiffness: 120, damping: 18 });
  const cursorRingY = useSpring(mouseCursorY, { stiffness: 120, damping: 18 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      mouseCursorX.set(e.clientX);
      mouseCursorY.set(e.clientY);
    };
    const handleHoverTarget = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      if (
        target.tagName === "BUTTON" || 
        target.tagName === "A" || 
        target.closest("button") || 
        target.closest("a") || 
        target.classList.contains("clickable")
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };
    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleHoverTarget);
    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleHoverTarget);
    };
  }, []);

  // Sidebar commands hub panel
  const [infoHubActive, setInfoHubActive] = useState(false);
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
  const [vaultEmail, setVaultEmail] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultEmail) return;
    setVaultLoading(true);
    try {
      await supabase.from("waitlist").insert([{ email: vaultEmail, segment: "lead_magnet_locker" }]);
    } catch (err) {
      console.warn("Bypassed database waitlist insert: ", err);
    }
    setTimeout(() => {
      setVaultLoading(false);
      setVaultUnlocked(true);
    }, 1200);
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

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#020010] text-slate-100 font-sans selection:bg-[#a78bfa]/30 selection:text-white relative">
      
      {/* Parallax Layer 1: Ambient Glow Orbs (Deep Background - 0.25x Speed) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ transform: `translateX(${-scrollLeft * 0.25}px)`, transition: "transform 0.1s ease-out" }}
      >
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#a78bfa] opacity-[0.12] blur-[120px]" style={{ left: "60vw", top: "20vh" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[#60a5fa] opacity-[0.09] blur-[150px]" style={{ left: "170vw", top: "60vh" }} />
        <div className="absolute w-[450px] h-[450px] rounded-full bg-[#34d399] opacity-[0.08] blur-[130px]" style={{ left: "280vw", top: "15vh" }} />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] opacity-[0.11] blur-[140px]" style={{ left: "390vw", top: "50vh" }} />
      </div>

      {/* Parallax Layer 2: Technical Grid Vector (Midground - 0.18x Speed) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{ transform: `translateX(${-scrollLeft * 0.18}px)`, transition: "transform 0.1s ease-out" }}
      >
        <div className="absolute inset-y-0 w-[500vw] opacity-[0.03]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      </div>

      {/* Parallax Layer 3: Foreground Dust Particles (Floating Overlay - 0.05x Speed) */}
      <div 
        className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
        style={{ transform: `translateX(${-scrollLeft * 0.05}px)`, transition: "transform 0.1s ease-out" }}
      >
        <div className="absolute text-[#a78bfa]/20 font-mono text-sm" style={{ left: "110vw", top: "25vh" }}>+</div>
        <div className="absolute text-[#60a5fa]/20 font-mono text-sm" style={{ left: "215vw", top: "75vh" }}>+</div>
        <div className="absolute text-[#34d399]/20 font-mono text-sm" style={{ left: "320vw", top: "30vh" }}>+</div>
        <div className="absolute text-[#a78bfa]/20 font-mono text-sm" style={{ left: "425vw", top: "80vh" }}>+</div>
      </div>

      {/* 1. Spring Custom double-ring mouse cursor */}
      <div className="hidden md:block">
        <motion.div
          className="fixed top-0 left-0 w-3 h-3 bg-[#a78bfa] rounded-full pointer-events-none z-[9999]"
          style={{
            x: mouseCursorX,
            y: mouseCursorY,
            translateX: "-50%",
            translateY: "-50%",
            scale: isHovered ? 0.66 : 1,
          }}
        />
        <motion.div
          className="fixed top-0 left-0 w-10 h-10 border border-[#a78bfa] border-opacity-40 rounded-full pointer-events-none z-[9999]"
          style={{
            x: cursorRingX,
            y: cursorRingY,
            translateX: "-50%",
            translateY: "-50%",
            scale: isHovered ? 1.5 : 1,
          }}
        />
      </div>

      {/* 2. WebGL Three.js Scene container centered globally behind */}
      <div 
        ref={canvasContainerRef} 
        id="hero-canvas-container" 
        className="fixed inset-0 z-0 pointer-events-none" 
        style={{
          transform: `translateX(${-scrollLeft * 0.12}px)` // Parallax horizontal offset
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
            { label: "Work", index: 1 },
            { label: "Studio", index: 2 },
            { label: "Lab", index: 3 },
            { label: "Contact", index: 4 }
          ].map(link => (
            <button
              key={link.label}
              onClick={() => {
                if (link.label === "Contact") openHub("contact");
                else scrollToSection(link.index);
              }}
              className="text-[13px] uppercase tracking-[0.08em] text-white/55 hover:text-[#a78bfa] transition-colors font-sans font-normal cursor-none bg-transparent border-none"
            >
              {link.label}
            </button>
          ))}
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
        {[0, 1, 2, 3, 4].map((idx) => {
          const isActive = activeSection === idx;
          return (
            <button
              key={idx}
              onClick={() => scrollToSection(idx)}
              className={`w-3 h-3 rounded-full border transition-all duration-300 relative group cursor-none bg-transparent`}
              style={{
                borderColor: isActive ? "#a78bfa" : "rgba(255,255,255,0.2)",
                backgroundColor: isActive ? "#a78bfa" : "transparent",
              }}
            >
              <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/90 border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-slate-400">
                {idx === 0 && "01. HERO COCKPIT"}
                {idx === 1 && "02. FEATURE GRID"}
                {idx === 2 && "03. DCF RECALCULATOR"}
                {idx === 3 && "04. DESIGN STACK"}
                {idx === 4 && "05. ASSETS LOCKER"}
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

      {/* 6. MAIN HORIZONTAL SNAP CONTAINER */}
      <main 
        ref={scrollRef}
        className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth w-full h-full scrollbar-none relative z-10"
      >
        
        {/* ==========================================
        * SECTION 1: HERO COCKPIT
        * ========================================== */}
        <section 
          className="w-screen h-screen flex-shrink-0 snap-start overflow-hidden relative flex flex-col items-center justify-center px-8 md:px-16 pt-16 transition-all duration-1000"
          style={{
            transform: `scale(${activeSection === 0 ? 1 : 0.97})`,
            filter: `blur(${activeSection === 0 ? 0 : 2}px)`,
            opacity: activeSection === 0 ? 1 : 0.6,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center">
            
            {/* Headline 1 (Masked Text Reveal) */}
            <div className="overflow-hidden mb-1">
              <motion.h1 
                variants={headingVariants}
                custom={0}
                animate={activeSection === 0 ? "active" : "inactive"}
                className="text-5xl md:text-[85px] font-extrabold tracking-tight text-white font-display uppercase leading-none select-none"
              >
                Analyze beyond
              </motion.h1>
            </div>

            {/* Headline 2 (Masked Text Reveal) */}
            <div className="overflow-hidden mb-6">
              <motion.h1 
                variants={headingVariants}
                custom={0.1}
                animate={activeSection === 0 ? "active" : "inactive"}
                className="text-5xl md:text-[85px] font-extrabold tracking-tight figma-gradient-text font-display uppercase leading-none select-none mt-1"
              >
                intelligence
              </motion.h1>
            </div>

            {/* Subtext */}
            <motion.p 
              variants={textVariants}
              custom={0.2}
              animate={activeSection === 0 ? "active" : "inactive"}
              className="text-white/45 text-sm md:text-base font-sans font-normal max-w-[420px] leading-[1.7] mb-8 mx-auto"
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
              <Link 
                href="/signup" 
                className="bg-[#a78bfa] hover:bg-[#a78bfa]/80 text-[#020010] font-bold text-xs md:text-[14px] uppercase tracking-wider px-8 py-3.5 rounded-full transition-all shadow-[0_0_30px_rgba(167,139,250,0.3)] flex items-center justify-center space-x-2 cursor-none"
              >
                <span>Launch AnalystOS</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button 
                onClick={() => scrollToSection(1)}
                className="bg-transparent border border-white/20 hover:border-[#a78bfa] hover:text-white text-white/70 text-xs md:text-[14px] uppercase tracking-wider px-8 py-3.5 rounded-full transition-all cursor-none"
              >
                View Features
              </button>
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

          </div>
        </section>

        {/* ==========================================
        * SECTION 2: FEATURE GRID & STAT CARDS
        * ========================================== */}
        <section 
          className="w-screen h-screen flex-shrink-0 snap-start overflow-hidden relative flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
          style={{
            transform: `scale(${activeSection === 1 ? 1 : 0.97})`,
            filter: `blur(${activeSection === 1 ? 0 : 2}px)`,
            opacity: activeSection === 1 ? 1 : 0.6,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Description and Chat Terminal Cockpit */}
            <motion.div 
              variants={cardVariants}
              custom={0.15}
              animate={activeSection === 1 ? "active" : "inactive"}
              className="lg:col-span-7 text-left space-y-4"
            >
              <span className="terminal-badge">02. FEATURES GRIDS</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white uppercase tracking-tight leading-none mt-2">
                Unified Analytical Cockpit
              </h2>
              <p className="text-white/45 text-xs max-w-md font-sans leading-relaxed">
                Interact with high-performance dashboards, stock margin predictions, and secure databases. Our co-pilot chats directly with local NSE servers.
              </p>

              {/* Chat terminal widget cockpit */}
              <div className="w-full bg-[#0b0f19]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl font-mono text-xs mt-4">
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
                    <div className="text-[#a78bfa] animate-pulse text-[11px]">{">>>"} PARSING PIPELINE ASSUMPTIONS...</div>
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
            </motion.div>

            {/* Right Panel: The 4 Figma stat cards floating 2x2 grid */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 1 ? "active" : "inactive"}
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
        * SECTION 3: METRICS 2×3 DCF SANDBOX
        * ========================================== */}
        <section 
          className="w-screen h-screen flex-shrink-0 snap-start overflow-hidden relative flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
          style={{
            transform: `scale(${activeSection === 2 ? 1 : 0.97})`,
            filter: `blur(${activeSection === 2 ? 0 : 2}px)`,
            opacity: activeSection === 2 ? 1 : 0.6,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: The DCF assumptions sliders */}
            <motion.div 
              variants={cardVariants}
              custom={0.15}
              animate={activeSection === 2 ? "active" : "inactive"}
              className="lg:col-span-5 text-left space-y-4"
            >
              <span className="terminal-badge">03. METRICS SANDBOX</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white uppercase tracking-tight leading-none mt-2">
                Live DCF Model Recalculator
              </h2>
              <p className="text-white/45 text-xs max-w-md font-sans leading-relaxed">
                Recalculate implied valuations instantly. Drag assumptions sliders to update sensitivities and fair values.
              </p>

              {/* Slider form cards */}
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
            </motion.div>

            {/* Right Panel: Metrics 2x3 Grid */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 2 ? "active" : "inactive"}
              className="lg:col-span-7 w-full"
            >
              <div className="grid grid-cols-3 gap-3">
                
                {/* 1. Implied Price Card */}
                <div className="col-span-2 bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between h-[95px] text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">DCF Intrinsic Fair Price</span>
                  <span className="text-2xl font-bold font-display text-white">₹{impliedSharePrice.toFixed(2)}</span>
                  <span className="text-[10px] text-[#34d399] font-mono font-medium">Implied Value per Share</span>
                </div>

                {/* 2. NSE status node */}
                <div className="col-span-1 bg-white/[0.02] border border-white/[0.08] p-4 rounded-xl flex flex-col justify-between h-[95px] text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">NSE NODE</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
                    <span className="text-[11px] font-bold text-white font-mono">LIVE_200</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Systems safe</span>
                </div>

                {/* 3. WACC Table sensitivities */}
                <div className="col-span-3 bg-slate-950/60 border border-white/[0.05] p-3 rounded-xl">
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
                </div>

              </div>
            </motion.div>

          </div>
        </section>

        {/* ==========================================
        * SECTION 4: DESIGN STACK 2×2 GRID
        * ========================================== */}
        <section 
          className="w-screen h-screen flex-shrink-0 snap-start overflow-hidden relative flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
          style={{
            transform: `scale(${activeSection === 3 ? 1 : 0.97})`,
            filter: `blur(${activeSection === 3 ? 0 : 2}px)`,
            opacity: activeSection === 3 ? 1 : 0.6,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Description */}
            <motion.div 
              variants={cardVariants}
              custom={0.15}
              animate={activeSection === 3 ? "active" : "inactive"}
              className="lg:col-span-5 text-left space-y-4"
            >
              <span className="terminal-badge">04. STACK SPECS</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white uppercase tracking-tight leading-none mt-2">
                High-Fidelity Technology Stack
              </h2>
              <p className="text-white/45 text-xs max-w-md font-sans leading-relaxed">
                The visual frameworks that compile our 3D-first terminal workspace, engineered for zero-latency graphics and fluid responsive layouts.
              </p>
            </motion.div>

            {/* Right Panel: 2x2 Grid Stack Cards */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 3 ? "active" : "inactive"}
              className="lg:col-span-7 w-full"
            >
              <div className="grid grid-cols-2 gap-4">
                
                {/* 1. Figma Card */}
                <div className="bg-white/[0.02] border border-white/[0.08] p-5 rounded-2xl text-left hover:border-[#a78bfa]/25 transition-all">
                  <span className="text-[10px] font-mono text-[#a78bfa] uppercase">Figma · Design System</span>
                  <h4 className="text-lg font-bold font-display text-white uppercase mt-2">AnalystOS</h4>
                  <p className="text-white/40 text-[11px] font-sans mt-1 leading-relaxed">
                    Auto Layout grid grids, rich near-black `#020010` backdrops, violet, electric blue, and emerald accents.
                  </p>
                </div>

                {/* 2. Framer Card */}
                <div className="bg-white/[0.02] border border-white/[0.08] p-5 rounded-2xl text-left hover:border-[#60a5fa]/25 transition-all">
                  <span className="text-[10px] font-mono text-[#60a5fa] uppercase">Framer · Snap Motion</span>
                  <h4 className="text-lg font-bold font-display text-white uppercase mt-2">Spring Physics</h4>
                  <p className="text-white/40 text-[11px] font-sans mt-1 leading-relaxed">
                    Smooth horizontal snapping curves (stiffness 80, damping 18), scroll progress tracking, and spring coordinates cursor.
                  </p>
                </div>

                {/* 3. Spline Card */}
                <div className="bg-white/[0.02] border border-white/[0.08] p-5 rounded-2xl text-left hover:border-[#34d399]/25 transition-all">
                  <span className="text-[10px] font-mono text-[#34d399] uppercase">Spline · WebGL Scene</span>
                  <h4 className="text-lg font-bold font-display text-white uppercase mt-2">3D Depth Parallax</h4>
                  <p className="text-white/40 text-[11px] font-sans mt-1 leading-relaxed">
                    120 oscillating colored spheres, fog at 1200, 60 real-time cylinder connections, camera mouse springs tilts and Z zoom.
                  </p>
                </div>

                {/* 4. Jitter Card */}
                <div className="bg-white/[0.02] border border-white/[0.08] p-5 rounded-2xl text-left hover:border-[#ffdd57]/25 transition-all">
                  <span className="text-[10px] font-mono text-[#ffdd57] uppercase">Jitter · Opening sequences</span>
                  <h4 className="text-lg font-bold font-display text-white uppercase mt-2">CRT Scanlines</h4>
                  <p className="text-white/40 text-[11px] font-sans mt-1 leading-relaxed">
                    Masked letter-by-letter header reveals, motion blurred suffix enterings, and linear CRT scan sweeps.
                  </p>
                </div>

              </div>
            </motion.div>

          </div>
        </section>

        {/* ==========================================
        * SECTION 5: FINAL CTA & LOCKED VALUATION VAULT
        * ========================================== */}
        <section 
          className="w-screen h-screen flex-shrink-0 snap-start overflow-hidden relative flex items-center justify-center px-12 md:px-20 pt-16 transition-all duration-1000"
          style={{
            transform: `scale(${activeSection === 4 ? 1 : 0.97})`,
            filter: `blur(${activeSection === 4 ? 0 : 2}px)`,
            opacity: activeSection === 4 ? 1 : 0.6,
            transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), filter 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Panel: Waitlist locker capture form */}
            <motion.div 
              variants={cardVariants}
              custom={0.15}
              animate={activeSection === 4 ? "active" : "inactive"}
              className="lg:col-span-6 text-left space-y-4"
            >
              <span className="terminal-badge">05. SECURE LOCKER</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-white uppercase tracking-tight leading-none mt-2">
                Unlock Free Valuation Vault
              </h2>
              <p className="text-white/45 text-xs max-w-md font-sans leading-relaxed">
                Enter your email to instantly activate your waitlist credentials and unlock 5 high-density pro-forma spreadsheets and reference handbooks.
              </p>

              {/* Locker Waitlist capture form */}
              <div className="bg-white/[0.01] border border-white/[0.06] rounded-xl p-6 backdrop-blur-sm mt-4">
                {vaultUnlocked ? (
                  <div className="text-center py-4 space-y-2">
                    <span className="inline-flex bg-[#34d399]/10 border border-[#34d399]/35 text-[#34d399] font-mono px-3 py-1 rounded text-xs animate-bounce font-bold">
                      ACCESS_GRANTED: VALUATION VAULT UNLOCKED
                    </span>
                    <p className="text-slate-400 text-xs font-sans">You have unlocked the AnalystOS templates deck. Download templates inside the Lab panel on the right.</p>
                  </div>
                ) : (
                  <form onSubmit={handleUnlockVault} className="space-y-3 font-sans">
                    <input
                      type="email"
                      placeholder="Enter operational email address"
                      value={vaultEmail}
                      onChange={(e) => setVaultEmail(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-xs text-white placeholder-slate-650 outline-none focus:border-[#a78bfa] transition-colors cursor-none font-mono"
                    />
                    <button
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
                    </button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Right Panel: Vault items copy scorecard links list */}
            <motion.div 
              variants={cardVariants}
              custom={0.35}
              animate={activeSection === 4 ? "active" : "inactive"}
              className="lg:col-span-6 w-full font-mono text-[11px] text-left bg-slate-950/60 border border-white/[0.05] p-5 rounded-2xl"
            >
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
            </motion.div>

          </div>
        </section>

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
                            className="w-full bg-slate-950 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-[#a78bfa] cursor-none"
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

    </div>
  );
}
