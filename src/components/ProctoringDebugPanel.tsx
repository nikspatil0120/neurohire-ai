/**
 * ProctoringDebugPanel
 *
 * Dev-only overlay for tuning thresholds. Gated behind the
 * VITE_DEBUG_PROCTORING env flag — tree-shaken from production builds.
 *
 * Shows: face count, detection score, gaze values, head yaw proxy,
 * all landmark signals, frame processing time, adaptive interval,
 * active violations, total look-away time, and composure / emotion.
 *
 * Usage in .env.local:
 *   VITE_DEBUG_PROCTORING=true
 */

import type { FrameSignal } from "@/hooks/useFaceAnalysis";
import type { ProctoringState } from "@/hooks/useProctoringMonitor";
import type { CandidateSignalsState } from "@/hooks/useCandidateSignals";

// ─────────────────────────────────────────────────────────────────────────────
// Guard — compile-time tree-shake in production
// ─────────────────────────────────────────────────────────────────────────────
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_PROCTORING === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ProctoringDebugPanelProps {
  lastFrame:   FrameSignal | null;
  proctoring:  ProctoringState;
  signals:     CandidateSignalsState;
  /** Adaptive detection interval (ms) — passed through from useFaceAnalysis */
  intervalMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt2 = (n: number | undefined | null) =>
  n == null ? "—" : n.toFixed(3);

const pct = (n: number | undefined | null) =>
  n == null ? "—" : `${Math.round(n * 100)}%`;

function Bar({ value, max = 1, color = "bg-primary" }: {
  value: number; max?: number; color?: string;
}) {
  const w = Math.max(0, Math.min((value / max) * 100, 100));
  return (
    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-white/50 text-[10px] shrink-0">{label}</span>
      <span className="text-white/90 text-[10px] font-mono truncate">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-[9px] uppercase tracking-widest text-white/30 mb-1 border-b border-white/10 pb-0.5">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const ProctoringDebugPanel = ({
  lastFrame,
  proctoring,
  signals,
  intervalMs,
}: ProctoringDebugPanelProps) => {
  if (!DEBUG_ENABLED) return null;

  const pf = lastFrame?.primaryFace ?? null;

  // Violation severity colour
  const statusColor = {
    clear:     "text-green-400",
    flagged:   "text-amber-400",
    high_risk: "text-red-400",
  }[proctoring.status];

  // Emotion bars colours
  const emotionColors: Record<string, string> = {
    neutral:    "bg-blue-400",
    positive:   "bg-green-400",
    nervous:    "bg-amber-400",
    confused:   "bg-orange-400",
    disengaged: "bg-red-400",
  };

  return (
    <div
      className="fixed bottom-3 left-3 z-[200] w-64 rounded-xl overflow-hidden shadow-2xl"
      style={{ background: "rgba(10,12,18,0.92)", backdropFilter: "blur(12px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-[10px] font-bold tracking-widest text-white/60 uppercase">
          Proctoring Debug
        </span>
        <span className="text-[9px] text-yellow-400/80 font-mono">DEV</span>
      </div>

      <div className="px-3 py-2 max-h-[80vh] overflow-y-auto space-y-0.5">

        {/* ── Frame ──────────────────────────────────────────────────── */}
        <Section title="Frame">
          <Row label="Face count"     value={lastFrame?.faceCount ?? 0} />
          <Row label="Detect score"   value={fmt2(lastFrame?.detectionScore)} />
          <Row label="Frame time"     value={lastFrame ? `${Math.round(lastFrame.frameProcessingMs)}ms` : "—"} />
          <Row label="Interval"       value={intervalMs ? `${intervalMs}ms` : "—"} />
          <Row label="Timestamp"      value={lastFrame ? new Date(lastFrame.timestamp).toLocaleTimeString() : "—"} />
        </Section>

        {/* ── Gaze / Head ────────────────────────────────────────────── */}
        <Section title="Gaze / Head">
          <Row label="Gaze X"         value={fmt2(pf?.gazeOffsetX)} />
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-white/30 text-[10px] w-16 shrink-0">Gaze X</span>
            <div className="flex-1 relative h-1.5 rounded-full bg-white/10">
              {/* Center line */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
              {pf && (
                <div
                  className="absolute inset-y-0 w-2 rounded-full bg-cyan-400 transition-all"
                  style={{ left: `calc(${((pf.gazeOffsetX + 1) / 2) * 100}% - 4px)` }}
                />
              )}
            </div>
          </div>
          <Row label="Gaze Y"         value={fmt2(pf?.gazeOffsetY)} />
          <Row label="Head yaw proxy" value={fmt2(pf?.headYawProxy)} />
        </Section>

        {/* ── Landmarks ──────────────────────────────────────────────── */}
        <Section title="Landmarks">
          {(
            [
              ["Mouth open",   pf?.mouthOpenness,     "bg-purple-400"],
              ["Smile",        pf?.smileScore,        "bg-green-400"],
              ["EAR left",     pf?.eyeAspectRatioL,   "bg-blue-400"],
              ["EAR right",    pf?.eyeAspectRatioR,   "bg-blue-300"],
              ["Brow L",       pf?.browRaiseL,        "bg-amber-400"],
              ["Brow R",       pf?.browRaiseR,        "bg-amber-300"],
            ] as [string, number | undefined, string][]
          ).map(([label, val, color]) => (
            <div key={label} className="flex items-center gap-1 mb-0.5">
              <span className="text-white/40 text-[10px] w-16 shrink-0">{label}</span>
              <Bar value={val ?? 0} color={color} />
              <span className="text-white/70 text-[10px] font-mono w-10 text-right shrink-0">
                {fmt2(val)}
              </span>
            </div>
          ))}
        </Section>

        {/* ── Proctoring ─────────────────────────────────────────────── */}
        <Section title="Proctoring">
          <Row
            label="Status"
            value={<span className={`font-semibold ${statusColor}`}>{proctoring.status}</span>}
          />
          <Row label="Violations" value={proctoring.violations.length} />
          <Row
            label="Active"
            value={
              proctoring.activeViolations.size > 0
                ? [...proctoring.activeViolations].join(", ")
                : "none"
            }
          />
          <Row
            label="Look-away"
            value={`${(proctoring.totalLookAwayMs / 1000).toFixed(1)}s`}
          />
        </Section>

        {/* ── Violations log ─────────────────────────────────────────── */}
        {proctoring.violations.length > 0 && (
          <Section title="Violation log">
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {[...proctoring.violations].reverse().map(v => (
                <div key={v.id} className="flex items-start gap-1 text-[9px]">
                  <span className={`shrink-0 font-semibold ${
                    v.severity === "high"   ? "text-red-400" :
                    v.severity === "medium" ? "text-amber-400" : "text-yellow-300"
                  }`}>
                    {v.severity.toUpperCase()[0]}
                  </span>
                  <span className="text-white/60 truncate">{v.type}</span>
                  <span className="text-white/30 shrink-0 ml-auto">
                    {v.durationMs != null ? `${(v.durationMs / 1000).toFixed(1)}s` : "open"}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Signals ────────────────────────────────────────────────── */}
        <Section title="Signals">
          <Row
            label="Composure"
            value={
              <span className={`font-semibold ${
                signals.composureScore >= 70 ? "text-green-400" :
                signals.composureScore >= 45 ? "text-amber-400" : "text-red-400"
              }`}>
                {signals.composureScore}
              </span>
            }
          />
          <div className="flex items-center gap-1 mb-1">
            <span className="text-white/30 text-[10px] w-16 shrink-0">Score</span>
            <Bar
              value={signals.composureScore}
              max={100}
              color={
                signals.composureScore >= 70 ? "bg-green-400" :
                signals.composureScore >= 45 ? "bg-amber-400" : "bg-red-400"
              }
            />
          </div>
          <Row label="Emotion" value={
            <span className="capitalize font-semibold text-cyan-300">
              {signals.dominantEmotion}
            </span>
          } />
        </Section>

        {/* ── Emotion breakdown ──────────────────────────────────────── */}
        <Section title="Emotion (15s window)">
          {(Object.entries(signals.emotionBreakdown) as [string, number][]).map(
            ([name, frac]) => (
              <div key={name} className="flex items-center gap-1 mb-0.5">
                <span className="text-white/40 text-[10px] w-16 shrink-0 capitalize">{name}</span>
                <Bar value={frac} color={emotionColors[name] ?? "bg-white/40"} />
                <span className="text-white/50 text-[10px] font-mono w-8 text-right shrink-0">
                  {pct(frac)}
                </span>
              </div>
            ),
          )}
        </Section>

      </div>
    </div>
  );
};

export default ProctoringDebugPanel;
