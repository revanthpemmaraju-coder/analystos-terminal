import { initThreeHeroScene } from "./hero3d.js";

document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================
  // 0. INITIALIZE THREE.JS DYNAMIC 3D SCENE
  // ==========================================
  initThreeHeroScene();

  // ==========================================
  // A. MOUSE PARALLAX ON FLOATING STOCK CARDS
  // ==========================================
  const parallaxCards = document.querySelectorAll(".floating-market-card");
  
  window.addEventListener("mousemove", (e) => {
    const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    
    parallaxCards.forEach(card => {
      let speed = 20;
      if (card.classList.contains("aapl")) {
        speed = 25;
      } else if (card.classList.contains("nvda")) {
        speed = -35;
      } else if (card.classList.contains("reliance")) {
        speed = 15;
      }
      
      card.style.transform = `translate3d(${x * speed}px, ${y * speed}px, 0)`;
    });
  });

  // ==========================================
  // B. MAGNETIC BUTTONS SPRING PHYSICS
  // ==========================================
  const magneticButtons = document.querySelectorAll(".btn-magnetic");
  
  magneticButtons.forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const btnX = rect.left + rect.width / 2;
      const btnY = rect.top + rect.height / 2;
      
      const offsetX = e.clientX - btnX;
      const offsetY = e.clientY - btnY;
      
      const pullFactor = 0.35;
      
      btn.style.transform = `translate3d(${offsetX * pullFactor}px, ${offsetY * pullFactor}px, 0)`;
    });
    
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate3d(0, 0, 0)";
    });
  });

  // ==========================================
  // 1. GLOBAL INTERSECTION OBSERVER (SCROLL ANIMATIONS)
  // ==========================================
  const revealElements = document.querySelectorAll(".reveal");
  
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target); // Trigger once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  });
  
  revealElements.forEach(el => revealObserver.observe(el));

  // ==========================================
  // 2. MOBILE NAVIGATION DRAWER
  // ==========================================
  const mobileToggleBtn = document.getElementById("mobile-toggle");
  const navMenu = document.getElementById("nav-menu");
  const navbarContainer = document.querySelector(".navbar-container");
  
  if (mobileToggleBtn && navMenu && navbarContainer) {
    mobileToggleBtn.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navbarContainer.classList.toggle("menu-open", isOpen);
    });

    // Close mobile menu when links are clicked
    const navLinks = navMenu.querySelectorAll(".nav-link, .nav-btn-mobile");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        navbarContainer.classList.remove("menu-open");
      });
    });
  }

  // ==========================================
  // 3. WAITLIST EMAIL COLLECTION & TOAST PERSISTENCE
  // ==========================================
  const waitlistForm = document.getElementById("waitlist-form");
  const emailInput = document.getElementById("waitlist-email");
  const toastNotification = document.getElementById("waitlist-toast");
  
  const LOCAL_STORAGE_KEY = "analystos_waitlist_signup";
  
  // Disable form if already signed up previously
  const isAlreadySignedUp = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (isAlreadySignedUp && emailInput && waitlistForm) {
    emailInput.disabled = true;
    emailInput.placeholder = "You have claimed your spot!";
    const submitBtn = waitlistForm.querySelector("button");
    if (submitBtn) {
      submitBtn.textContent = "Joined Beta Tier";
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "not-allowed";
    }
  }

  if (waitlistForm && emailInput) {
    waitlistForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      
      // Basic email validation
      if (!email || !email.includes("@") || !email.includes(".")) {
        emailInput.classList.add("input-error-shake");
        
        // Remove shake class after animation finishes
        setTimeout(() => {
          emailInput.classList.remove("input-error-shake");
        }, 400);
        return;
      }

      // Store waitlist email status in localStorage as backup
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        email: email,
        timestamp: new Date().toISOString()
      }));
      
      // Submit to Formspree
      fetch("https://formspree.io/f/mpqnnerd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email })
      }).catch((err) => {
        // Log the error silently to console
        console.error("Formspree connection failed:", err);
      });
      
      // Disable inputs (optimistic UX update)
      emailInput.disabled = true;
      emailInput.value = "";
      emailInput.placeholder = "You have claimed your spot!";
      
      const submitBtn = waitlistForm.querySelector("button");
      if (submitBtn) {
        submitBtn.textContent = "Joined Beta Tier";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.style.cursor = "not-allowed";
      }

      // Show beautiful premium toast alert
      if (toastNotification) {
        toastNotification.classList.add("show");
        
        setTimeout(() => {
          toastNotification.classList.remove("show");
        }, 4000);
      }
    });
  }

  // ==========================================
  // 4. INTERACTIVE FINANCIAL TERMINAL CONTROLLER
  // ==========================================
  const terminalSidebar = document.getElementById("terminal-sidebar");
  const tabButtons = terminalSidebar ? terminalSidebar.querySelectorAll(".sidebar-tab") : [];
  const panels = document.querySelectorAll(".panel-view");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPanelId = btn.getAttribute("data-target");
      
      // Toggle sidebar active tabs
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Toggle panels display with smooth switch transition
      panels.forEach(panel => {
        panel.classList.remove("active");
        if (panel.getAttribute("id") === `panel-${targetPanelId}`) {
          panel.classList.add("active");
        }
      });
      
      // Trigger context resize actions for Canvas rendering if switched to Charts
      if (targetPanelId === "charts") {
        setTimeout(initChartCanvas, 50);
      }
      
      // Trigger AI Analyst automated demo sequence if switched to AI
      if (targetPanelId === "ai") {
        startAIDemoSequence();
      }
    });
  });

  // ==========================================
  // 5. HIGH-DPI CANVAS STOCK CHART GRAPHIC DRAW
  // ==========================================
  const chartCanvas = document.getElementById("terminal-chart");
  let chartContext = null;
  let chartCoordinatesData = [];
  
  function initChartCanvas() {
    if (!chartCanvas) {
      return;
    }
    
    chartContext = chartCanvas.getContext("2d");
    if (!chartContext) {
      return;
    }

    // Solve for blurry canvas coordinates on modern high DPI screens
    const rect = chartCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    chartCanvas.width = rect.width * dpr;
    chartCanvas.height = rect.height * dpr;
    chartContext.scale(dpr, dpr);
    
    // Draw high quality mock stock curve data (12 points representing historical quotes)
    const padding = 30;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    
    // AAPL sample stock data quotes: Q1-Q4 progression
    const stockQuotes = [150.2, 155.8, 148.4, 160.1, 168.5, 162.0, 172.4, 169.5, 178.2, 185.0, 179.3, 182.52];
    const quarters = ["Q1-25", "Feb", "Mar", "Q2-25", "May", "Jun", "Q3-25", "Aug", "Sep", "Q4-25", "Nov", "Dec"];
    
    const minVal = 140;
    const maxVal = 190;
    const valRange = maxVal - minVal;
    
    // Convert stock quotes to Canvas render pixel points
    chartCoordinatesData = stockQuotes.map((val, index) => {
      const x = padding + (index / (stockQuotes.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((val - minVal) / valRange) * chartHeight;
      return { x, y, price: val, date: quarters[index] };
    });

    drawChartStatic();
  }

  function drawChartStatic() {
    if (!chartCanvas || !chartContext) {
      return;
    }
    
    const rect = chartCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    // Clear Canvas
    chartContext.clearRect(0, 0, w, h);
    
    // 1. Draw Grid Lines
    chartContext.strokeStyle = "rgba(255, 255, 255, 0.04)";
    chartContext.lineWidth = 1;
    
    // Vertical grid lines
    const gridCols = 8;
    for (let i = 0; i <= gridCols; i++) {
      const x = 30 + (i / gridCols) * (w - 60);
      chartContext.beginPath();
      chartContext.moveTo(x, 15);
      chartContext.lineTo(x, h - 25);
      chartContext.stroke();
    }
    
    // Horizontal grid lines
    const gridRows = 5;
    for (let i = 0; i <= gridRows; i++) {
      const y = 30 + (i / gridRows) * (h - 55);
      chartContext.beginPath();
      chartContext.moveTo(25, y);
      chartContext.lineTo(w - 25, y);
      chartContext.stroke();
    }
    
    // 2. Draw Price Axes Labels
    chartContext.fillStyle = "#4D4E5B";
    chartContext.font = "10px 'JetBrains Mono', monospace";
    chartContext.textAlign = "right";
    
    // Y-Axis price markings
    chartContext.fillText("$190", 25, 33);
    chartContext.fillText("$175", 25, (h - 40) * 0.35 + 15);
    chartContext.fillText("$160", 25, (h - 40) * 0.7 + 5);
    chartContext.fillText("$140", 25, h - 22);

    // 3. Draw Bottom Date Axis Labels
    chartContext.textAlign = "center";
    chartContext.fillText("JAN", 30, h - 8);
    chartContext.fillText("MAR", 30 + (w - 60) * 0.22, h - 8);
    chartContext.fillText("JUN", 30 + (w - 60) * 0.48, h - 8);
    chartContext.fillText("SEP", 30 + (w - 60) * 0.74, h - 8);
    chartContext.fillText("DEC", w - 30, h - 8);
    
    // 4. Render Simulated Volume Columns
    chartCoordinatesData.forEach(pt => {
      const volHeight = Math.abs(Math.sin(pt.x) * 45) + 15; // Fake volume logic
      chartContext.fillStyle = "rgba(16, 185, 129, 0.08)";
      chartContext.fillRect(pt.x - 6, h - 25 - volHeight, 12, volHeight);
    });

    // 5. Draw Primary Chart Line
    chartContext.beginPath();
    chartContext.strokeStyle = "#2D7EF8";
    chartContext.lineWidth = 2.5;
    chartContext.lineCap = "round";
    chartContext.lineJoin = "round";
    
    chartCoordinatesData.forEach((pt, idx) => {
      if (idx === 0) {
        chartContext.moveTo(pt.x, pt.y);
      } else {
        chartContext.lineTo(pt.x, pt.y);
      }
    });
    chartContext.stroke();
    
    // 6. Draw Gradient Area Fill under the Chart Line
    const fillGrad = chartContext.createLinearGradient(0, 30, 0, h - 25);
    fillGrad.addColorStop(0, "rgba(45, 126, 248, 0.2)");
    fillGrad.addColorStop(1, "rgba(45, 126, 248, 0.00)");
    
    chartContext.beginPath();
    chartCoordinatesData.forEach((pt, idx) => {
      if (idx === 0) {
        chartContext.moveTo(pt.x, pt.y);
      } else {
        chartContext.lineTo(pt.x, pt.y);
      }
    });
    chartContext.lineTo(chartCoordinatesData[chartCoordinatesData.length - 1].x, h - 25);
    chartContext.lineTo(chartCoordinatesData[0].x, h - 25);
    chartContext.closePath();
    chartContext.fillStyle = fillGrad;
    chartContext.fill();
    
    // 7. Draw Glow points at terminals
    const activePt = chartCoordinatesData[chartCoordinatesData.length - 1];
    chartContext.fillStyle = "#10B981"; // Emerald green last quote price
    chartContext.strokeStyle = "#FFFFFF";
    chartContext.lineWidth = 1.5;
    chartContext.beginPath();
    chartContext.arc(activePt.x, activePt.y, 5, 0, Math.PI * 2);
    chartContext.fill();
    chartContext.stroke();
  }

  // Draw Dynamic Interactive Crosshair Tracks on Hover
  if (chartCanvas) {
    chartCanvas.addEventListener("mousemove", (e) => {
      if (!chartContext || chartCoordinatesData.length === 0) {
        return;
      }
      
      const rect = chartCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      // Snap to closest data point
      let closestPt = chartCoordinatesData[0];
      let minDist = Math.abs(mouseX - closestPt.x);
      
      chartCoordinatesData.forEach(pt => {
        const dist = Math.abs(mouseX - pt.x);
        if (dist < minDist) {
          minDist = dist;
          closestPt = pt;
        }
      });

      // Redraw base chart
      drawChartStatic();
      
      // Draw horizontal crosshair dashed line
      chartContext.strokeStyle = "rgba(45, 126, 248, 0.3)";
      chartContext.lineWidth = 1;
      chartContext.setLineDash([4, 4]);
      
      chartContext.beginPath();
      chartContext.moveTo(25, closestPt.y);
      chartContext.lineTo(rect.width - 25, closestPt.y);
      chartContext.stroke();
      
      // Draw vertical crosshair dashed line
      chartContext.beginPath();
      chartContext.moveTo(closestPt.x, 15);
      chartContext.lineTo(closestPt.x, rect.height - 25);
      chartContext.stroke();
      
      // Clear line dash for next redraws
      chartContext.setLineDash([]);
      
      // Draw Snapped Data Point Hover Ring
      chartContext.fillStyle = "#2D7EF8";
      chartContext.strokeStyle = "#FFFFFF";
      chartContext.lineWidth = 1.5;
      chartContext.beginPath();
      chartContext.arc(closestPt.x, closestPt.y, 4, 0, Math.PI * 2);
      chartContext.fill();
      chartContext.stroke();
      
      // Position and show HTML Tooltip overlay
      const tooltip = document.getElementById("chart-tooltip");
      if (tooltip) {
        tooltip.style.opacity = "1";
        tooltip.style.left = `${closestPt.x + 10}px`;
        tooltip.style.top = `${closestPt.y - 45}px`;
        
        const tooltipDate = tooltip.querySelector(".tooltip-date");
        const tooltipPrice = tooltip.querySelector(".tooltip-price");
        if (tooltipDate) {
          tooltipDate.textContent = `AAPL ${closestPt.date}`;
        }
        if (tooltipPrice) {
          tooltipPrice.textContent = `$${closestPt.price.toFixed(2)}`;
        }
      }
    });

    chartCanvas.addEventListener("mouseleave", () => {
      drawChartStatic();
      const tooltip = document.getElementById("chart-tooltip");
      if (tooltip) {
        tooltip.style.opacity = "0";
      }
    });
  }

  // Trigger init on startup
  initChartCanvas();
  window.addEventListener("resize", () => {
    // Redraw charts correctly if viewport resets
    if (chartCanvas && chartCanvas.offsetParent !== null) {
      initChartCanvas();
    }
  });

  // ==========================================
  // 6. LIVE DCF VALUATION ENGINE CALCS
  // ==========================================
  const dcfEbitdaInput = document.getElementById("dcf-ebitda");
  const dcfGrowthInput = document.getElementById("dcf-growth");
  const dcfWaccInput = document.getElementById("dcf-wacc");
  const dcfMultipleInput = document.getElementById("dcf-multiple");
  
  const dcfOutputEv = document.getElementById("dcf-output-ev");
  const dcfOutputPrice = document.getElementById("dcf-output-price");
  const pvProgressBar = document.querySelector(".prog-bar.pv");
  const tvProgressBar = document.querySelector(".prog-bar.tv");

  function formatIndianCurrency(num) {
    if (num >= 10000000) {
      const crVal = num / 10000000;
      return "₹" + crVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Cr";
    } else if (num >= 100000) {
      const lVal = num / 100000;
      return "₹" + lVal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " L";
    } else {
      return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  function runDCFRecalculation() {
    if (!dcfEbitdaInput || !dcfGrowthInput || !dcfWaccInput || !dcfMultipleInput) {
      return;
    }
    
    // Retrieve float values from inputs (convert Lakhs to absolute Rupees)
    const ebitda = (parseFloat(dcfEbitdaInput.value) || 0) * 100000;
    const growth = (parseFloat(dcfGrowthInput.value) || 0) / 100;
    const wacc = (parseFloat(dcfWaccInput.value) || 0.1) / 100; // Guard WACC > 0
    const multiple = parseFloat(dcfMultipleInput.value) || 0;
    
    // Project 5 years EBITDA & Cash Flows (Assume basic 100% Free Cash Flow conversion for sandbox brevity)
    let currentCashFlow = ebitda;
    let sumPV = 0;
    
    for (let yr = 1; yr <= 5; yr++) {
      currentCashFlow = currentCashFlow * (1 + growth);
      const pv = currentCashFlow / Math.pow(1 + wacc, yr);
      sumPV += pv;
    }
    
    // Terminal Value calculation (Growth exit multiple terminal value approach)
    const terminalValue = currentCashFlow * multiple;
    const pvOfTerminalValue = terminalValue / Math.pow(1 + wacc, 5);
    
    // Total Enterprise Value
    const enterpriseValue = sumPV + pvOfTerminalValue;
    
    // sharesOutstanding definition (1 crore shares)
    const sharesOutstanding = 10000000;
    const impliedSharePrice = enterpriseValue / sharesOutstanding;
    
    // Format and render display metrics
    if (dcfOutputEv) {
      dcfOutputEv.textContent = formatIndianCurrency(enterpriseValue);
    }
    
    if (dcfOutputPrice) {
      dcfOutputPrice.textContent = "₹" + impliedSharePrice.toFixed(2);
    }
    
    // Adjust progressive bar widths matching PV vs TV contribution percentages
    if (pvProgressBar && tvProgressBar) {
      const pvPercent = Math.max(5, Math.min(95, (sumPV / enterpriseValue) * 100)) || 40;
      const tvPercent = 100 - pvPercent;
      
      pvProgressBar.style.width = `${pvPercent}%`;
      tvProgressBar.style.width = `${tvPercent}%`;
      
      pvProgressBar.setAttribute("title", `PV of Cash Flows (${pvPercent.toFixed(0)}%)`);
      tvProgressBar.setAttribute("title", `Terminal Value (${tvPercent.toFixed(0)}%)`);
    }

    // Generate dynamic sensitivity analysis grid HTML
    const sensWrapper = document.getElementById("dcf-sensitivity-table-wrapper");
    if (sensWrapper) {
      const rawWaccVal = parseFloat(dcfWaccInput.value) || 9.0;
      const rawMultipleVal = parseFloat(dcfMultipleInput.value) || 14.0;
      
      const multiplesList = [rawMultipleVal - 2, rawMultipleVal, rawMultipleVal + 2];
      const waccList = [rawWaccVal - 1.0, rawWaccVal, rawWaccVal + 1.0];
      
      let tableHTML = "<table class=\"sens-grid-table\">";
      tableHTML += `<thead><tr><th>WACC \\ Mult</th><th>${multiplesList[0]}x</th><th class="active-col">${multiplesList[1]}x (Base)</th><th>${multiplesList[2]}x</th></tr></thead>`;
      tableHTML += "<tbody>";
      
      waccList.forEach(w => {
        const wDecimal = w / 100;
        tableHTML += `<tr><td class="sens-wacc-label">${w.toFixed(1)}%</td>`;
        multiplesList.forEach(m => {
          let tempCashFlow = ebitda;
          let tempSumPV = 0;
          for (let yr = 1; yr <= 5; yr++) {
            tempCashFlow = tempCashFlow * (1 + growth);
            const pv = tempCashFlow / Math.pow(1 + wDecimal, yr);
            tempSumPV += pv;
          }
          const tv = tempCashFlow * m;
          const pvOfTv = tv / Math.pow(1 + wDecimal, 5);
          const ev = tempSumPV + pvOfTv;
          const price = ev / sharesOutstanding;
          
          const isCenter = (Math.abs(w - rawWaccVal) < 0.01 && Math.abs(m - rawMultipleVal) < 0.01);
          const cellClass = isCenter ? "class=\"sens-cell active-cell\"" : "class=\"sens-cell\"";
          tableHTML += `<td ${cellClass}>₹${price.toFixed(2)}</td>`;
        });
        tableHTML += "</tr>";
      });
      
      tableHTML += "</tbody></table>";
      sensWrapper.innerHTML = tableHTML;
    }
  }

  // Register Event Inputs triggers
  const dcfInputs = [dcfEbitdaInput, dcfGrowthInput, dcfWaccInput, dcfMultipleInput];
  dcfInputs.forEach(input => {
    if (input) {
      input.addEventListener("input", runDCFRecalculation);
    }
  });

  // Init sandbox on load
  runDCFRecalculation();

  // ==========================================
  // 7. SIMULATED STREAMING AI CONSOLE SCREEN
  // ==========================================
  const aiChatLog = document.getElementById("ai-chat-history");
  const aiStreamingLine = document.getElementById("ai-streaming-text");
  const aiConsoleInput = document.getElementById("terminal-chat-input");
  const sendConsoleBtn = document.getElementById("send-terminal-msg");
  
  let isDemoPlayed = false;
  
  function startAIDemoSequence() {
    if (isDemoPlayed || !aiStreamingLine) {
      return;
    }
    isDemoPlayed = true;

    const demoReportLines = [
      "\nExecuting: Reliance Industries (RELIANCE) Q3 Analysis Engine v4.0",
      "----------------------------------------------------------------",
      "Revenue: ₹2.48 Lakh Cr (+3.2% YoY) | EBITDA Margin: 17.5% (Strong)",
      "Net Profit: ₹17,200 Cr vs ₹16,800 Cr estimated (Beat of 2.4%)",
      "Key Drivers: Retail revenue grows 10.4% YoY. Oil-to-Chemicals steady.",
      "DCF Implications: Growth projection updated to 11.5% for FY26.",
      "Valuation Verdict: Solid EBITDA support; implied trading gap suggests 6.5% upside.",
      "\nReady for next financial query. Type command above."
    ];

    let lineIndex = 0;
    let charIndex = 0;
    aiStreamingLine.textContent = "";
    aiStreamingLine.classList.add("typing");
    
    function streamText() {
      if (lineIndex < demoReportLines.length) {
        const currentLine = demoReportLines[lineIndex];
        
        if (charIndex < currentLine.length) {
          aiStreamingLine.textContent += currentLine.charAt(charIndex);
          charIndex++;
          setTimeout(streamText, 8); // Fast simulation flow speed
        } else {
          aiStreamingLine.textContent += "\n";
          lineIndex++;
          charIndex = 0;
          setTimeout(streamText, 100);
        }
      } else {
        aiStreamingLine.classList.remove("typing");
      }
    }
    
    setTimeout(streamText, 400);
  }

  function handleUserConsoleSubmission() {
    if (!aiConsoleInput || !aiChatLog) {
      return;
    }
    
    const rawInput = aiConsoleInput.value.trim();
    if (!rawInput) {
      return;
    }
    
    aiConsoleInput.value = "";
    
    // Append User Command to historical log
    const userMsgEl = document.createElement("div");
    userMsgEl.className = "chat-message user";
    userMsgEl.innerHTML = `<span class="console-prompt">&gt;</span> ${rawInput}`;
    aiChatLog.appendChild(userMsgEl);
    
    // Auto-Scroll terminal down
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
    
    // Generate simulated AI reply
    const replyEl = document.createElement("div");
    replyEl.className = "chat-message system typing";
    replyEl.textContent = "Connecting to market indices...";
    aiChatLog.appendChild(replyEl);
    
    aiChatLog.scrollTop = aiChatLog.scrollHeight;

    // Call live local Express API Gateway
    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: rawInput })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error("HTTP error " + res.status);
      }
      return res.text();
    })
    .then(text => {
      startStreaming(text);
    })
    .catch(err => {
      console.error("Local API Gateway call failed:", err);
      startStreaming("\nAnalystOS AI is initialising. Please try again in a moment.");
    });

    function startStreaming(text) {
      let charIndex = 0;
      replyEl.textContent = "";
      
      function streamCustomReply() {
        if (charIndex < text.length) {
          replyEl.textContent += text.charAt(charIndex);
          charIndex++;
          aiChatLog.scrollTop = aiChatLog.scrollHeight;
          setTimeout(streamCustomReply, 10);
        } else {
          replyEl.classList.remove("typing");
        }
      }
      
      streamCustomReply();
    }
  }

  // Binds console form triggers
  if (aiConsoleInput) {
    aiConsoleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleUserConsoleSubmission();
      }
    });
  }
  
  if (sendConsoleBtn) {
    sendConsoleBtn.addEventListener("click", handleUserConsoleSubmission);
  }

  // Click handler for interactive terminal AI suggestions
  const suggestionButtons = document.querySelectorAll(".sug-btn");
  suggestionButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const promptText = btn.getAttribute("data-prompt");
      if (promptText && aiConsoleInput) {
        aiConsoleInput.value = promptText;
        handleUserConsoleSubmission();
      }
    });
  });

  // ==========================================
  // 8. DYNAMIC COUNTDOWN & AUTOMATIC LAUNCH STATE
  // ==========================================
  // Target date set to exactly 5 days from May 30, 2026 (Launch: June 4, 2026)
  const targetLaunchDate = new Date("2026-06-04T00:00:00+05:30");
  const heroBadge = document.getElementById("hero-badge");
  
  // CTA selectors
  const heroPrimaryCTA = document.getElementById("btn-hero-primary");
  const heroSecondaryCTA = document.getElementById("btn-hero-secondary");
  const freeTierCTA = document.getElementById("btn-free-choose");
  const proTierCTA = document.getElementById("btn-pro-choose");
  const analystTierCTA = document.getElementById("btn-analyst-choose");
  
  let isSiteLive = false;
  let countdownTimerId = null;

  function updateCountdownUI() {
    const now = new Date();
    const distance = targetLaunchDate - now;

    if (distance <= 0) {
      // Transition site to live state automatically!
      isSiteLive = true;
      clearInterval(countdownTimerId);
      
      if (heroBadge) {
        heroBadge.innerHTML = "<span class=\"badge-pulse\"></span> Live Access Active 🟢";
      }
      
      // Update button copy to LIVE CTA titles
      if (heroPrimaryCTA) {
        heroPrimaryCTA.textContent = "Get Pro Access";
      }
      if (heroSecondaryCTA) {
        heroSecondaryCTA.textContent = "Sign In Now";
      }
      if (freeTierCTA) {
        freeTierCTA.textContent = "Claim Instant Access";
      }
      if (proTierCTA) {
        proTierCTA.textContent = "Claim Pro Tier Now";
      }
      if (analystTierCTA) {
        analystTierCTA.textContent = "Claim Analyst Access";
      }
      
    } else {
      // Tick-by-tick countdown
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      if (heroBadge) {
        heroBadge.innerHTML = `<span class="badge-pulse"></span> Launching in: <span class="badge-countdown">${days}d ${hours}h ${minutes}m ${seconds}s</span>`;
      }
    }
  }

  // Init countdown ticking
  countdownTimerId = setInterval(updateCountdownUI, 1000);
  updateCountdownUI(); // Initial immediately evaluation

  // ==========================================
  // 9. PREMIUM AUTHENTICATION & PAYMENT MODAL REGISTRATION
  // ==========================================
  const authModal = document.getElementById("auth-modal");
  const authCloseBtn = document.getElementById("auth-close-btn");
  const authTabSignIn = document.getElementById("tab-btn-signin");
  const authTabSignUp = document.getElementById("tab-btn-signup");
  const authNameGroup = document.getElementById("auth-group-name");
  
  const authForm = document.getElementById("auth-form");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");
  const authSubmitButton = document.getElementById("auth-submit-button");
  const authErrorMessage = document.getElementById("auth-error-message");
  
  let currentAuthTab = "signin"; // Tab toggle states: signin / signup

  function showAuthModal() {
    if (authModal) {
      authModal.classList.add("show");
      if (authErrorMessage) {
        authErrorMessage.classList.add("hidden");
      }
    }
  }

  function hideAuthModal() {
    if (authModal) {
      authModal.classList.remove("show");
    }
  }

  if (authCloseBtn) {
    authCloseBtn.addEventListener("click", hideAuthModal);
  }

  // Toggles active tabs
  if (authTabSignIn && authTabSignUp && authNameGroup) {
    authTabSignIn.addEventListener("click", () => {
      currentAuthTab = "signin";
      authTabSignIn.classList.add("active");
      authTabSignUp.classList.remove("active");
      authNameGroup.classList.add("hidden");
      
      authTitle.textContent = "AnalystOS Gateway";
      authSubtitle.textContent = "Verify credentials to unlock terminal";
      authSubmitButton.textContent = "Verify & Unlock";
    });

    authTabSignUp.addEventListener("click", () => {
      currentAuthTab = "signup";
      authTabSignUp.classList.add("active");
      authTabSignIn.classList.remove("active");
      authNameGroup.classList.remove("hidden");
      
      authTitle.textContent = "Create Account";
      authSubtitle.textContent = "Join the elite tier of equity researchers";
      authSubmitButton.textContent = "Unlock Pro Access (₹499)";
    });
  }

  // Wire CTA buttons to open Auth Modal in Live mode
  const registerLiveCTA = (element) => {
    if (element) {
      element.addEventListener("click", (e) => {
        if (isSiteLive) {
          e.preventDefault();
          showAuthModal();
        }
      });
    }
  };

  registerLiveCTA(heroPrimaryCTA);
  registerLiveCTA(heroSecondaryCTA);
  registerLiveCTA(freeTierCTA);
  registerLiveCTA(proTierCTA);
  registerLiveCTA(analystTierCTA);

  // Form submit handler connected securely to Supabase backend API
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const nameVal = document.getElementById("auth-name").value.trim();
      const emailVal = document.getElementById("auth-email").value.trim();
      const passwordVal = document.getElementById("auth-password").value;
      
      if (authErrorMessage) {
        authErrorMessage.classList.add("hidden");
      }
      
      authSubmitButton.disabled = true;
      authSubmitButton.style.opacity = "0.7";
      authSubmitButton.textContent = "Verifying Gateway...";
      
      fetch(`/api/auth?action=${currentAuthTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: nameVal,
          email: emailVal,
          password: passwordVal
        })
      })
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => { throw new Error(text); });
        }
        return res.json();
      })
      .then(data => {
        authSubmitButton.disabled = false;
        authSubmitButton.style.opacity = "1";
        authSubmitButton.textContent = currentAuthTab === "signin" ? "Verify & Unlock" : "Unlock Pro Access (₹499)";

        
        if (currentAuthTab === "signup") {
          // New account created: Instantly trigger secure Razorpay checkout!
          triggerRazorpayPayment(data.user);
        } else {
          // Signin successful: Grant access
          hideAuthModal();
          // Trigger premium toast notification
          showCustomToast("Access Granted!", "Terminal successfully unlocked.");
        }
      })
      .catch(err => {
        console.error("Auth transaction failed:", err);
        authSubmitButton.disabled = false;
        authSubmitButton.style.opacity = "1";
        authSubmitButton.textContent = currentAuthTab === "signin" ? "Verify & Unlock" : "Unlock Pro Access (₹499)";
        
        if (authErrorMessage) {
          authErrorMessage.textContent = err.message || "Credential verification failed.";
          authErrorMessage.classList.remove("hidden");
        }
      });
    });
  }

  // ==========================================
  // 10. REAL-WORLD RAZORPAY UPI & CARD GATEWAY
  // ==========================================
  function triggerRazorpayPayment(user) {
    if (!window.Razorpay) {
      showCustomToast("Error Loading Gateway", "Please check your internet connection.");
      return;
    }

    authSubmitButton.disabled = true;
    authSubmitButton.textContent = "Initializing Secure UPI Gateway...";

    // 1. Create a secure payment order on the backend
    fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        userId: user.id
      })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error("Payment Gateway creation failed.");
      }
      return res.json();
    })
    .then(order => {
      authSubmitButton.disabled = false;
      authSubmitButton.textContent = "Unlock Pro Access (₹499)";
      
      // 2. Open standard Razorpay Checkout window
      const options = {
        key: "rzp_test_fallback_id", // Backend handles key verification, frontend loads UI
        amount: order.amount,
        currency: order.currency,
        name: "AnalystOS Pro",
        description: "Institutional Research Subscription",
        order_id: order.id,
        handler: function(response) {
          // Secure signature verification on backend (SHA-256 HMAC)
          fetch("/api/payments/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              userId: user.id,
              simulation: order.simulation
            })
          })
          .then(res => res.json())
          .then(verifyData => {
            if (verifyData.verified) {
              hideAuthModal();
              showCustomToast("Subscription Verified!", "Welcome to Pro. UPI Transaction Complete.");
            } else {
              showCustomToast("Verification Failed", "Signature verification failed.");
            }
          })
          .catch(err => {
            console.error("Signature verification crashed:", err);
            showCustomToast("Network Error", "Signature verification failed.");
          });
        },
        prefill: {
          name: user.fullName || "",
          email: user.email || ""
        },
        notes: {
          address: "AnalystOS Headquarters, Bangalore"
        },
        theme: {
          color: "#2D7EF8"
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
    })
    .catch(err => {
      console.error("Order creation failed:", err);
      authSubmitButton.disabled = false;
      authSubmitButton.textContent = "Unlock Pro Access (₹499)";
      showCustomToast("Gateway Blocked", "Failed to contact secure payments hub.");
    });
  }

  // Toast Helper
  function showCustomToast(title, desc) {
    const toast = document.getElementById("waitlist-toast");
    if (toast) {
      const toastTitle = toast.querySelector(".toast-title");
      const toastDesc = toast.querySelector(".toast-desc");
      if (toastTitle) {
        toastTitle.textContent = title;
      }
      if (toastDesc) {
        toastDesc.textContent = desc;
      }
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
      }, 4000);
    }
  }
});
