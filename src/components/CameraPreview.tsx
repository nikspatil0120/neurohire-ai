/**
 * CameraPreview
 *
 * Renders the live camera feed inside the interview room.
 * - Border color reflects proctoringStatus (green → amber → red).
 * - Subtle inline message on active violations so honest candidates can
 *   self-correct ("Please stay in frame") — wording is calm, not alarming.
 * - LIVE badge (top-right).
 * - Loading state while models / camera initialise.
 * - Does NOT show the raw composure score to the candidate.
 */

import { useEffect } from "react";
import type { RefObject } from "react";
import type { CameraError } from "@/hooks/useFaceAnalysis";
import type { ProctoringStatus, ViolationType } from "@/hooks/useProctoringMonitor";
import { Camera, AlertTriangle, Loader } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface CameraPreviewProps {
  videoRef:          RefObject<HTMLVideoElement>;
  ready:             boolean;
  error:             CameraError | null;
  proctoringStatus:  ProctoringStatus;
  activeViolations:  Set<ViolationType>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Violation → candidate-facing hint (calm, not alarming, actionable)
// ─────────────────────────────────────────────────────────────────────────────
const VIOLATION_HINT: Partial<Record<ViolationType, string>> = {
  face_not_visible: "Please stay in frame",
  multiple_faces:   "Multiple faces detected",
  looking_away:     "Please look at the camera",
  tab_switched:     "You left the interview tab",
  window_blurred:   "Interview window lost focus",
};

function getActiveHint(active: Set<ViolationType>): string | null {
  // Priority order — show the most important one
  const priority: ViolationType[] = [
    "multiple_faces",
    "tab_switched",
    "window_blurred",
    "face_not_visible",
    "looking_away",
  ];
  for (const v of priority) {
    if (active.has(v)) return VIOLATION_HINT[v] ?? null;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Border / badge colours keyed to proctoringStatus
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_BORDER: Record<ProctoringStatus, string> = {
  clear:     "border-green-500/50",
  flagged:   "border-amber-500/70",
  high_risk: "border-red-500/80",
};

const STATUS_DOT: Record<ProctoringStatus, string> = {
  clear:     "bg-green-400",
  flagged:   "bg-amber-400",
  high_risk: "bg-red-400",
};

const STATUS_LABEL: Record<ProctoringStatus, string> = {
  clear:     "LIVE",
  flagged:   "FLAGGED",
  high_risk: "HIGH RISK",
};

// ─────────────────────────────────────────────────────────────────────────────
// Camera error messages — distinguish OS vs browser vs hardware
// ─────────────────────────────────────────────────────────────────────────────
const ERROR_MESSAGE: Record<CameraError, { title: string; body: string }> = {
  permission_denied: {
    title: "Camera access blocked",
    body: "Allow camera access in your browser's address bar, then reload.",
  },
  permission_denied_os: {
    title: "Camera blocked by system",
    body: "Your operating system is blocking camera access. Check Privacy settings.",
  },
  not_found: {
    title: "No camera detected",
    body: "Connect a webcam and reload to continue.",
  },
  in_use: {
    title: "Camera in use",
    body: "Another application is using your camera. Close it and reload.",
  },
  model_load_failed: {
    title: "Analysis unavailable",
    body: "Face analysis models failed to load. Camera feed will still work.",
  },
  unknown: {
    title: "Camera error",
    body: "An unexpected error occurred. Try reloading the page.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const CameraPreview = ({
  videoRef,
  ready,
  error,
  proctoringStatus,
  activeViolations,
}: CameraPreviewProps) => {
  const hint       = getActiveHint(activeViolations);
  const borderCls  = STATUS_BORDER[proctoringStatus];
  const dotCls     = STATUS_DOT[proctoringStatus];
  const liveLabel  = STATUS_LABEL[proctoringStatus];
  const isAlarmed  = proctoringStatus !== "clear";

  // Ensure the video element always mirrors (selfie view)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.transform = "scaleX(-1)";
    }
  }, [videoRef]);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-colors duration-700 bg-black/80 ${borderCls}`}>

      {/* ── Live video ── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`w-full h-full object-cover transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
        style={{ transform: "scaleX(-1)" }}
      />

      {/* ── Loading state (models / camera not ready yet) ── */}
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
          <Loader className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Starting camera…</p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && error !== "model_load_failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-background/80">
          <Camera className="w-10 h-10 text-muted-foreground/60" />
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {ERROR_MESSAGE[error].title}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[200px]">
              {ERROR_MESSAGE[error].body}
            </p>
          </div>
        </div>
      )}

      {/* ── LIVE / status badge (top-right) ── */}
      {(ready || error === "model_load_failed") && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
          <div className={`w-2 h-2 rounded-full animate-pulse ${dotCls}`} />
          <span className={`text-[10px] font-semibold tracking-wide ${isAlarmed ? "text-amber-300" : "text-white/80"}`}>
            {liveLabel}
          </span>
        </div>
      )}

      {/* ── Active violation hint (bottom, calm wording) ── */}
      {hint && (
        <div className={`
          absolute bottom-0 inset-x-0
          px-3 py-2 flex items-center gap-2
          backdrop-blur-sm text-xs font-medium
          transition-all duration-300
          ${proctoringStatus === "high_risk"
            ? "bg-red-900/70 text-red-200"
            : "bg-amber-900/60 text-amber-200"}
        `}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{hint}</span>
        </div>
      )}

      {/* ── Subtle scan-line overlay (decorative, only when ready) ── */}
      {ready && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
          }}
        />
      )}
    </div>
  );
};

export default CameraPreview;
