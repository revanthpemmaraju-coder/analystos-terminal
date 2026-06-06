"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Cpu, FileText, File, Share2, 
  Check, Printer, Download, ArrowLeft 
} from "lucide-react";
import { 
  parseSharePayload, 
  exportToDocx, 
  markdownToHtmlSimple,
  ReportPayload 
} from "@/lib/report-exporter";
import TickerBar from "@/components/ticker-bar";

function ShareContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);

  const rawData = searchParams.get("data");

  const report = useMemo(() => {
    if (!rawData) return null;
    return parseSharePayload(rawData);
  }, [rawData]);

  const hasError = !rawData || (rawData && !report);


  const triggerToast = (text: string) => {
    setShowToast(text);
    setTimeout(() => {
      setShowToast(null);
    }, 4000);
  };

  const handlePrint = () => {
    if (!report) return;
    window.print();
  };

  const handleDocx = () => {
    if (!report) return;
    exportToDocx(report);
    triggerToast("DOCX report downloaded successfully.");
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    triggerToast("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 3000);
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 max-w-md mx-auto text-center font-mono">
        <div className="w-16 h-16 rounded-full border border-red-500/30 flex items-center justify-center mb-6 bg-red-500/5 text-[#ff3860]">
          <Cpu className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-bold text-white mb-2 uppercase">SYS_CORE_ERROR</h1>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Failed to load shared memorandum. The signature might be invalid, or the data payload has been corrupted.
        </p>
        <Link 
          href="/analyst"
          className="flex items-center space-x-2 bg-[#00f0ff]/10 hover:bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/20 px-4 py-2 rounded-md text-xs font-bold transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>RETURN TO TERMINAL</span>
        </Link>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] font-mono space-y-3">
        <div className="pulse-blue"></div>
        <span className="text-xs text-slate-500">DECRYPTING_REPORT_PAYLOAD...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto p-6 flex flex-col gap-6 font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div className="flex items-center space-x-2 text-xs">
          <Cpu className="w-4 h-4 text-[#00f0ff]" />
          <span className="text-white font-bold uppercase tracking-wider">Certified Research Desk</span>
          <span className="terminal-badge-success text-[9px]">AOS_VERIFIED</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/25 text-[#00f0ff] hover:bg-[#00f0ff]/20 transition-all text-xs font-bold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PRINT PDF</span>
          </button>
          
          <button
            onClick={handleDocx}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOCX</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#00e676]" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "COPIED" : "SHARE LINK"}</span>
          </button>
        </div>
      </div>

      {/* Main double-page preview container */}
      <div className="flex flex-col items-center gap-10 py-4 select-text">
        
        {/* Document Page 1: Cover Page */}
        <div className="w-full max-w-2xl min-h-[750px] bg-[#0b0f19] border-2 border-[#00f0ff]/20 rounded-lg p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00f0ff]/5 via-transparent to-transparent pointer-events-none"></div>
          
          <div className="flex justify-between items-start z-10">
            <div className="flex items-center space-x-2 text-[9px] font-mono tracking-widest text-[#00f0ff]">
              <span>SYS_CORE_SECURE // NODE_CERTIFIED</span>
            </div>
            <div className="text-right text-[9px] font-mono text-slate-500">
              REPORT_ID: AOS-{report.confidence}-{report.ticker}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center my-10 z-10">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00f0ff]/30 flex items-center justify-center mb-8 relative">
              <div className="absolute inset-2 rounded-full border border-[#00f0ff]/20 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-[#00f0ff] animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-white font-display mb-4">
              ANALYSTOS CERTIFIED RESEARCH REPORT
            </h1>
            <div className="w-16 h-0.5 bg-gradient-to-r from-[#00f0ff] to-[#00e676] mb-6"></div>
            
            <h2 className="text-sm font-mono text-[#00f0ff] uppercase tracking-wider font-bold mb-2">
              {report.ticker ? `${report.ticker} Equity Analysis` : "Global Financial Markets Research"}
            </h2>
            <p className="text-xs text-slate-400 max-w-md font-mono">
              Autonomous equity research, financial modeling, valuation DCF analytics, and conference transcript signals.
            </p>
          </div>

          {/* Metadata section */}
          <div className="border-t border-slate-800 pt-6 z-10">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Classification</span>
                <span className="text-white font-bold">Institutional Grade</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">AI Confidence Score</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[#00e676] font-bold">{report.confidence}%</span>
                  <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#00e676] h-full" style={{ width: `${report.confidence}%` }}></div>
                  </div>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Compilation Timestamp</span>
                <span className="text-white font-bold">{report.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">Verification Node</span>
                <span className="text-[#00e676] font-bold">PASSED [AOS-SECURE]</span>
              </div>
            </div>
            
            <p className="text-[9px] text-slate-600 mt-8 text-center font-mono">
              Disclaimer: Markets involve risk and no outcome is certain. Certified by AnalystOS Autonomous System.
            </p>
          </div>
        </div>

        {/* Document Page 2: Content Page */}
        <div className="w-full max-w-2xl min-h-[750px] bg-[#0b0f19] border border-[#00f0ff]/10 rounded-lg p-10 flex flex-col justify-between shadow-2xl relative">
          <div className="watermark-overlay absolute inset-0 z-0"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#00f0ff]/2 via-transparent to-transparent pointer-events-none"></div>

          <div className="z-10 w-full flex flex-col flex-1">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-6 text-[9px] font-mono text-slate-500">
              <span>ANALYSTOS RESEARCH MEMORANDUM</span>
              <span>TICKER: {report.ticker}</span>
            </div>
            
            <div 
              className="font-mono text-slate-300 leading-relaxed text-xs break-words"
              dangerouslySetInnerHTML={{ __html: markdownToHtmlSimple(report.content) }}
            />
          </div>
          
          <div className="z-10 mt-10 pt-4 border-t border-slate-800 text-center text-[9px] font-mono text-slate-500 flex justify-between">
            <span>AnalystOS AI Co-Analyst System v1.5</span>
            <span>Page 2 / Confidential</span>
          </div>
        </div>

      </div>

      {/* Hidden print-only wrapper */}
      <div className="printable-report-wrapper hidden">
        <div className="print-watermark-overlay"></div>
        {/* Cover Page */}
        <div className="print-cover-page">
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#64748b", letterSpacing: "3px", textTransform: "uppercase" }}>
            AnalystOS Research Network
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
            <div style={{ width: "64px", height: "64px", border: "4px solid #0284c7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#0284c7", fontWeight: "bold", fontSize: "10px", marginBottom: "2rem" }}>
              AOS
            </div>
            <h1 style={{ fontSize: "24pt", fontWeight: "bold", color: "#0f172a", margin: "1.5rem 0", lineHeight: 1.2 }}>
              ANALYSTOS CERTIFIED RESEARCH REPORT
            </h1>
            <div style={{ height: "3px", width: "50px", backgroundColor: "#0284c7", margin: "0.5rem auto 1.5rem" }}></div>
            <p style={{ fontSize: "13pt", color: "#0284c7", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
              {report.ticker ? `${report.ticker} Ticker Analysis` : "Global Financial Markets Research"}
            </p>
          </div>
          <div style={{ width: "100%", borderTop: "1px dashed #cbd5e1", paddingTop: "2rem" }}>
            <table style={{ width: "100%", fontSize: "10pt", borderCollapse: "collapse", color: "#475569" }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Security Classification:</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>Institutional Grade</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>AI Confidence Score:</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>{report.confidence}%</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Timestamp of Compilation:</td>
                  <td style={{ textAlign: "right", padding: "4px 0" }}>{report.timestamp}</td>
                </tr>
                <tr>
                  <td style={{ textAlign: "left", padding: "4px 0", fontWeight: "bold" }}>Verification:</td>
                  <td style={{ textAlign: "right", padding: "4px 0", color: "#0284c7", fontWeight: "bold" }}>PASSED [AOS-SECURE]</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "8pt", color: "#94a3b8", marginTop: "2rem", textAlign: "center" }}>
              Disclaimer: Markets involve risk. Certified by AnalystOS Autonomous System.
            </p>
          </div>
        </div>
        
        {/* Content Page */}
        <div className="print-content-page">
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "8px", marginBottom: "2rem", fontSize: "9pt", color: "#64748b" }}>
            <span>AnalystOS Research Memorandum</span>
            <span>Ticker: {report.ticker}</span>
          </div>
          <div 
            className="print-markdown-body"
            dangerouslySetInnerHTML={{ __html: markdownToHtmlSimple(report.content) }} 
            style={{ fontSize: "11pt", color: "#334155" }}
          />
        </div>
      </div>

      {/* Floating Action Complete Toast */}
      {showToast && (
        <div className="toast show bg-[#0b0f19] border border-[#00e676]/30 shadow-2xl transition-all">
          <div className="toast-content">
            <div className="toast-icon-wrapper bg-[#00e676]/10 text-[#00e676]">
              <Check className="w-4 h-4" />
            </div>
            <div className="toast-text font-mono">
              <span className="toast-title text-white text-xs font-bold">SUCCESS</span>
              <span className="toast-desc text-slate-400 text-[10px]">{showToast}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SharedReportPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#05070a] text-slate-100 font-mono">
      <TickerBar />
      <nav className="w-full bg-[#0b0f19] border-b border-[#00f0ff]/12 px-6 py-3.5 flex items-center justify-between font-mono z-40">
        <Link href="/" className="text-lg font-bold tracking-tight text-white flex items-center space-x-1.5">
          <span>AnalystOS</span>
          <span className="pulse-blue"></span>
        </Link>
        <Link 
          href="/analyst"
          className="text-xs text-slate-400 hover:text-[#00f0ff] transition-colors border border-slate-800 hover:border-[#00f0ff]/30 px-3 py-1.5 rounded-md"
        >
          [OPEN_TERMINAL]
        </Link>
      </nav>

      <main className="flex-grow flex items-center justify-center p-4">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center min-h-[70vh] font-mono space-y-3">
            <div className="pulse-blue"></div>
            <span className="text-xs text-slate-500">LOADING_SECURE_VIEWER...</span>
          </div>
        }>
          <ShareContent />
        </Suspense>
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-[10px] text-slate-600 font-mono">
        &copy; {new Date().getFullYear()} AnalystOS Autonomous Systems. Institutional-Grade Financial Intelligence.
      </footer>
    </div>
  );
}
