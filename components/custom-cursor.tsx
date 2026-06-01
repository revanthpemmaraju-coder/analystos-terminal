/* eslint-disable */
"use client";


import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [isMounted, setIsMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const mouseCursorX = useMotionValue(0);
  const mouseCursorY = useMotionValue(0);
  
  // Highly-damped hyper-smooth spring for the inner dot to eliminate harsh pixel jumps
  const cursorDotX = useSpring(mouseCursorX, { stiffness: 850, damping: 38 });
  const cursorDotY = useSpring(mouseCursorY, { stiffness: 850, damping: 38 });

  // Floppy trailing liquid spring for the outer ring
  const cursorRingX = useSpring(mouseCursorX, { stiffness: 130, damping: 20 });
  const cursorRingY = useSpring(mouseCursorY, { stiffness: 130, damping: 20 });

  useEffect(() => {
    setIsMounted(true);
    // Initialize to center screen
    mouseCursorX.set(window.innerWidth / 2);
    mouseCursorY.set(window.innerHeight / 2);

    const moveCursor = (e: MouseEvent) => {
      mouseCursorX.set(e.clientX);
      mouseCursorY.set(e.clientY);
    };

    const handleHoverTarget = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isInteractive = 
        target.tagName === "BUTTON" || 
        target.tagName === "A" || 
        target.tagName === "INPUT" || 
        target.tagName === "SELECT" || 
        target.tagName === "TEXTAREA" ||
        !!target.closest("button") || 
        !!target.closest("a") || 
        target.classList.contains("clickable") ||
        target.classList.contains("cursor-pointer") ||
        target.style.cursor === "pointer";
      
      setIsHovered(isInteractive);
    };

    const handleMouseDown = () => setIsClicked(true);
    const handleMouseUp = () => setIsClicked(false);

    window.addEventListener("mousemove", moveCursor, { passive: true });
    window.addEventListener("mouseover", handleHoverTarget, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });
    window.addEventListener("mouseup", handleMouseUp, { passive: true });

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleHoverTarget);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [mouseCursorX, mouseCursorY]);

  if (!isMounted) return null;

  return (
    <div className="hidden md:block">
      {/* Inner Dot — Silky smooth spring trailing */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: cursorDotX,
          y: cursorDotY,
          translateX: "-50%",
          translateY: "-50%",
          width: isClicked ? "8px" : (isHovered ? "6px" : "10px"),
          height: isClicked ? "8px" : (isHovered ? "6px" : "10px"),
          borderRadius: "50%",
          backgroundColor: isClicked ? "#34d399" : (isHovered ? "#00d4ff" : "#a78bfa"),
          boxShadow: isClicked 
            ? "0 0 16px 4px rgba(52, 211, 153, 0.8)" 
            : (isHovered 
                ? "0 0 12px 2px rgba(0, 212, 255, 0.7)" 
                : "0 0 8px rgba(167, 139, 250, 0.5)"),
          willChange: "transform",
        }}
      />
      {/* Outer Ring — Floppy trailing liquid spring with glow and hover expansion */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full border transition-all duration-300"
        style={{
          x: cursorRingX,
          y: cursorRingY,
          translateX: "-50%",
          translateY: "-50%",
          width: isClicked ? "24px" : (isHovered ? "56px" : "36px"),
          height: isClicked ? "24px" : (isHovered ? "56px" : "36px"),
          borderColor: isClicked 
            ? "#34d399" 
            : (isHovered ? "rgba(0, 212, 255, 0.85)" : "rgba(167, 139, 250, 0.6)"),
          borderWidth: isClicked ? "2px" : (isHovered ? "1.5px" : "1.0px"),
          backgroundColor: isClicked 
            ? "rgba(52, 211, 153, 0.08)" 
            : (isHovered ? "rgba(0, 212, 255, 0.05)" : "rgba(167, 139, 250, 0.02)"),
          boxShadow: isHovered 
            ? "0 0 15px rgba(0, 212, 255, 0.12), inset 0 0 10px rgba(0, 212, 255, 0.05)" 
            : "none",
          backdropFilter: isHovered ? "blur(2px)" : "none",
          opacity: 0.9,
          willChange: "transform",
        }}
      />
    </div>
  );
}
