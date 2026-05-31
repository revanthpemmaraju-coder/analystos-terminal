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
  const cursorRingX = useSpring(mouseCursorX, { stiffness: 220, damping: 26 });
  const cursorRingY = useSpring(mouseCursorY, { stiffness: 220, damping: 26 });

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
      {/* Inner Dot */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          x: mouseCursorX,
          y: mouseCursorY,
          translateX: "-50%",
          translateY: "-50%",
          width: isClicked ? "10px" : (isHovered ? "8px" : "12px"),
          height: isClicked ? "10px" : (isHovered ? "8px" : "12px"),
          borderRadius: "50%",
          backgroundColor: isClicked ? "#34d399" : "#a78bfa",
          boxShadow: isClicked ? "0 0 12px #34d399" : "0 0 8px #a78bfa",
        }}
      />
      {/* Outer Ring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full border"
        style={{
          x: cursorRingX,
          y: cursorRingY,
          translateX: "-50%",
          translateY: "-50%",
          width: isHovered ? "48px" : "36px",
          height: isHovered ? "48px" : "36px",
          borderColor: isClicked ? "#34d399" : "rgba(167, 139, 250, 0.9)",
          borderWidth: isClicked ? "2px" : "1.5px",
          opacity: 0.9,
        }}
      />
    </div>
  );
}
