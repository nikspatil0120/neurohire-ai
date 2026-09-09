/**
 * useProctoringMonitor
 *
 * Consumes a FrameSignal stream from useFaceAnalysis and maintains a rolling
 * state machine. Single bad frames never trigger a violation — all events
 * require sustained detection across N consecutive frames or M seconds.
 *
 * Also listens to document.visibilitychange and window.blur/focus for
 * tab-switch / window-blur events (not video-derived but same event stream).
 *
 * Does NOT auto-terminate the interview. Flag-and-log only — a human reviewer
 * sees the full violation timeline post-interview.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { FrameSignal } from "./useFaceAnalysis";
import { DETECTION_INTERVAL_MS } from "./useFaceAnalysis";

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

// How many consecutive bad frames before raising an event (~1 s at 4.5 fps)
const CONSEC_FRAMES_THRESHOLD = 4;

// Gaze / head-yaw — widen thresholds to tolerate glasses glare & peripheral glances
const GAZE_THRESHOLD     = 0.55;   // |gazeOffsetX| > 0.55 → looking away
const HEAD_YAW_THRESHOLD = 0.18;   // |headYawProxy| > 0.18 → turned away

// Sustained looking-away before raising an event (ms)
const LOOK_AWAY_SUSTAIN_MS = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type ViolationType =
  | "multiple_faces"
  | "face_not_visible"
  | "looking_away"
  | "tab_switched"
  | "window_blurred";

export type ViolationSeverity = "low" | "medium" | "high";

export interface ViolationEvent {
  id: string;
  type: ViolationType;
  startTime: number;   // ms epoch
  endTime: number | null;
  durationMs: number | null;
  severity: ViolationSeverity;
}

export type ProctoringStatus = "clear" | "flagged" | "high_risk";

export interface ProctoringState {
  status: ProctoringStatus;
  violations: ViolationEvent[];
  activeViolations: Set<ViolationType>; // currently ongoing
  totalLookAwayMs: number;
  /** Call this to ingest each new FrameSignal */
  pushFrame: (signal: FrameSignal) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity mapping
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY: Record<ViolationType, ViolationSeverity> = {
  multiple_faces:   "high",
  tab_switched:     "high",
  face_not_visible: "medium",
  looking_away:     "low",
  window_blurred:   "medium",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
let _idCounter = 0;
function makeId(): string {
  return `v_${Date.now()}_${++_idCounter}`;
}

function deriveProctoringStatus(violations: ViolationEvent[]): ProctoringStatus {
  const highCount = violations.filter(v => v.severity === "high").length;
  const anyCount  = violations.length;
  if (highCount >= 1)   return "high_risk";
  if (anyCount  >= 2)   return "flagged";
  if (anyCount  >= 1)   return "flagged";
  return "clear";
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useProctoringMonitor(): ProctoringState {
  const [violations,       setViolations]       = useState<ViolationEvent[]>([]);
  const [activeViolations, setActiveViolations] = useState<Set<ViolationType>>(new Set());
  const [status,           setStatus]           = useState<ProctoringStatus>("clear");
  const [totalLookAwayMs,  setTotalLookAwayMs]  = useState(0);

  // ── Rolling counters (refs — don't need to re-render on every frame) ────
  const noFaceConsec      = useRef(0);
  const multiFaceConsec   = useRef(0);
  const lookAwayStartRef  = useRef<number | null>(null);
  const lookAwayTotalRef  = useRef(0);
  const lookAwayActive    = useRef(false);

  // Open violations that haven't been closed yet (keyed by type)
  const openViolations = useRef<Map<ViolationType, ViolationEvent>>(new Map());

  // Stable refs to state setters so pushFrame doesn't stale-close over them
  const violationsRef = useRef<ViolationEvent[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // Core mutation helpers
  // ─────────────────────────────────────────────────────────────────────────
  const openViolation = useCallback((type: ViolationType, now: number) => {
    if (openViolations.current.has(type)) return; // already open
    const ev: ViolationEvent = {
      id:        makeId(),
      type,
      startTime: now,
      endTime:   null,
      durationMs: null,
      severity:  SEVERITY[type],
    };
    openViolations.current.set(type, ev);
    violationsRef.current = [...violationsRef.current, ev];
    setViolations([...violationsRef.current]);
    setActiveViolations(prev => new Set([...prev, type]));
    setStatus(deriveProctoringStatus(violationsRef.current));
  }, []);

  const closeViolation = useCallback((type: ViolationType, now: number) => {
    const ev = openViolations.current.get(type);
    if (!ev) return;
    ev.endTime   = now;
    ev.durationMs = now - ev.startTime;
    openViolations.current.delete(type);
    // Update the record in the array in-place (ref already points to same object)
    setViolations([...violationsRef.current]);
    setActiveViolations(prev => {
      const next = new Set(prev);
      next.delete(type);
      return next;
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Tab / window focus events (not video-derived)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        openViolation("tab_switched", now);
      } else {
        closeViolation("tab_switched", now);
      }
    };

    const handleBlur = () => {
      const now = Date.now();
      openViolation("window_blurred", now);
    };
    const handleFocus = () => {
      const now = Date.now();
      closeViolation("window_blurred", now);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur",  handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur",  handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [openViolation, closeViolation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Frame ingestion
  // ─────────────────────────────────────────────────────────────────────────
  const pushFrame = useCallback((signal: FrameSignal) => {
    const now = signal.timestamp;

    // ── No face / face lost ──────────────────────────────────────────────
    if (signal.faceCount === 0) {
      noFaceConsec.current++;
      if (noFaceConsec.current >= CONSEC_FRAMES_THRESHOLD) {
        openViolation("face_not_visible", now);
      }
    } else {
      noFaceConsec.current = 0;
      closeViolation("face_not_visible", now);
    }

    // ── Multiple faces ────────────────────────────────────────────────────
    if (signal.faceCount > 1) {
      multiFaceConsec.current++;
      if (multiFaceConsec.current >= CONSEC_FRAMES_THRESHOLD) {
        openViolation("multiple_faces", now);
      }
    } else {
      multiFaceConsec.current = 0;
      closeViolation("multiple_faces", now);
    }

    // ── Looking away (gaze + head yaw) ────────────────────────────────────
    const pf = signal.primaryFace;
    const isLookingAway = pf !== null && (
      Math.abs(pf.gazeOffsetX) > GAZE_THRESHOLD ||
      Math.abs(pf.headYawProxy) > HEAD_YAW_THRESHOLD
    );

    if (isLookingAway) {
      if (lookAwayStartRef.current === null) {
        lookAwayStartRef.current = now;
        lookAwayActive.current   = false;
      } else {
        const sustained = now - lookAwayStartRef.current;
        if (sustained >= LOOK_AWAY_SUSTAIN_MS && !lookAwayActive.current) {
          lookAwayActive.current = true;
          openViolation("looking_away", lookAwayStartRef.current);
        }
      }
    } else {
      if (lookAwayActive.current) {
        // Accumulate total look-away time
        const delta = lookAwayStartRef.current !== null
          ? now - lookAwayStartRef.current
          : 0;
        lookAwayTotalRef.current += delta;
        setTotalLookAwayMs(lookAwayTotalRef.current);
        closeViolation("looking_away", now);
      }
      lookAwayStartRef.current = null;
      lookAwayActive.current   = false;
    }
  }, [openViolation, closeViolation]);

  return {
    status,
    violations,
    activeViolations,
    totalLookAwayMs,
    pushFrame,
  };
}
