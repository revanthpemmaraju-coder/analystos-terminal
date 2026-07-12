/* eslint-disable */
"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

export default function PricingCoin() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const [isMounted, setIsMounted] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);

  // HUD card positions on desktop
  const cards = [
    {
      id: "free",
      title: "FREE VAULT",
      price: "5 Resources",
      desc: "Static NSE indexes, DuPont models, local workspace",
      posClass: "md:top-[45%] md:left-[5%] md:-translate-y-1/2",
      align: "left",
      initialX: -60,
      initialY: 0,
      delay: 0.1,
    },
    {
      id: "starter",
      title: "RESEARCH DESK",
      price: "₹2L/yr",
      desc: "Live DCF models, screening tools, basic API access",
      posClass: "md:top-[8%] md:left-1/2 md:-translate-x-1/2",
      align: "top",
      initialX: 0,
      initialY: -60,
      delay: 0.25,
    },
    {
      id: "pro",
      title: "FUND SUITE",
      price: "₹3.5L/yr",
      desc: "AI co-pilot, real-time data feeds, multi-seat licenses",
      posClass: "md:top-[45%] md:right-[5%] md:-translate-y-1/2",
      align: "right",
      initialX: 60,
      initialY: 0,
      delay: 0.4,
    },
    {
      id: "enterprise",
      title: "INSTITUTIONAL",
      price: "₹5L+/yr",
      desc: "Dedicated infrastructure, custom integrations, priority support",
      posClass: "md:bottom-[8%] md:left-1/2 md:-translate-x-1/2",
      align: "bottom",
      initialX: 0,
      initialY: 60,
      delay: 0.55,
    },
  ];

  // SVG Line connection coordinates updated dynamically
  const [anchors, setAnchors] = useState<{ [key: string]: { x1: number; y1: number; x2: number; y2: number } }>({});

  useEffect(() => {
    setIsMounted(true);
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Update anchors for SVG Lines
  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    const calculateAnchors = () => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const centerX = containerRect.width / 2;
      const centerY = 300; // Fixed center based on 600px tall container

      const newAnchors: typeof anchors = {};

      cards.forEach((card) => {
        const cardEl = containerRef.current!.querySelector(`#hud-card-${card.id}`);
        if (cardEl) {
          const cardRect = cardEl.getBoundingClientRect();
          const relativeX = cardRect.left - containerRect.left;
          const relativeY = cardRect.top - containerRect.top;

          let x1 = 0;
          let y1 = 0;

          if (card.align === "left") {
            x1 = relativeX + cardRect.width;
            y1 = relativeY + cardRect.height / 2;
          } else if (card.align === "right") {
            x1 = relativeX;
            y1 = relativeY + cardRect.height / 2;
          } else if (card.align === "top") {
            x1 = relativeX + cardRect.width / 2;
            y1 = relativeY + cardRect.height;
          } else if (card.align === "bottom") {
            x1 = relativeX + cardRect.width / 2;
            y1 = relativeY;
          }

          // Point to an offset from the center of the coin (radius ~65px)
          const angle = Math.atan2(y1 - centerY, x1 - centerX);
          const offsetRadius = 65;
          const x2 = centerX + Math.cos(angle) * offsetRadius;
          const y2 = centerY + Math.sin(angle) * offsetRadius;

          newAnchors[card.id] = { x1, y1, x2, y2 };
        }
      });

      setAnchors(newAnchors);
    };

    // Delay calculation to allow CSS transition/render to settle
    const timer = setTimeout(calculateAnchors, 300);
    window.addEventListener("resize", calculateAnchors);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculateAnchors);
    };
  }, [isMounted, dimensions]);

  // Three.js Rendering Lifecycle
  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;

    const width = 600;
    const height = 600;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 5.2;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;

    // 4. Procedural Textures (Offscreen Drawing)
    const createFrontTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;

      // Linear Chrome Gradient for realistic metallic reflection streak
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.2, "#cbd5e1");
      grad.addColorStop(0.4, "#475569");
      grad.addColorStop(0.48, "#0f172a");
      grad.addColorStop(0.52, "#ffffff");
      grad.addColorStop(0.7, "#e2e8f0");
      grad.addColorStop(1, "#94a3b8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Engraved Rings
      ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#0ea5e9";
      
      // Outer Engravings
      ctx.beginPath(); ctx.arc(256, 256, 240, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 226, 0, Math.PI * 2); ctx.stroke();
      
      // Inner Circle Engraving
      ctx.beginPath(); ctx.arc(256, 256, 110, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 102, 0, Math.PI * 2); ctx.stroke();

      // Technical ticks around edge
      ctx.save();
      ctx.translate(256, 256);
      ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 36; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -226);
        ctx.lineTo(0, -216);
        ctx.stroke();
        ctx.rotate((10 * Math.PI) / 180);
      }
      ctx.restore();

      // Monograms
      ctx.shadowBlur = 0;
      ctx.font = "bold 24px 'Space Mono', monospace";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A  O  S", 256, 175);

      ctx.font = "bold 14px 'Space Mono', monospace";
      ctx.fillStyle = "#0284c7";
      ctx.fillText("EQUITY DESK", 256, 335);

      // Center ₹ Symbol
      ctx.font = "700 90px 'Space Mono', 'Inter', monospace";
      ctx.fillStyle = "#0ea5e9";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#0ea5e9";
      ctx.fillText("₹", 256, 250);

      return new THREE.CanvasTexture(canvas);
    };

    const createBackTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d")!;

      // Linear Chrome Gradient for realistic metallic reflection streak
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.2, "#cbd5e1");
      grad.addColorStop(0.4, "#475569");
      grad.addColorStop(0.48, "#0f172a");
      grad.addColorStop(0.52, "#ffffff");
      grad.addColorStop(0.7, "#e2e8f0");
      grad.addColorStop(1, "#94a3b8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Engraved Rings
      ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
      ctx.lineWidth = 4;
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#6366f1";
      ctx.beginPath(); ctx.arc(256, 256, 240, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(256, 256, 102, 0, Math.PI * 2); ctx.stroke();

      // Draw curved "ANALYSTOS" text arc around edge
      ctx.save();
      ctx.translate(256, 256);
      ctx.font = "bold 26px 'Space Mono', monospace";
      ctx.fillStyle = "#4f46e5";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = "A N A L Y S T O S";
      const rads = (1.5 * Math.PI) / text.length;
      ctx.rotate(-0.7 * Math.PI);
      for (let i = 0; i < text.length; i++) {
        ctx.fillText(text[i], 0, -170);
        ctx.rotate(rads);
      }
      ctx.restore();

      // "NSE CERTIFIED" at center
      ctx.shadowBlur = 0;
      ctx.font = "bold 20px 'Space Mono', monospace";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.fillText("NSE CERTIFIED", 256, 256);

      // Circuit board micro lines
      ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Line 1
      ctx.moveTo(180, 310); ctx.lineTo(240, 310); ctx.lineTo(260, 330);
      // Line 2
      ctx.moveTo(332, 310); ctx.lineTo(272, 310); ctx.lineTo(252, 330);
      ctx.stroke();

      // Connector dots
      ctx.fillStyle = "#0ea5e9";
      ctx.beginPath(); ctx.arc(180, 310, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(332, 310, 4, 0, Math.PI * 2); ctx.fill();

      return new THREE.CanvasTexture(canvas);
    };

    const frontTexture = createFrontTexture();
    const backTexture = createBackTexture();

    // 5. Coin Geometry & Materials
    const coinGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.12, 64);
    
    // Side: Beveled silver/chrome color
    const sideMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.85,
      roughness: 0.1,
    });

    // Front material
    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      metalness: 0.65,
      roughness: 0.12,
    });

    // Back material
    const backMaterial = new THREE.MeshStandardMaterial({
      map: backTexture,
      metalness: 0.65,
      roughness: 0.12,
    });

    // Apply 3 materials to cylinder: [side, top (front), bottom (back)]
    const materials = [sideMaterial, frontMaterial, backMaterial];
    const coin = new THREE.Mesh(coinGeometry, materials);
    
    // Turn the cylinder so caps face the camera (Z-axis)
    coin.rotation.x = Math.PI / 2;
    scene.add(coin);

    // 6. Lighting Setup
    // Base ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    // Directional top-left cyan highlight
    const dirLight = new THREE.DirectionalLight(0x00d4ff, 1.35);
    dirLight.position.set(-5, 6, 4);
    scene.add(dirLight);

    // Point bottom-right purple point sheens
    const pointLight = new THREE.PointLight(0x7b61ff, 1.0, 50);
    pointLight.position.set(4, -5, 3);
    scene.add(pointLight);

    // White key light for chrome specular highlights
    const whiteLight = new THREE.DirectionalLight(0xffffff, 1.6);
    whiteLight.position.set(5, 5, 4);
    scene.add(whiteLight);

    // Additional lights to create rich reflections on full polished metal
    const lightRight = new THREE.DirectionalLight(0xffffff, 1.2);
    lightRight.position.set(6, 0, 3);
    scene.add(lightRight);

    const lightLeft = new THREE.DirectionalLight(0xffffff, 1.2);
    lightLeft.position.set(-6, 0, 3);
    scene.add(lightLeft);

    const lightTop = new THREE.DirectionalLight(0xffffff, 1.2);
    lightTop.position.set(0, 6, 3);
    scene.add(lightTop);

    const lightBottom = new THREE.DirectionalLight(0xffffff, 1.2);
    lightBottom.position.set(0, -6, 3);
    scene.add(lightBottom);

    // 7. Interaction and Animation Parameters
    let clock = new THREE.Clock();
    let isHovered = false;
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    
    let rotSpeedY = 0.005;
    let velocityX = 0;
    let velocityY = 0;

    // Track ref boundaries for event triggers
    const mouseContainer = containerRef.current!;

    // Hover triggers
    const onMouseEnter = () => {
      isHovered = true;
    };
    const onMouseLeave = () => {
      isHovered = false;
      isDragging = false;
    };

    // Drag systems
    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      // Adjust rotation (caps rotate Y around global Z / local axes)
      coin.rotation.z -= deltaX * 0.006; 
      coin.rotation.x += deltaY * 0.006;

      // Track velocities for inertia releases
      velocityX = -deltaX * 0.006;
      velocityY = deltaY * 0.006;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support (mobiles)
    const onTouchStart = (e: TouchEvent) => {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;

      coin.rotation.z -= deltaX * 0.008;
      coin.rotation.x += deltaY * 0.008;

      velocityX = -deltaX * 0.008;
      velocityY = deltaY * 0.008;

      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    mouseContainer.addEventListener("mouseenter", onMouseEnter);
    mouseContainer.addEventListener("mouseleave", onMouseLeave);
    mouseContainer.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Touch additions
    mouseContainer.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onMouseUp);

    // 8. Dynamic Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();

      // Lerp float scales on hover
      const targetScale = isHovered ? 1.05 : 1.0;
      const scaleSpeed = 0.1;
      const currentScale = coin.scale.x;
      const nextScale = currentScale + (targetScale - currentScale) * scaleSpeed;
      coin.scale.setScalar(nextScale);

      // Oscillation Y float (Math.sin wave, 2s period)
      coin.position.y = Math.sin(time * Math.PI) * 0.08;

      // Drag inertia logic vs slow Y idle spin
      if (isDragging) {
        // Slow down slightly on drag holds
      } else {
        // Inertia spin decays
        coin.rotation.z += velocityX;
        coin.rotation.x += velocityY;

        velocityX *= 0.94;
        velocityY *= 0.94;

        // Base Idle slow Y-axis spin
        const targetRotSpeedY = isHovered ? 0.02 : 0.005;
        rotSpeedY += (targetRotSpeedY - rotSpeedY) * 0.1;
        coin.rotation.z -= rotSpeedY;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup Resources
    return () => {
      cancelAnimationFrame(animationFrameId);

      mouseContainer.removeEventListener("mouseenter", onMouseEnter);
      mouseContainer.removeEventListener("mouseleave", onMouseLeave);
      mouseContainer.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      
      mouseContainer.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);

      // Free GPU geometries and materials
      coinGeometry.dispose();
      materials.forEach((mat) => mat.dispose());
      frontTexture.dispose();
      backTexture.dispose();
      renderer.dispose();
    };
  }, [isMounted]);

  return (
    <div className="w-full relative select-none">
      {/* Stylesheets injection for premium typography */}
      <link 
        href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&family=Syne:wght@400..800&display=swap" 
        rel="stylesheet" 
      />

      <div 
        ref={containerRef}
        className="w-full min-h-[650px] relative flex flex-col md:block items-center justify-center overflow-visible"
        style={{ background: "transparent" }}
      >
        {/* SVG connection lines between coin and panels (Desktop only) */}
        {isMounted && Object.keys(anchors).length > 0 && (
          <svg 
            ref={svgRef} 
            className="absolute inset-0 pointer-events-none z-0 hidden md:block" 
            width="100%" 
            height="100%"
          >
            {cards.map((card) => {
              const pts = anchors[card.id];
              if (!pts) return null;
              const isHoveringPlan = activePlan === card.id;
              return (
                <g key={card.id}>
                  {/* Glowing anchor dots */}
                  <circle 
                    cx={pts.x1} 
                    cy={pts.y1} 
                    r="4" 
                    fill={isHoveringPlan ? "#00f0ff" : "#a78bfa"} 
                    className="transition-colors duration-300 shadow-lg" 
                  />
                  <line
                    x1={pts.x1}
                    y1={pts.y1}
                    x2={pts.x2}
                    y2={pts.y2}
                    stroke={isHoveringPlan ? "#00f0ff" : "rgba(0, 212, 255, 0.45)"}
                    strokeWidth={isHoveringPlan ? "1.5" : "1.0"}
                    strokeDasharray="4, 4"
                    opacity={isHoveringPlan ? 0.9 : 0.3}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* 1. Dropping Interactive 3D Coin Canvas */}
        <motion.div
          initial={{ y: -160, scale: 0.6, opacity: 0 }}
          whileInView={{ y: 0, scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{
            type: "spring",
            stiffness: 90,
            damping: 11,
            mass: 0.9,
          }}
          className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] flex items-center justify-center relative z-10 cursor-grab active:cursor-grabbing mx-auto"
        >
          <canvas 
            ref={canvasRef} 
            className="w-full h-full pointer-events-auto filter drop-shadow-[0_0_50px_rgba(0,212,255,0.08)]"
            style={{ willChange: "transform" }}
          />
        </motion.div>

        {/* 2. Floating HUD Cards Layout */}
        <div className="w-full flex flex-col md:block gap-4 px-4 md:px-0 mt-4 md:mt-0 relative z-20">
          {cards.map((card) => (
            <motion.a
              key={card.id}
              id={`hud-card-${card.id}`}
              href="https://analystos-terminal.vercel.app/signup"
              onMouseEnter={() => setActivePlan(card.id)}
              onMouseLeave={() => setActivePlan(null)}
              initial={{ 
                x: card.initialX, 
                y: card.initialY, 
                opacity: 0 
              }}
              whileInView={{ x: 0, y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.6,
                delay: card.delay,
                ease: [0.16, 1, 0.3, 1], // premium overshoot bezier
              }}
              whileHover={{ 
                y: -3, 
                scale: 1.02,
                transition: { duration: 0.2 } 
              }}
              className={`block md:absolute w-full md:w-[270px] select-none text-left rounded-lg p-4 transition-all duration-300 ${card.posClass}`}
              style={{
                background: "rgba(6, 10, 16, 0.9)",
                border: activePlan === card.id ? "1px solid rgba(0, 212, 255, 0.6)" : "1px solid rgba(0, 212, 255, 0.15)",
                boxShadow: activePlan === card.id ? "0 0 25px rgba(0, 212, 255, 0.15)" : "0 4px 30px rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex justify-between items-baseline mb-1">
                <span 
                  className="text-[11px] font-bold tracking-widest font-mono transition-colors duration-300"
                  style={{ color: activePlan === card.id ? "#00f0ff" : "#00d4ff" }}
                >
                  {card.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">
                  {card.price}
                </span>
              </div>
              <p 
                className="text-[11px] font-medium leading-relaxed font-sans transition-colors duration-300"
                style={{ color: activePlan === card.id ? "#e2e8f0" : "#4a6080" }}
              >
                {card.desc}
              </p>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
