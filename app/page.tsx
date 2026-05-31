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

  // Three.js 3D Globe Ref
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 8;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Group containers
    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    const globeGroup = new THREE.Group();
    sceneGroup.add(globeGroup);

    // 1. Globe Wireframe Sphere
    const globeRadius = 1.6;
    const sphereGeo = new THREE.SphereGeometry(globeRadius, 24, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x2D7EF8,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const globeWireMesh = new THREE.Mesh(sphereGeo, wireMat);
    globeGroup.add(globeWireMesh);

    // 2. Dot Matrix Point Globe
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
      size: 0.025,
      transparent: true,
      opacity: 0.35
    });
    const globeDots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(globeDots);

    // 3. Geographic bezier connection lines
    const routeGroup = new THREE.Group();
    globeGroup.add(routeGroup);

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
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      ));

      const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
      const points = curve.getPoints(20);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

      const curveMat = new THREE.LineBasicMaterial({
        color: 0x2D7EF8,
        transparent: true,
        opacity: 0.15
      });

      const routeLine = new THREE.Line(curveGeo, curveMat);
      routeGroup.add(routeLine);
    });

    // 4. Pulsing inner core emerald particles
    const particleCount = 700;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSpeeds: { freq: number; phase: number }[] = [];

    const coreRadius = 0.85;

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
      color: 0x10B981, // Emerald pulsing core
      size: 0.03,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });

    const aiSphereParticles = new THREE.Points(particleGeo, particleMat);
    sceneGroup.add(aiSphereParticles);

    // 5. Lighting Environment
    const ambientLight = new THREE.AmbientLight(0x060609, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x2D7EF8, 3, 15);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 5, 4);
    scene.add(directionalLight);

    // Mouse movement coordinate tilts
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouseY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Animation render loop
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      globeGroup.rotation.y = time * 0.05;
      globeGroup.rotation.x = time * 0.02;

      // Pulse core particles organic size and shape
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
        const pulseFactor = coreRadius + Math.sin(time * speed.freq + speed.phase) * 0.045;

        positionsArr[i * 3] = nx * pulseFactor;
        positionsArr[i * 3 + 1] = ny * pulseFactor;
        positionsArr[i * 3 + 2] = nz * pulseFactor;
      }
      aiSphereParticles.geometry.attributes.position.needsUpdate = true;

      aiSphereParticles.rotation.y = -time * 0.03;
      aiSphereParticles.rotation.z = time * 0.01;

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      sceneGroup.rotation.y = targetX * 0.25;
      sceneGroup.rotation.x = targetY * 0.2;

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  // Parallax Float Cards Mouse Tracker State
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

  // -----------------------------------------------------------
  // INTERACTIVE TERMINAL METRICS & SANDBOX
  // -----------------------------------------------------------
  const [activePreviewTab, setActivePreviewTab] = useState<"charts" | "ai" | "dcf" | "reports">("charts");
  
  // Custom Canvas Chart
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const stockQuotes = [150.2, 155.8, 148.4, 160.1, 168.5, 162.0, 172.4, 169.5, 178.2, 185.0, 179.3, 182.52];
  const quarters = ["Q1-25", "Feb", "Mar", "Q2-25", "May", "Jun", "Q3-25", "Aug", "Sep", "Q4-25", "Nov", "Dec"];

  const drawChart = (hoverX?: number) => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = 30;
    const chartWidth = w - padding * 2;
    const chartHeight = h - padding * 2;

    const minVal = 140;
    const maxVal = 190;
    const valRange = maxVal - minVal;

    const points = stockQuotes.map((val, index) => {
      const x = padding + (index / (stockQuotes.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / valRange) * chartHeight;
      return { x, y, price: val, date: quarters[index] };
    });

    ctx.clearRect(0, 0, w, h);

    // 1. Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridCols = 8;
    for (let i = 0; i <= gridCols; i++) {
      const x = padding + (i / gridCols) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, 15);
      ctx.lineTo(x, h - 25);
      ctx.stroke();
    }

    const gridRows = 5;
    for (let i = 0; i <= gridRows; i++) {
      const y = padding + (i / gridRows) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(25, y);
      ctx.lineTo(w - 25, y);
      ctx.stroke();
    }

    // 2. Axes labels
    ctx.fillStyle = "#4D4E5B";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText("$190", 25, 33);
    ctx.fillText("$175", 25, (h - 40) * 0.35 + 15);
    ctx.fillText("$160", 25, (h - 40) * 0.7 + 5);
    ctx.fillText("$140", 25, h - 22);

    ctx.textAlign = "center";
    ctx.fillText("JAN", 30, h - 8);
    ctx.fillText("MAR", 30 + (w - 60) * 0.22, h - 8);
    ctx.fillText("JUN", 30 + (w - 60) * 0.48, h - 8);
    ctx.fillText("SEP", 30 + (w - 60) * 0.74, h - 8);
    ctx.fillText("DEC", w - 30, h - 8);

    // 3. Simulated Volume Columns
    points.forEach(pt => {
      const volHeight = Math.abs(Math.sin(pt.x) * 45) + 15;
      ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
      ctx.fillRect(pt.x - 6, h - 25 - volHeight, 12, volHeight);
    });

    // 4. Primary Chart Line
    ctx.beginPath();
    ctx.strokeStyle = "#00f0ff"; // Electric blue premium accent
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // 5. Gradient fill
    const fillGrad = ctx.createLinearGradient(0, 30, 0, h - 25);
    fillGrad.addColorStop(0, "rgba(0, 240, 255, 0.12)");
    fillGrad.addColorStop(1, "rgba(0, 240, 255, 0.00)");
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.lineTo(points[points.length - 1].x, h - 25);
    ctx.lineTo(points[0].x, h - 25);
    ctx.closePath();
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // 6. Snapping to cursor hover
    if (hoverX !== undefined) {
      let closestPt = points[0];
      let minDist = Math.abs(hoverX - closestPt.x);
      points.forEach(pt => {
        const dist = Math.abs(hoverX - pt.x);
        if (dist < minDist) {
          minDist = dist;
          closestPt = pt;
        }
      });

      // Draw dashed crosshairs
      ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(25, closestPt.y);
      ctx.lineTo(w - 25, closestPt.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(closestPt.x, 15);
      ctx.lineTo(closestPt.x, h - 25);
      ctx.stroke();

      ctx.setLineDash([]);

      // Draw Snapped Data Point Hover Ring
      ctx.fillStyle = "#00f0ff";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(closestPt.x, closestPt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      setHoveredDataPoint(closestPt);
      setTooltipPos({ x: closestPt.x + 10, y: closestPt.y - 45 });
    } else {
      // Glow point at terminal last quote price
      const activePt = points[points.length - 1];
      ctx.fillStyle = "#00e676"; // Emerald green
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(activePt.x, activePt.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      setHoveredDataPoint(null);
    }
  };

  useEffect(() => {
    if (activePreviewTab === "charts") {
      drawChart();
    }
  }, [activePreviewTab]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = chartCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    drawChart(x);
  };

  const handleCanvasMouseLeave = () => {
    drawChart();
  };

  // AI Co-Pilot Panel
  const [aiChatHistory, setAiChatHistory] = useState<any[]>([
    { role: "user", content: "Analyse Reliance Industries Q3 earnings" },
    { role: "system", content: "Loading Reliance Q3 analysis...\nExecuting: Reliance Industries (RELIANCE) Q3 Analysis Engine v4.0\n----------------------------------------------------------------\nRevenue: ₹2.48 Lakh Cr (+3.2% YoY) | EBITDA Margin: 17.5% (Strong)\nNet Profit: ₹17,200 Cr vs ₹16,800 Cr estimated (Beat of 2.4%)\nKey Drivers: Retail revenue grows 10.4% YoY. Oil-to-Chemicals steady.\nDCF Implications: Growth projection updated to 11.5% for FY26.\nValuation Verdict: Solid EBITDA support; implied trading gap suggests 6.5% upside.\n\nReady for next financial query. Type command below." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);

  const handleAiSend = (textToSend?: string) => {
    const msg = (textToSend || aiInput).trim();
    if (!msg) return;

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
        reply = "DCF_COMPILING: RELIANCE INDUSTRIES INTRINSIC ESTIMATE ₹2,650 (UP-SIDE +6.5% OVER RECENT ₹2,480 MARGIN QUOTES)";
      } else {
        reply = `CONNECTING TO LOCAL FINANCIAL INDEX NODES...\nUNABLE TO RESOLVE CO-PILOT PIPELINES DIRECTLY FOR '${msg}'.\nTRY SUGGESTIONS LISTED BELOW OR ENTER HELP.`;
      }
      setAiChatHistory(prev => [...prev, { role: "system", content: reply }]);
      setIsAiTyping(false);
    }, 1000);
  };

  // DCF Valuation recalculator states
  const [dcfEbitda, setDcfEbitda] = useState(120);     // ₹ Lakhs
  const [dcfGrowth, setDcfGrowth] = useState(15);      // %
  const [dcfWacc, setDcfWacc] = useState(9.0);         // %
  const [dcfMultiple, setDcfMultiple] = useState(14);   // EV/EBITDA

  const sharesOutstanding = 10000000; // 1 Crore shares
  const ebitdaVal = dcfEbitda * 100000;
  const growthVal = dcfGrowth / 100;
  const waccVal = dcfWacc / 100;

  // Year 1 to 5 Cash Flow and EV projections
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

  const formatIndianCurrency = (num: number) => {
    if (num >= 10000000) {
      const crVal = num / 10000000;
      return "₹" + crVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Cr";
    } else if (num >= 100000) {
      const lVal = num / 100000;
      return "₹" + lVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " L";
    } else {
      return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

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

  // -----------------------------------------------------------
  // waitlist & resources locker vault actions
  // -----------------------------------------------------------
  const [vaultEmail, setVaultEmail] = useState("");
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultEmail) return;
    setVaultLoading(true);

    try {
      // Log waitlist to Supabase waitlist table
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

  // -----------------------------------------------------------
  // FULLSCREEN FACTSET INFO HUB COMMANDS
  // -----------------------------------------------------------
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
      console.warn("Bypassed contact db logs: ", err);
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

  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-sans selection:bg-[#00f0ff]/30 selection:text-white">
      {/* Ticker marquee */}
      <TickerBar />

      {/* Header */}
      <header className="w-full bg-[#0b0f19]/80 backdrop-blur border-b border-[#00f0ff]/12 px-8 py-4 flex items-center justify-between font-mono z-20 sticky top-0">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-lg font-bold text-white tracking-tight flex items-center space-x-1.5">
            <span>AnalystOS</span>
            <span className="pulse-blue"></span>
          </Link>
          <span className="hidden md:inline-flex bg-[#0b0f19] border border-[#00e676]/20 px-2.5 py-1 text-[#00e676] rounded text-[10px] items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-ping"></span>
            <span>SYSTEMS ONLINE</span>
          </span>
        </div>

        <div className="flex items-center space-x-6 text-xs">
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
            [LOG_IN]
          </Link>
          <Link
            href="/signup"
            className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-4 py-2 rounded transition-colors"
          >
            [SIGN_UP]
          </Link>
        </div>
      </header>

      {/* Main hero & Graphics */}
      <main className="flex-1 flex flex-col items-center">
        
        {/* HERO CONTAINER */}
        <section className="relative w-full overflow-hidden flex flex-col items-center justify-center pt-20 pb-16 px-6 border-b border-[#00f0ff]/12">
          
          {/* THREE.JS graphic canvas container */}
          <div ref={canvasContainerRef} id="hero-canvas-container" className="absolute inset-0 z-0 pointer-events-auto" />
          
          {/* Ambient radial overlay background */}
          <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_40%,_#05070a_95%] z-0 pointer-events-none" />

          {/* Floating Parallax cards */}
          <div 
            className="floating-market-card aapl transition-transform duration-100 ease-out" 
            style={{ transform: `translate3d(${mousePos.x * 25}px, ${mousePos.y * 25}px, 0)` }}
          >
            <span className="card-arrow">▲</span>
            <span className="card-ticker">AAPL</span>
            <span className="card-pct">+4.2%</span>
          </div>

          <div 
            className="floating-market-card nvda transition-transform duration-100 ease-out" 
            style={{ transform: `translate3d(${mousePos.x * -35}px, ${mousePos.y * -35}px, 0)` }}
          >
            <span className="card-arrow">▲</span>
            <span className="card-ticker">NVDA</span>
            <span className="card-pct">+7.1%</span>
          </div>

          <div 
            className="floating-market-card reliance transition-transform duration-100 ease-out" 
            style={{ transform: `translate3d(${mousePos.x * 15}px, ${mousePos.y * 15}px, 0)` }}
          >
            <span className="card-arrow">▲</span>
            <span className="card-ticker">RELIANCE</span>
            <span className="card-pct">+2.8%</span>
          </div>

          {/* Content panel */}
          <div className="relative z-10 w-full max-w-6xl flex flex-col items-center text-center space-y-6">
            
            <div className="inline-flex bg-[#0b0f19]/90 border border-[#00f0ff]/20 px-3 py-1.5 rounded-full text-xs font-mono text-[#00f0ff] items-center space-x-2 shadow-[0_0_20px_rgba(0,240,255,0.06)]">
              <span className="pulse-blue"></span>
              <span>Bloomberg Alternative for Next-Gen Analysts</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white font-mono uppercase leading-none max-w-3xl">
              Research. Analyze. <br/>
              <span className="text-[#00f0ff] glow-text">Execute.</span>
            </h1>

            <p className="text-slate-400 text-sm md:text-base max-w-lg leading-relaxed">
              The Institutional Finance Terminal for Hedge Fund & Investment Research. Analyze statements, compute DCFs, and compile theses faster.
            </p>

            <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-3 justify-center pb-4">
              <span>SYS_FEED: ACTIVE</span>
              <span>•</span>
              <span>PORTAL_LATENCY: 12ms</span>
              <span>•</span>
              <span>DATABASE_SYNC: ONLINE</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-mono">
              <Link 
                href="/signup" 
                className="w-full sm:w-auto text-center bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold px-6 py-3 rounded transition-all shadow-[0_0_25px_rgba(0,240,255,0.25)] flex items-center justify-center space-x-2"
              >
                <span>OPEN FREE TERMINAL</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <button 
                onClick={() => openHub("about")}
                className="w-full sm:w-auto text-center border border-slate-700 hover:border-[#00f0ff] hover:text-[#00f0ff] text-slate-300 px-6 py-3 rounded transition-all bg-[#0b0f19]/30"
              >
                [FOUNDERS_NOTE.LOG]
              </button>
            </div>

            <div className="text-xs font-mono text-slate-500 flex items-center space-x-2 justify-center pt-2">
              <span className="pulse-green"></span>
              <span>PRO_TIER FREE LAUNCH COUNTDOWN:</span>
              <span className="text-[#00e676] font-bold">{countdown}</span>
            </div>

            {/* INTERACTIVE TERMINAL WIDGET */}
            <div className="w-full max-w-4xl mt-12 bg-[#0b0f19]/90 border border-[#00f0ff]/15 rounded-xl overflow-hidden shadow-2xl font-mono text-left">
              {/* Terminal topbar */}
              <div className="flex items-center justify-between border-b border-[#00f0ff]/12 px-4 py-3 bg-[#070b13] text-xs">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff3860]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbc02d]"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00e676]"></span>
                  </div>
                  <span className="text-slate-400 font-bold ml-2">AnalystOS Terminal v1.0.4 — Localhost Connection</span>
                </div>
                <span className="text-slate-500 text-[10px] flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-[#00e676] rounded-full animate-ping"></span>
                  <span>LIVE</span>
                </span>
              </div>

              {/* Terminal interior structure */}
              <div className="flex flex-col md:flex-row min-h-[350px]">
                {/* Monospace Sidebar Tabs */}
                <div className="w-full md:w-56 border-r border-[#00f0ff]/12 bg-[#05070a]/80 flex flex-col p-3 gap-1">
                  {[
                    { id: "charts", label: "[1] AAPL.CHARTS" },
                    { id: "ai", label: "[2] AI.ANALYST" },
                    { id: "dcf", label: "[3] DCF.MODELS" },
                    { id: "reports", label: "[4] STOCK.REPORTS" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePreviewTab(tab.id as any)}
                      className={`text-left px-3 py-2.5 rounded text-xs transition-colors font-bold uppercase ${
                        activePreviewTab === tab.id 
                          ? "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Main Viewports */}
                <div className="flex-1 bg-[#0b0f19] p-4 flex flex-col justify-between overflow-x-auto min-h-[350px]">
                  
                  {/* Viewport 1: Stock Charts Canvas */}
                  {activePreviewTab === "charts" && (
                    <div className="flex-1 flex flex-col justify-between h-full relative min-h-[280px]">
                      <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">AAPL</span>
                          <span className="text-[10px] text-slate-500">NASDAQ • Apple Inc.</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-bold">$182.52</span>
                          <span className="text-[#00e676] text-[10px] font-bold">+2.14%</span>
                        </div>
                      </div>

                      <div className="flex-1 relative my-2 min-h-[200px]">
                        <canvas 
                          ref={chartCanvasRef}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseLeave={handleCanvasMouseLeave}
                          className="w-full h-full cursor-crosshair min-h-[190px]"
                        />

                        {/* Interactive Absolute Tooltip Overlay */}
                        {hoveredDataPoint && (
                          <div 
                            className="absolute bg-[#0b0f19] border border-[#00f0ff]/20 rounded p-1.5 text-[9px] pointer-events-none z-10 shadow-lg"
                            style={{ left: tooltipPos.x, top: tooltipPos.y }}
                          >
                            <div className="text-slate-400">AAPL {hoveredDataPoint.date}</div>
                            <div className="text-[#00f0ff] font-bold">${hoveredDataPoint.price.toFixed(2)}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-500 border-t border-slate-900 pt-2">
                        <span>H: $183.92</span>
                        <span>L: $180.88</span>
                        <span>V: 52.4M</span>
                        <span>PE: 28.4</span>
                        <span className="text-[#00f0ff]">← Hover to track crosshair →</span>
                      </div>
                    </div>
                  )}

                  {/* Viewport 2: AI Co-Pilot terminal */}
                  {activePreviewTab === "ai" && (
                    <div className="flex-1 flex flex-col justify-between h-full min-h-[280px]">
                      <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                        <span className="font-bold text-white">AI CO-PILOT CORE</span>
                        <span className="text-[#00e676] text-[10px] font-bold">INTELLIGENCE OPERATIONAL</span>
                      </div>

                      {/* Chat History View */}
                      <div className="flex-1 overflow-y-auto max-h-[180px] space-y-3 my-3 text-[11px] leading-relaxed scrollbar-thin">
                        {aiChatHistory.map((chat, idx) => (
                          <div key={idx} className={`p-2.5 rounded ${
                            chat.role === "user" 
                              ? "bg-[#00f0ff]/5 border border-[#00f0ff]/10 text-white" 
                              : "bg-[#05070a]/60 border border-slate-950 text-slate-300 whitespace-pre-wrap"
                          }`}>
                            <span className={`font-bold block text-[10px] mb-1 uppercase ${
                              chat.role === "user" ? "text-[#00f0ff]" : "text-[#00e676]"
                            }`}>
                              {chat.role === "user" ? "> USER" : ">> CO_PILOT"}
                            </span>
                            {chat.content}
                          </div>
                        ))}
                        {isAiTyping && (
                          <div className="p-2.5 rounded bg-[#05070a]/60 border border-slate-950 text-slate-400 text-xs italic flex items-center space-x-2">
                            <span className="pulse-blue"></span>
                            <span className="blinking-cursor">Compiling stock indices analysis</span>
                          </div>
                        )}
                      </div>

                      {/* Suggestions and input bar */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1 text-[9px]">
                          <span className="text-slate-500 self-center mr-1">QUERIES:</span>
                          <button onClick={() => handleAiSend("Analyze Reliance Industries")} className="bg-[#05070a] border border-slate-800 hover:border-[#00f0ff] hover:text-white text-slate-400 px-2 py-0.5 rounded">Reliance Analysis</button>
                          <button onClick={() => handleAiSend("Build DCF for TCS")} className="bg-[#05070a] border border-slate-800 hover:border-[#00f0ff] hover:text-white text-slate-400 px-2 py-0.5 rounded">TCS Model</button>
                          <button onClick={() => handleAiSend("SYS_PING")} className="bg-[#05070a] border border-slate-800 hover:border-[#00f0ff] hover:text-white text-slate-400 px-2 py-0.5 rounded">System Ping</button>
                        </div>

                        <div className="flex border border-[#00f0ff]/15 rounded bg-[#05070a] overflow-hidden">
                          <input 
                            type="text" 
                            value={aiInput}
                            onChange={e => setAiInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleAiSend()}
                            placeholder="Type a command (e.g. Reliance valuation, LIST_STOCKS, HELP)..."
                            className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none border-none"
                          />
                          <button 
                            onClick={() => handleAiSend()}
                            className="bg-[#070b13] px-4 text-[#00f0ff] border-l border-[#00f0ff]/12 hover:bg-[#00f0ff]/10"
                          >
                            RUN
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Viewport 3: DCF recalculating sensitivity models */}
                  {activePreviewTab === "dcf" && (
                    <div className="flex-1 flex flex-col justify-between h-full min-h-[280px]">
                      <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                        <span className="font-bold text-white">DCF VALUATION ENGINE</span>
                        <span className="text-[#00e676] text-[10px] font-bold">RECALCULATING AUTOMATICALLY</span>
                      </div>

                      {/* EBITDA Growth multiple discount WACC inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 text-[10px]">
                        <div className="bg-[#05070a] border border-slate-850 p-2 rounded">
                          <span className="text-slate-500 block mb-1">EBITDA (₹ Lakhs)</span>
                          <input 
                            type="number" 
                            value={dcfEbitda}
                            onChange={e => setDcfEbitda(Math.max(1, Number(e.target.value)))}
                            className="bg-transparent border-none outline-none text-white text-xs font-bold w-full"
                          />
                        </div>
                        <div className="bg-[#05070a] border border-slate-850 p-2 rounded">
                          <span className="text-slate-500 block mb-1">Growth (%)</span>
                          <input 
                            type="number" 
                            value={dcfGrowth}
                            onChange={e => setDcfGrowth(Number(e.target.value))}
                            className="bg-transparent border-none outline-none text-white text-xs font-bold w-full"
                          />
                        </div>
                        <div className="bg-[#05070a] border border-slate-850 p-2 rounded">
                          <span className="text-slate-500 block mb-1">WACC (%)</span>
                          <input 
                            type="number" 
                            step="0.5"
                            value={dcfWacc}
                            onChange={e => setDcfWacc(Math.max(0.5, Number(e.target.value)))}
                            className="bg-transparent border-none outline-none text-white text-xs font-bold w-full"
                          />
                        </div>
                        <div className="bg-[#05070a] border border-slate-850 p-2 rounded">
                          <span className="text-slate-500 block mb-1">Exit Multiple</span>
                          <input 
                            type="number" 
                            value={dcfMultiple}
                            onChange={e => setDcfMultiple(Math.max(1, Number(e.target.value)))}
                            className="bg-transparent border-none outline-none text-white text-xs font-bold w-full"
                          />
                        </div>
                      </div>

                      {/* Display calculations outputs */}
                      <div className="grid grid-cols-2 gap-3 mb-2 bg-[#05070a]/80 p-2.5 rounded border border-slate-900">
                        <div className="text-xs">
                          <span className="text-slate-500 block text-[9px] mb-0.5">Enterprise Value</span>
                          <span className="text-[#00e676] font-bold text-sm">{formatIndianCurrency(enterpriseValue)}</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-500 block text-[9px] mb-0.5">Implied Share Price</span>
                          <span className="text-[#00f0ff] font-bold text-sm">₹{impliedSharePrice.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* PV / TV progressive breakdown bars */}
                      <div className="my-2 space-y-1">
                        <div className="flex justify-between text-[8px] text-slate-500">
                          <span>PV of Cash Flows ({pvPercent.toFixed(0)}%)</span>
                          <span>Terminal Value ({tvPercent.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                          <div className="h-full bg-[#00f0ff]" style={{ width: `${pvPercent}%` }} />
                          <div className="h-full bg-[#00e676]" style={{ width: `${tvPercent}%` }} />
                        </div>
                      </div>

                      {/* Sensitivity Table WACC vs Multiples */}
                      <div className="dcf-sensitivity-container max-h-[120px] overflow-y-auto">
                        <span className="sens-title block mb-1.5">SENSITIVITY MATRIX (Implied share price ₹)</span>
                        <table className="sens-grid-table">
                          <thead>
                            <tr>
                              <th>WACC \ Multiple</th>
                              <th>{multiplesList[0]}x</th>
                              <th className="active-col">{multiplesList[1]}x (Base)</th>
                              <th>{multiplesList[2]}x</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waccList.map((w, wIdx) => (
                              <tr key={wIdx}>
                                <td className="sens-wacc-label">{w.toFixed(1)}%</td>
                                {multiplesList.map((m, mIdx) => {
                                  const cellPrice = calculateCellPrice(w, m);
                                  const isBase = wIdx === 1 && mIdx === 1;
                                  return (
                                    <td key={mIdx} className={isBase ? "sens-cell active-cell" : "sens-cell"}>
                                      ₹{cellPrice.toFixed(2)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Viewport 4: Stock Reports */}
                  {activePreviewTab === "reports" && (
                    <div className="flex-1 flex flex-col justify-between h-full min-h-[280px]">
                      <div className="flex justify-between items-center text-xs border-b border-slate-900 pb-2">
                        <span className="font-bold text-white">RELIANCE</span>
                        <span className="text-[#00e676] text-[10px] font-bold">NSE • EQUITY RESEARCH VERDICT</span>
                      </div>

                      <div className="bg-[#05070a]/60 border border-slate-950 rounded-lg p-3 my-3 space-y-3">
                        <span className="text-[9px] font-mono text-[#00f0ff] bg-[#00f0ff]/10 px-2 py-0.5 rounded font-bold">INSTITUTIONAL EQUITY RESEARCH scorecard</span>
                        <h4 className="text-white font-bold text-sm uppercase">Reliance Industries Limited</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-[#0b0f19] border border-slate-900 p-2 rounded">
                            <span className="text-slate-500 block mb-0.5">YoY Revenue Growth</span>
                            <span className="text-[#00f0ff] font-bold text-xs">8.2% (FY26)</span>
                          </div>
                          <div className="bg-[#0b0f19] border border-slate-900 p-2 rounded">
                            <span className="text-slate-500 block mb-0.5">EBITDA Margin</span>
                            <span className="text-[#00e676] font-bold text-xs">17.5% (Strong)</span>
                          </div>
                          <div className="bg-[#0b0f19] border border-slate-900 p-2 rounded">
                            <span className="text-slate-500 block mb-0.5">CAPM discount (WACC)</span>
                            <span className="text-white font-bold text-xs">9.0%</span>
                          </div>
                          <div className="bg-[#0b0f19] border border-[#00e676]/30 bg-[#00e676]/3 p-2 rounded">
                            <span className="text-slate-500 block mb-0.5">VALUATION GAP</span>
                            <span className="text-[#00e676] font-bold text-xs">Undervalued 7.3%</span>
                          </div>
                        </div>

                        <p className="text-slate-400 text-[10px] leading-relaxed border-t border-slate-900 pt-2.5">
                          Reliance Industries exhibits robust fundamental metrics with Year-over-Year (YoY) revenue expansion of <strong>8.2%</strong> and healthy EBITDA margins stable at <strong>17.5%</strong>. Our multi-stage growth discount model computes a conservative intrinsic target price of <strong>₹2,650 per share</strong>. Based on current market valuations, the stock presents an attractive entry point, trading at a <strong>7.3% discount</strong> to its true intrinsic target valuation.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION A: BUILT FOR LEADERS
        * ----------------------------------------------------------- */}
        <section className="w-full bg-[#05070a] py-20 border-b border-slate-900 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <h2 className="text-3xl font-extrabold font-mono tracking-tight text-white text-center mb-12">
              BUILT FOR NEXT-GEN FINANCE LEADERS
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "CFA Candidates",
                  desc: "Practice valuation models, DCFs, comps, and financial analysis frameworks mapped directly to the CFA curriculum."
                },
                {
                  title: "Equity Research Analysts",
                  desc: "Sling corporate financials, extract notes from PDF earnings filings, and run professional research with institutional data speeds."
                },
                {
                  title: "Finance Students",
                  desc: "Bridge academic theory with real market data. Build dynamic simulated portfolios and model live Indian equities."
                },
                {
                  title: "Long-Term Investors",
                  desc: "Run rigorous intrinsic value projections and deep-dive screenings. Avoid overpriced, low-conviction market noise."
                }
              ].map((item, idx) => (
                <div key={idx} className="terminal-card rounded-lg p-6 flex gap-4 transition-all">
                  <div className="w-9 h-9 rounded-full bg-[#00e676]/10 border border-[#00e676]/30 flex items-center justify-center flex-shrink-0 text-[#00e676]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold font-mono text-sm uppercase">{item.title}</h3>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION B: LOCKOUT PROBLEMS PAIN CARDS
        * ----------------------------------------------------------- */}
        <section className="w-full bg-[#0b0f19] py-20 border-b border-[#00f0ff]/12 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <h2 className="text-3xl font-extrabold font-mono tracking-tight text-white text-center mb-12 max-w-2xl mx-auto leading-tight">
              YOUNG PROFESSIONALS ARE LOCKED OUT OF PROFESSIONAL FINANCE TOOLS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Bloomberg costs ₹2.5L/year",
                  desc: "Legacy finance terminals are gatekept by enterprise licensing, leaving junior analysts to analyze multi-billion mergers with retail tools."
                },
                {
                  title: "Finance data scattered in 10 apps",
                  desc: "Toggling between Screener, TradingView, SEBI filings, PDF reports, and Excel sheets drains focus and increases operational errors."
                },
                {
                  title: "No tool built for learning + doing",
                  desc: "Theoretical courses teach DCF theory, but fail to provide dynamic, live environments where young analysts can safely practice real valuation skills."
                }
              ].map((card, idx) => (
                <div key={idx} className="terminal-card rounded-lg p-6 flex flex-col justify-between h-full bg-[#05070a]/60 border border-slate-900">
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-lg bg-[#ff3860]/10 border border-[#ff3860]/30 flex items-center justify-center text-[#ff3860]">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h3 className="text-white font-bold font-mono text-sm uppercase leading-snug">{card.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION C: 11-FEATURES SPEC DIRECTORY
        * ----------------------------------------------------------- */}
        <section className="w-full bg-[#05070a] py-20 border-b border-slate-900 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <div className="text-center md:text-left mb-12">
              <span className="terminal-badge">MODULE DIRECTORY</span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight mt-3 font-mono uppercase">
                FactSet-Grade Feature Catalog
              </h2>
              <p className="text-slate-400 mt-2 text-xs">
                Explore the complete institutional specifications compiled into the AnalystOS engine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Financial Modeling", desc: "Dynamic pro-forma forecasts, income statements, balance sheets.", icon: Cpu },
                { title: "DCF Analysis", desc: "Interactive Exit Multiple and Perpetuity Growth valuation engines.", icon: DollarSign },
                { title: "Valuation Tools", desc: "Leveraged Buyout (LBO) sheets and comparable comp tables.", icon: BarChart3 },
                { title: "Statement Review", desc: "Automated analysis of core financial statement margins and working capital.", icon: FileText },
                { title: "Market Research", desc: "Live macroeconomic indicator maps and sector indexes.", icon: LineChart },
                { title: "Company Analysis", desc: "Red flag indicators scanning margins, leverage, and promoter pledge.", icon: Shield },
                { title: "Research Notes", desc: "Monospace research journals with citation indices.", icon: Terminal },
                { title: "Investment Frameworks", desc: "Pre-loaded SWOT modules, Porter's 5 Forces, and economic moat guides.", icon: BookOpen },
                { title: "Learning Hub", desc: "Practice valuation simulators and financial concept maps.", icon: CheckSquare },
                { title: "CFA Concepts", desc: "Formulas and study references mapped directly to the CFA Level 1 syllabus.", icon: Shield },
                { title: "Excel Templates", desc: "High-density model layouts and keyboard navigation cheat sheets.", icon: FileText }
              ].map((feat, idx) => (
                <div key={idx} className="terminal-card rounded-lg p-5 flex items-start space-x-4">
                  <div className="bg-[#00f0ff]/10 p-2.5 rounded border border-[#00f0ff]/20">
                    <feat.icon className="w-5 h-5 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold font-mono text-sm uppercase">{feat.title}</h4>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION D: FOUNDER STORY BLOCK
        * ----------------------------------------------------------- */}
        <section className="w-full bg-[#0b0f19] py-20 border-b border-[#00f0ff]/12 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <div className="terminal-card rounded-xl p-8 max-w-3xl mx-auto border border-[#00f0ff]/15 bg-[#05070a]/40 relative overflow-hidden">
              <span className="terminal-badge mb-4">FOUNDER STORY</span>
              <h2 className="text-2xl font-bold font-mono text-white tracking-tight uppercase mb-4 mt-2">Why I Built AnalystOS</h2>
              
              <blockquote className="border-l-2 border-[#00f0ff] pl-4 py-1 italic text-slate-200 text-xs leading-relaxed bg-[#05070a]/80 rounded-r">
                "While learning DCF valuation, equity research, and financial modeling, I realized most tools were built for professionals. AnalystOS is my attempt to make institutional-grade research accessible to anyone willing to learn."
              </blockquote>
              
              <div className="flex items-center space-x-3 mt-6">
                <div className="w-6 h-0.5 bg-[#00f0ff]" />
                <div className="text-xs font-mono">
                  <span className="text-white font-bold">Revanth Pemmaraju</span>
                  <span className="text-slate-500 block text-[9px] mt-0.5">Creator & Founder</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION E: PREMIUM PRICING GRIDS
        * ----------------------------------------------------------- */}
        <section className="w-full bg-[#05070a] py-20 border-b border-slate-900 flex flex-col items-center">
          <div className="w-full max-w-6xl px-6">
            <h2 className="text-3xl font-extrabold font-mono text-white tracking-tight text-center mb-4 uppercase">
              Pricing that doesn't require a <span className="text-[#00f0ff] glow-text">corporate expense account</span>
            </h2>
            <p className="text-slate-500 text-xs text-center mb-12">
              Get access to premium equities research pipelines at standard student pricing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Plan 1: FREE */}
              <div className="terminal-card rounded-lg p-6 bg-[#0b0f19] border border-slate-900 flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-900 pb-4 mb-4 text-left">
                    <span className="text-xs font-mono text-slate-400 block mb-1">FREE PLAN</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-bold text-white">₹0</span>
                      <span className="text-xs text-slate-500 font-mono">/mo</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">For students and curious beginners starting out.</p>
                  </div>
                  
                  <ul className="space-y-2.5 text-xs text-slate-400 mb-8 text-left">
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>5 AI questions / day</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>Basic market dashboard</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>1 simulated portfolio</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-600">
                      <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span>No premium valuation models</span>
                    </li>
                    <li className="flex items-center space-x-2 text-slate-600">
                      <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span>No career OS & DCF sandbox</span>
                    </li>
                  </ul>
                </div>
                
                <Link 
                  href="/signup" 
                  className="w-full text-center border border-slate-800 text-slate-300 font-bold font-mono py-2 rounded text-xs hover:border-[#00f0ff] hover:text-white transition-all bg-[#05070a]"
                >
                  GET STARTED
                </Link>
              </div>

              {/* Plan 2: PRO */}
              <div className="terminal-card rounded-lg p-6 bg-[#0b0f19] border-2 border-[#00f0ff] flex flex-col justify-between relative shadow-[0_0_30px_rgba(0,240,255,0.1)]">
                <span className="absolute -top-3 right-6 bg-[#00f0ff] text-[#05070a] text-[9px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">MOST POPULAR</span>
                <div>
                  <div className="border-b border-slate-900 pb-4 mb-4 text-left">
                    <span className="text-xs font-mono text-[#00f0ff] block mb-1">PRO PLAN</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-bold text-white">₹499</span>
                      <span className="text-xs text-slate-500 font-mono">/mo</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">For serious young professionals building careers.</p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-300 mb-8 text-left">
                    <li className="flex items-center space-x-2 font-bold text-white">
                      <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                      <span>Unlimited AI questions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                      <span>Full real-time market data</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                      <span>5 simulated portfolios</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                      <span>All company deep-dives & alerts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00f0ff] flex-shrink-0" />
                      <span>Daily Morning Briefings</span>
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/signup" 
                  className="w-full text-center bg-[#00f0ff] text-[#05070a] font-bold font-mono py-2.5 rounded text-xs hover:bg-[#00f0ff]/80 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                >
                  CLAIM 3 MONTHS FREE
                </Link>
              </div>

              {/* Plan 3: ANALYST */}
              <div className="terminal-card rounded-lg p-6 bg-[#0b0f19] border border-slate-900 flex flex-col justify-between">
                <div>
                  <div className="border-b border-slate-900 pb-4 mb-4 text-left">
                    <span className="text-xs font-mono text-slate-400 block mb-1">ANALYST PLAN</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-3xl font-bold text-white">₹1,499</span>
                      <span className="text-xs text-slate-500 font-mono">/mo</span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">For ultimate power users aiming to scale instantly.</p>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-400 mb-8 text-left">
                    <li className="flex items-center space-x-2 font-bold text-white">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>Everything in PRO tier</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>Premium DCF, LBO, pitch builders</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>Unlimited portfolios & simulators</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>AI Mock Interview Simulator</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#00e676] flex-shrink-0" />
                      <span>Elite Career OS Dashboard</span>
                    </li>
                  </ul>
                </div>

                <Link 
                  href="/signup" 
                  className="w-full text-center border border-slate-800 text-slate-300 font-bold font-mono py-2 rounded text-xs hover:border-[#00f0ff] hover:text-white transition-all bg-[#05070a]"
                >
                  UPGRADE MY CAREER
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* -----------------------------------------------------------
        * SECTION F: LOCKED VALUATION TEMPLATES RESOURCES LOCKER
        * ----------------------------------------------------------- */}
        <section className="w-full max-w-6xl px-6 py-20" id="resources-vault">
          <div className="terminal-card rounded-xl p-8 border border-[#00e676]/15 bg-[#0b0f19]/80 flex flex-col items-center max-w-3xl mx-auto text-center">
            <span className="terminal-badge-success uppercase">ANALYST TOOLKIT</span>
            <h2 className="text-3xl font-bold font-mono text-white tracking-tight mt-3 uppercase">
              Unlock Free Valuation Templates
            </h2>
            <p className="text-slate-400 text-xs max-w-md mt-2 leading-relaxed">
              Enter your email below to instantly activate your credentials and unlock 5 professional valuation, Excel shortcuts, and CFA concepts guides for free.
            </p>

            {/* List items with locked statuses */}
            <div className="w-full flex flex-col gap-3 my-8 font-mono text-xs max-w-md text-left">
              {[
                "01. Corporate DCF Valuation Model Template (.xlsx)",
                "02. 30+ Wall Street Excel Keyboard Shortcuts Guide (.pdf)",
                "03. Financial Ratios & Valuation Cheat Sheet (.pdf)",
                "04. Institutional Equity Research Stock Template (.docx)",
                "05. CFA Level 1 Study & Formula Notes (.pdf)"
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                  <span className="text-slate-350">{item}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    vaultUnlocked 
                      ? "bg-[#00e676]/10 text-[#00e676] border border-[#00e676]/30" 
                      : "bg-[#ff3860]/10 text-[#ff3860] border border-[#ff3860]/30"
                  }`}>
                    {vaultUnlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
              ))}
            </div>

            {/* Email form logs to waitlist in Supabase */}
            {!vaultUnlocked ? (
              <form onSubmit={handleUnlockVault} className="w-full max-w-md flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={vaultEmail}
                  onChange={e => setVaultEmail(e.target.value)}
                  placeholder="Enter your email to unlock toolkit..."
                  className="flex-1 bg-[#05070a] border border-[#00e676]/25 rounded px-4 py-2.5 text-xs text-white outline-none focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]"
                />
                <button
                  type="submit"
                  disabled={vaultLoading}
                  className="bg-[#00e676] hover:bg-[#00e676]/80 text-[#05070a] font-mono font-bold px-6 py-2.5 rounded text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  {vaultLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>UNLOCK VAULT</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="w-full max-w-xl flex flex-col space-y-4 animate-fadeIn">
                <div className="bg-[#00e676]/10 border border-[#00e676]/20 p-4 rounded text-center text-xs text-[#00e676] font-mono flex items-center justify-center space-x-2">
                  <Unlock className="w-4 h-4" />
                  <span>VAULT UNLOCKED: CREDENTIALS GRANTED INSTANTLY</span>
                </div>

                {/* Unlocked drawer items */}
                {[
                  {
                    id: "dcf-model",
                    title: "01. Corporate DCF Valuation Model Template",
                    text: "[AnalystOS Corporate DCF Model Template v1.2]\nSheet 1: assumptions\nWACC = 9.0% | Exit EBITDA Multiple = 14.0x\nEBITDA Growth Rate = 15.0% (Yr 1-3), 8.0% (Yr 4-5)\nImplied Enterprise Value = ₹18.54 Cr\nDownload URL: https://analystos.com/resources/AnalystOS_DCF_Valuation_Model.xlsx"
                  },
                  {
                    id: "shortcuts",
                    title: "02. 30+ Wall Street Excel Shortcuts Guide",
                    text: "[AnalystOS Excel Shortcuts Handbook]\n- Ctrl + [ : Trace precedents\n- F5 + Enter: Return to cell\n- Alt + E + S + V: Paste Special as Values\n- Alt + H + O + I: Autofit column widths"
                  },
                  {
                    id: "cheat-sheet",
                    title: "03. Financial Ratios & Valuation Cheat Sheet",
                    text: "[AnalystOS Formula Cheat Sheet]\n1. EV = Market Cap + Debt - Cash\n2. WACC = (E/V * Ke) + (D/V * Kd * (1 - Tax))\n3. Ke = Rf + Beta * (Rm - Rf) [CAPM]\n4. FCFF = EBIT*(1-T) + D&A - Capex - dNWC"
                  }
                ].map((cabinet, idx) => (
                  <div key={idx} className="bg-[#05070a] border border-[#00f0ff]/10 rounded-lg p-4 text-left">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-3">
                      <span className="text-white font-bold font-mono text-xs uppercase">{cabinet.title}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(cabinet.id, cabinet.text)}
                        className="text-slate-400 hover:text-[#00f0ff] font-mono text-[10px] flex items-center space-x-1"
                      >
                        {copiedId === cabinet.id ? <Check className="w-3 h-3 text-[#00e676]" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === cabinet.id ? "COPIED" : "COPY SPECS"}</span>
                      </button>
                    </div>
                    <pre className="text-slate-400 font-mono text-[10px] leading-relaxed whitespace-pre bg-[#0b0f19]/60 p-2.5 rounded overflow-x-auto">
                      {cabinet.text}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* -----------------------------------------------------------
      * FACTSET-GRADE INFO HUB SIDEBAR OVERLAY PORTAL
      * ----------------------------------------------------------- */}
      {infoHubActive && (
        <div className="fixed inset-0 bg-[#05070a]/90 backdrop-blur-xl z-50 flex items-center justify-center font-mono p-4">
          <div className="w-full max-w-4xl h-[85vh] bg-[#0b0f19] border border-[#00f0ff]/20 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            
            {/* Sidebar menu */}
            <div className="w-full md:w-64 border-r border-[#00f0ff]/12 bg-[#05070a]/80 flex flex-col p-6">
              <button 
                onClick={() => setInfoHubActive(false)} 
                className="text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider mb-8 text-left flex items-center space-x-1"
              >
                <span>✕ RETURN TO DASHBOARD</span>
              </button>
              
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4 border-b border-slate-900 pb-2">TERMINAL_INDEX</div>
              <div className="flex flex-col gap-1">
                {[
                  { id: "home", label: "[01] TERMINAL_HOME" },
                  { id: "about", label: "[02] FOUNDERS_NOTE" },
                  { id: "contact", label: "[03] CONNECT_DESK" },
                  { id: "changelog", label: "[04] VER_HISTORY" },
                  { id: "privacy", label: "[05] DATA_SAFEGUARD" },
                  { id: "terms", label: "[06] USER_LICENSE" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveHubTab(item.id)}
                    className={`text-left px-3 py-2.5 rounded text-xs transition-colors font-bold ${
                      activeHubTab === item.id 
                        ? "bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/20" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content viewports */}
            <div className="flex-1 p-8 overflow-y-auto bg-[#0b0f19]">
              
              {/* Close helper button */}
              <button 
                onClick={() => setInfoHubActive(false)}
                className="absolute top-6 right-6 border border-slate-800 rounded px-3 py-1.5 hover:border-[#00f0ff] hover:text-[#00f0ff] text-slate-400 text-xs font-bold"
              >
                CLOSE
              </button>

              {/* Hub Home view */}
              {activeHubTab === "home" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge self-start">CORE_MODULE.WELCOME</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">AnalystOS Terminal Info Hub</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Welcome to the central command specifications center. Use the left FactSet-grade navigation index to explore features lists, founder logs, open direct engineering support tickets, and review encryption safeguards.
                  </p>
                  <div className="border border-dashed border-[#00f0ff]/20 p-4 rounded bg-[#00f0ff]/3 flex items-start space-x-3 text-xs">
                    <Terminal className="w-5 h-5 text-[#00f0ff] flex-shrink-0" />
                    <div>
                      <h5 className="text-[#00f0ff] font-bold">[SYSTEM_LOG: ACTIVE]</h5>
                      <p className="text-slate-400 mt-1">You are inside the active terminal specification dashboard overlay. Revert back to the homepage anytime by clicking Return.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hub About view */}
              {activeHubTab === "about" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge self-start">FOUNDERS_NOTE.METADATA</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Our Mission & Revanth Pemmaraju's Story</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    AnalystOS was conceived with a simple yet powerful mission: to democratize institutional-grade financial analysis tools. For too long, young professional analysts, candidates, and students have been priced out of professional Bloomberg, FactSet, or Capital IQ subscriptions (which cost ₹2.5 lakh/year).
                  </p>
                  <blockquote className="border-l-2 border-[#00f0ff] pl-4 py-1 italic text-slate-200 text-xs my-3 bg-[#05070a]/40">
                    "We believe that high-quality equity research, company deep-dives, and financial modeling tools should be accessible to anyone with a willingness to learn. By providing institutional speed and clean data pipelines at a fraction of the cost, we empower the next generation of finance leaders."
                    <br /><span className="text-[10px] text-slate-500 font-bold block mt-2">— Revanth Pemmaraju, Founder</span>
                  </blockquote>
                </div>
              )}

              {/* Hub Contact Ticket view */}
              {activeHubTab === "contact" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge self-start">CONNECT_DESK.PORTAL</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Technical Support & Sales Desk</h3>
                  <p className="text-slate-400 text-xs">Transmit a query ticket directly to our engineering desk.</p>
                  
                  {!contactRef ? (
                    <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-slate-500 uppercase text-[9px]">FULL NAME</label>
                          <input 
                            type="text" 
                            required
                            value={contactName}
                            onChange={e => setContactName(e.target.value)}
                            placeholder="Your name" 
                            className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2.5 text-white outline-none focus:border-[#00f0ff]" 
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-slate-500 uppercase text-[9px]">PROFESSIONAL EMAIL</label>
                          <input 
                            type="email" 
                            required
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            placeholder="you@firm.com" 
                            className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2.5 text-white outline-none focus:border-[#00f0ff]" 
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-slate-500 uppercase text-[9px]">FIRM TYPE / PORTFOLIO</label>
                        <select 
                          value={contactFirm}
                          onChange={e => setContactFirm(e.target.value)}
                          className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2.5 text-slate-350 outline-none focus:border-[#00f0ff]"
                        >
                          <option value="student">Student / CFA Candidate</option>
                          <option value="analyst">Buy-side or Sell-side Analyst</option>
                          <option value="hedgefund">Asset Management / Family Office</option>
                          <option value="retail">Retail Investor</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-slate-500 uppercase text-[9px]">INQUIRY DETAIL SUMMARY</label>
                        <textarea 
                          required
                          rows={4}
                          value={contactMsg}
                          onChange={e => setContactMsg(e.target.value)}
                          placeholder="Please provide details of your inquiry..." 
                          className="bg-[#05070a] border border-[#00f0ff]/15 rounded p-2.5 text-white outline-none focus:border-[#00f0ff]" 
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={contactLoading}
                        className="bg-[#00f0ff] hover:bg-[#00f0ff]/80 text-[#05070a] font-bold py-3 rounded transition-colors w-full flex items-center justify-center space-x-2"
                      >
                        {contactLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>TRANSMIT SUPPORT TICKET →</span>
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="bg-[#00e676]/10 border border-[#00e676]/20 p-6 rounded-lg text-center font-mono space-y-3">
                      <Check className="w-8 h-8 text-[#00e676] mx-auto animate-bounce" />
                      <h4 className="text-white font-bold text-sm uppercase">TICKET_TRANSMITTED_SUCCESSFULLY</h4>
                      <p className="text-slate-400 text-xs">
                        Support ticket ref: <span className="text-[#00e676] font-bold">{contactRef}</span> has been logged securely in waitlist logs. Our support team will coordinate via email.
                      </p>
                      <button 
                        onClick={() => setContactRef(null)} 
                        className="text-[#00f0ff] hover:underline text-xs"
                      >
                        [OPEN NEW TICKET]
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* Hub Changelog view */}
              {activeHubTab === "changelog" && (
                <div className="flex flex-col space-y-4">
                  <span className="terminal-badge self-start">VER_HISTORY.STREAM</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Terminal Version History</h3>
                  <div className="space-y-4 text-xs font-mono text-left">
                    <div className="border-l-2 border-[#00e676] pl-4">
                      <strong className="text-white">v1.0.4 (Active Launch)</strong> <span className="text-slate-500 text-[10px]">2026-05-31</span>
                      <p className="text-slate-400 mt-1">Pivoted landing experience to full-stack Next.js 14 App Router, integrating active Supabase PostgreSQL data schemas, Razorpay bindings, Claude API prompts, and Career OS modules.</p>
                    </div>
                    <div className="border-l-2 border-[#00f0ff] pl-4">
                      <strong className="text-white">v1.0.2 (Payments & Auth)</strong> <span className="text-slate-500 text-[10px]">2026-05-30</span>
                      <p className="text-slate-400 mt-1">Integrated client-side Supabase Auth, Google OAuth hooks, and configured Indian INR checkout orders via Razorpay scripts.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hub Privacy Safeguards view */}
              {activeHubTab === "privacy" && (
                <div className="flex flex-col space-y-4 text-xs">
                  <span className="terminal-badge self-start">DATA_SAFEGUARD.COMPLIANCE</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Privacy Policy Safeguards</h3>
                  <div className="space-y-3 text-slate-400 leading-relaxed">
                    <p>At AnalystOS, we prioritize the protection and security of your financial and personal data. We utilize enterprise-grade security structures through **Supabase PostgreSQL** and **Vercel** hosting platforms.</p>
                    <strong className="text-white uppercase block">1. Information We Collect</strong>
                    <p>We collect your email, name, and billing details upon sign-up or download. Payment transactions are processed securely through **Razorpay** checkout systems; no credit card details are stored directly on our servers.</p>
                    <strong className="text-white uppercase block">2. Cookies and Logs</strong>
                    <p>We use localized tokens to store active sessions and monitor terminal diagnostic heartbeats. All logs are securely archived and cleared regularly.</p>
                  </div>
                </div>
              )}

              {/* Hub Terms view */}
              {activeHubTab === "terms" && (
                <div className="flex flex-col space-y-4 text-xs">
                  <span className="terminal-badge self-start">USER_LICENSE.LEGAL_FRAME</span>
                  <h3 className="text-xl font-extrabold text-white tracking-tight">Terms of Service License</h3>
                  <div className="space-y-3 text-slate-400 leading-relaxed">
                    <p>Please read these terms carefully before accessing the AnalystOS terminal workspace. By creating an account, you agree to comply with these terms.</p>
                    <strong className="text-white uppercase block">1. Subscription Billing</strong>
                    <p>AnalystOS is billed on a recurring monthly cycle of **₹499/month** for the PRO plan. You may cancel your subscription at any time directly through the user navigation pill.</p>
                    <strong className="text-white uppercase block">2. Acceptable Use</strong>
                    <p>The terminal features, DCF sandboxes, and financial models are provided for educational and research analysis purposes. We do not offer direct investment advisory or brokerage execution services.</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-[#05070a] border-t border-slate-900 py-12 text-slate-500 text-xs font-mono">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <span className="text-white font-bold text-sm">AnalystOS</span>
            <p className="text-slate-400 text-xs leading-relaxed">
              The financial OS designed for the next generation of investment analysts.
            </p>
            <span className="text-[10px] block">&copy; {new Date().getFullYear()} AnalystOS. All rights reserved.</span>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">PLATFORM</h5>
            <div className="flex flex-col space-y-2">
              <Link href="/signup" className="hover:text-[#00f0ff]">[OPEN_TERMINAL]</Link>
              <a href="#resources-vault" className="hover:text-[#00f0ff]">[FREE_TEMPLATES]</a>
              <button onClick={() => openHub("contact")} className="text-left hover:text-[#00f0ff]">[SUPPORT_DESK]</button>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">INFO HUB</h5>
            <div className="flex flex-col space-y-2">
              <button onClick={() => openHub("about")} className="text-left hover:text-[#00f0ff]">[FOUNDERS_NOTE]</button>
              <button onClick={() => openHub("changelog")} className="text-left hover:text-[#00f0ff]">[VERSION_RELEASES]</button>
              <button onClick={() => openHub("contact")} className="text-left hover:text-[#00f0ff]">[PARTNERSHIP_DESK]</button>
            </div>
          </div>

          <div>
            <h5 className="text-white font-bold mb-3">LEGAL</h5>
            <div className="flex flex-col space-y-2">
              <button onClick={() => openHub("privacy")} className="text-left hover:text-[#00f0ff]">[PRIVACY_SAFEGUARDS]</button>
              <button onClick={() => openHub("terms")} className="text-left hover:text-[#00f0ff]">[LICENSE_TERMS]</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
