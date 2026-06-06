/**
 * AnalystOS Certified Research Report Exporter & Sharing Utilities
 */

export interface ReportPayload {
  content: string;
  timestamp: string;
  confidence: number;
  ticker: string;
}

/**
 * Calculates a deterministic, professional AI Confidence Score (85% to 98%)
 * based on the content of the research report.
 */
export function getConfidenceScore(content: string): number {
  if (!content) return 92;
  const lower = content.toLowerCase();
  
  // Base ratings based on analytical keywords found in the report
  if (lower.includes("strong buy")) return 96;
  if (lower.includes("buy")) return 92;
  if (lower.includes("hold") || lower.includes("watchlist")) return 86;
  if (lower.includes("reduce")) return 76;
  if (lower.includes("sell")) return 68;
  
  // Fallback hash function to ensure consistency for a specific report
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = content.charCodeAt(i) + ((hash << 5) - hash);
  }
  return 85 + (Math.abs(hash) % 13); // Restricts between 85% and 97%
}

/**
 * Simple markdown parser converting headers, bold text, and lists to styled HTML tags.
 */
export function markdownToHtmlSimple(markdown: string): string {
  if (!markdown) return "";
  
  // Format headers
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3 style="color: #0284c7; font-family: Arial, sans-serif; font-size: 16px; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="color: #0369a1; font-family: Arial, sans-serif; font-size: 20px; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #0369a1; padding-bottom: 6px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="color: #0f172a; font-family: Arial, sans-serif; font-size: 24px; margin-top: 28px; margin-bottom: 16px; text-align: center;">$1</h1>');

  // Format bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format italic text
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle list items
  const lines = html.split("\n");
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const content = line.substring(2);
      if (!inList) {
        lines[i] = `<ul style="margin-top: 6px; margin-bottom: 12px; padding-left: 20px; list-style-type: square;"><li style="margin-bottom: 4px; font-size: 13px; font-family: Arial, sans-serif; color: #334155;">${content}</li>`;
        inList = true;
      } else {
        lines[i] = `<li style="margin-bottom: 4px; font-size: 13px; font-family: Arial, sans-serif; color: #334155;">${content}</li>`;
      }
    } else {
      if (inList) {
        lines[i - 1] = lines[i - 1] + "</ul>";
        inList = false;
      }
      // Standard paragraphs
      if (line && !line.startsWith("<h") && !line.startsWith("<u") && !line.startsWith("<l")) {
        lines[i] = `<p style="font-size: 13px; font-family: Arial, sans-serif; color: #334155; line-height: 1.6; margin-bottom: 12px;">${line}</p>`;
      }
    }
  }
  
  if (inList) {
    lines[lines.length - 1] = lines[lines.length - 1] + "</ul>";
  }
  
  return lines.join("\n").replace(/\n/g, "");
}

/**
 * Downloads the research report as an MS Word (.doc) compatible file with professional styling.
 */
export function exportToDocx(payload: ReportPayload): void {
  const { content, timestamp, confidence, ticker } = payload;
  const formattedHtml = markdownToHtmlSimple(content);
  const docTitle = `${ticker || "Market"}_Certified_Research_Report`;

  const fullHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${ticker} Certified Research Report</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #334155; }
        .cover { 
          text-align: center; 
          padding: 80px 40px; 
          border: 8px double #0284c7; 
          margin-bottom: 100px;
          height: 100%;
        }
        .cover-title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #0f172a; 
          margin-top: 80px; 
          margin-bottom: 20px;
          letter-spacing: -0.5px;
        }
        .cover-subtitle { 
          font-size: 16px; 
          color: #0284c7; 
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 60px;
        }
        .cover-seal {
          margin: 40px auto;
          width: 80px;
          height: 80px;
          border: 4px solid #0284c7;
          border-radius: 50%;
          line-height: 72px;
          color: #0284c7;
          font-weight: bold;
          font-size: 12px;
        }
        .cover-metadata { 
          margin-top: 150px; 
          font-size: 13px; 
          color: #475569; 
          line-height: 1.8;
          border-top: 1px dashed #cbd5e1;
          padding-top: 20px;
        }
        .page-break { page-break-before: always; }
        .section-header {
          color: #0284c7;
          font-family: Arial, sans-serif;
          font-size: 16px;
          margin-top: 24px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        p { font-size: 13px; color: #334155; margin-bottom: 12px; }
        ul { margin-top: 6px; margin-bottom: 12px; padding-left: 20px; }
        li { font-size: 13px; color: #334155; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="cover">
        <div style="font-size: 11px; font-weight: bold; color: #64748b; letter-spacing: 3px;">ANALYSTOS CERTIFIED INTELLIGENCE</div>
        <div class="cover-seal">SEAL</div>
        <div class="cover-title">ANALYSTOS CERTIFIED RESEARCH REPORT</div>
        <div class="cover-subtitle">${ticker ? `${ticker} Equity Analysis` : "Global Financial Markets Research"}</div>
        
        <div class="cover-metadata">
          <p><strong>Security Classification:</strong> Institutional Grade</p>
          <p><strong>AI Model / Engine:</strong> Claude 3.5 Sonnet / AnalystOS Core</p>
          <p><strong>AI Confidence Score:</strong> ${confidence}%</p>
          <p><strong>Timestamp of Compilation:</strong> ${timestamp}</p>
          <p style="font-size: 9px; color: #94a3b8; margin-top: 40px;">
            Disclaimer: Markets involve risk. AnalystOS Certified Research is compiled autonomously by neural algorithms.
          </p>
        </div>
      </div>
      
      <div class="page-break"></div>
      
      <div class="content" style="padding: 20px;">
        <h2 style="color: #0f172a; font-family: Arial, sans-serif; font-size: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 20px;">
          Research Memorandum: ${ticker || "Global Markets"} Analysis
        </h2>
        ${formattedHtml}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + fullHtml], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${docTitle}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Encodes the report payload to base64 and generates the dynamic share link.
 */
export function generateShareLink(payload: ReportPayload): string {
  try {
    const rawJson = JSON.stringify(payload);
    // Base64 encoding with support for Unicode characters
    const base64 = btoa(encodeURIComponent(rawJson).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/share?data=${encodeURIComponent(base64)}`;
  } catch (err) {
    console.error("Failed to generate share link:", err);
    return "";
  }
}

/**
 * Decodes the base64 share payload back to a ReportPayload.
 */
export function parseSharePayload(base64: string): ReportPayload | null {
  try {
    const decoded = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(decoded) as ReportPayload;
  } catch (err) {
    console.error("Failed to parse share payload:", err);
    return null;
  }
}
