/**
 * useCandidateSignals
 *
 * Sits on top of the FrameSignal stream and produces:
 *  - A rolling dominant emotion bucket (last ~15 s window)
 *  - A smoothed composure score 0-100 (EMA, alpha=0.2)
 *  - Per-question aggregates for the backend report
 *
 * IMPORTANT: The "composure score" is an engagement/composure indicator —
 * a heuristic composite of gaze stability, head stability, eye-contact ratio,
 * and expression steadiness. It is NOT a validated psychological measurement
 * and must never be labelled "confidence" in any user-facing surface.
 *
 * The raw score is intentionally NOT shown to the candidate during the
 * interview — showing it live would cause them to perform for the metric.
 * Surface it only in the reviewer-facing report.
 */

import { useRef, useState, useCallback } from "react";
import type { FrameSignal, FaceLandmarkData } from "./useFaceAnalysis";
import type { ViolationEvent } from "./useProctoringMonitor";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EMA_ALPHA           = 0.2;   // smoothing factor for composure score
const EMOTION_WINDOW_MS   = 15_000; // rolling window for dominant emotion

// Gaze-center band: if |gazeOffsetX| and |gazeOffsetY| are both within this,
// the candidate is considered to be making "eye contact" with the camera.
const EYE_CONTACT_BAND    = 0.35;

// Expression steadiness: how much total blendshape activity we want (too flat
// or too erratic both lower the score).
const EXPR_IDEAL_LOW      = 0.08;   // below this → disengaged / flat
const EXPR_IDEAL_HIGH     = 0.55;   // above this → erratic

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type EmotionBucket =
  | "neutral"
  | "positive"     // smile-dominant
  | "nervous"      // brow tension + squint + low blink variance
  | "confused"     // brow furrow without smile
  | "disengaged";  // low expressiveness + gaze drift

export interface EmotionBreakdown {
  neutral:    number;  // fraction 0-1 of frames in rolling window
  positive:   number;
  nervous:    number;
  confused:   number;
  disengaged: number;
}

export interface QuestionAggregate {
  questionId:         string | number;
  startTime:          number;
  endTime:            number;
  avgComposureScore:  number;
  minComposureScore:  number;
  maxComposureScore:  number;
  /** Positive trend = improving over question duration; negative = declining */
  composureTrend:     number;
  dominantEmotion:    EmotionBucket;
  emotionBreakdown:   EmotionBreakdown;
  proctoringViolations: ViolationEvent[];
}

export interface CandidateSignalsState {
  /** Smoothed composure score 0-100 (EMA). Undefined before first detection. */
  composureScore:  number;
  /** Dominant emotion in the current 15 s rolling window */
  dominantEmotion: EmotionBucket;
  emotionBreakdown: EmotionBreakdown;
  /** Call on every frame tick */
  pushFrame:       (signal: FrameSignal) => void;
  /** Call when a question starts — resets per-question accumulator */
  startQuestion:   (questionId: string | number) => void;
  /** Call when a question ends — returns the aggregate and resets state */
  endQuestion:     (violations: ViolationEvent[]) => QuestionAggregate | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Emotion classification
// ─────────────────────────────────────────────────────────────────────────────

function classifyEmotion(face: FaceLandmarkData): EmotionBucket {
  const { smileScore, browRaiseL, browRaiseR, eyeAspectRatioL, eyeAspectRatioR,
          gazeOffsetX, gazeOffsetY, mouthOpenness } = face;

  const avgBrowRaise = (browRaiseL + browRaiseR) / 2;
  const avgEAR       = (eyeAspectRatioL + eyeAspectRatioR) / 2;
  const gazeOff      = Math.max(Math.abs(gazeOffsetX), Math.abs(gazeOffsetY));

  // Positive: clear smile, relaxed brows
  if (smileScore > 0.35 && avgBrowRaise > 0.25) return "positive";

  // Nervous: brows pulled together (low raise), squinting eyes, mouth somewhat
  // open (speaking anxiety), not smiling
  if (avgBrowRaise < 0.18 && avgEAR < 0.22 && smileScore < 0.15) return "nervous";

  // Confused: brows furrowed (very low raise), no smile, mouth slightly open
  if (avgBrowRaise < 0.16 && mouthOpenness > 0.08 && smileScore < 0.1) return "confused";

  // Disengaged: low overall facial activity AND gaze drifting
  const expressiveness = smileScore + Math.abs(avgBrowRaise - 0.22) + mouthOpenness;
  if (expressiveness < EXPR_IDEAL_LOW && gazeOff > 0.3) return "disengaged";

  return "neutral";
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-frame composure sub-scores  (each 0-100)
// ─────────────────────────────────────────────────────────────────────────────

function gazeStabilityScore(
  gazeHistory: Array<{ x: number; y: number }>,
): number {
  if (gazeHistory.length < 2) return 80;
  const xVals = gazeHistory.map(g => g.x);
  const yVals = gazeHistory.map(g => g.y);
  const varX  = variance(xVals);
  const varY  = variance(yVals);
  // Low variance (< 0.02) → 100; high variance (> 0.25) → 0
  const totalVar = varX + varY;
  return Math.max(0, Math.min(100, 100 - totalVar * 300));
}

function headStabilityScore(
  yawHistory: number[],
): number {
  if (yawHistory.length < 2) return 80;
  const varY = variance(yawHistory);
  return Math.max(0, Math.min(100, 100 - varY * 500));
}

function eyeContactScore(
  gazeHistory: Array<{ x: number; y: number }>,
): number {
  if (!gazeHistory.length) return 50;
  const onCameraFrames = gazeHistory.filter(
    g => Math.abs(g.x) < EYE_CONTACT_BAND && Math.abs(g.y) < EYE_CONTACT_BAND,
  ).length;
  return (onCameraFrames / gazeHistory.length) * 100;
}

function expressionSteadinessScore(face: FaceLandmarkData): number {
  // Total activity level from visible face signals
  const activity = face.smileScore
    + Math.abs(face.browRaiseL - 0.22)
    + Math.abs(face.browRaiseR - 0.22)
    + face.mouthOpenness * 0.5;
  // Penalise too flat or too erratic
  if (activity < EXPR_IDEAL_LOW)  return Math.max(0, (activity / EXPR_IDEAL_LOW) * 70);
  if (activity > EXPR_IDEAL_HIGH) return Math.max(0, 100 - ((activity - EXPR_IDEAL_HIGH) / 0.4) * 80);
  // In the ideal band
  return 100;
}

// Simple population variance
function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composure score composite
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  gazeStability:       0.30,
  headStability:       0.20,
  eyeContact:          0.30,
  expressionSteadiness:0.20,
};

function computeComposure(
  face: FaceLandmarkData,
  gazeHistory: Array<{ x: number; y: number }>,
  yawHistory:  number[],
): number {
  const g = gazeStabilityScore(gazeHistory);
  const h = headStabilityScore(yawHistory);
  const e = eyeContactScore(gazeHistory);
  const x = expressionSteadinessScore(face);

  return (
    g * WEIGHTS.gazeStability +
    h * WEIGHTS.headStability +
    e * WEIGHTS.eyeContact    +
    x * WEIGHTS.expressionSteadiness
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useCandidateSignals(): CandidateSignalsState {
  const [composureScore,   setComposureScore]   = useState(75);  // optimistic default
  const [dominantEmotion,  setDominantEmotion]  = useState<EmotionBucket>("neutral");
  const [emotionBreakdown, setEmotionBreakdown] = useState<EmotionBreakdown>({
    neutral: 1, positive: 0, nervous: 0, confused: 0, disengaged: 0,
  });

  // ── Rolling window buffers (refs — frame-rate data, no re-render per frame) ─
  const emaScore       = useRef(75);
  const gazeHistory    = useRef<Array<{ x: number; y: number; ts: number }>>([]);
  const yawHistory     = useRef<Array<{ v: number; ts: number }>>([]);
  const emotionWindow  = useRef<Array<{ emotion: EmotionBucket; ts: number }>>([]);

  // ── Per-question accumulator ──────────────────────────────────────────────
  const questionId    = useRef<string | number | null>(null);
  const questionStart = useRef<number>(0);
  const qScores       = useRef<number[]>([]);  // composure score per scored frame
  const qEmotions     = useRef<EmotionBucket[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  const pushFrame = useCallback((signal: FrameSignal) => {
    if (!signal.primaryFace) return;
    const face = signal.primaryFace;
    const now  = signal.timestamp;

    // ── Update rolling buffers ───────────────────────────────────────────
    gazeHistory.current.push({ x: face.gazeOffsetX, y: face.gazeOffsetY, ts: now });
    yawHistory.current.push({ v: face.headYawProxy, ts: now });
    emotionWindow.current.push({ emotion: classifyEmotion(face), ts: now });

    // Prune to rolling window
    const cutoff = now - EMOTION_WINDOW_MS;
    gazeHistory.current   = gazeHistory.current.filter(g => g.ts > cutoff);
    yawHistory.current    = yawHistory.current.filter(g => g.ts > cutoff);
    emotionWindow.current = emotionWindow.current.filter(g => g.ts > cutoff);

    // ── Composure score ──────────────────────────────────────────────────
    const rawScore = computeComposure(
      face,
      gazeHistory.current.map(g => ({ x: g.x, y: g.y })),
      yawHistory.current.map(g => g.v),
    );
    // EMA smoothing
    emaScore.current = emaScore.current * (1 - EMA_ALPHA) + rawScore * EMA_ALPHA;
    const smoothed = Math.round(Math.max(0, Math.min(100, emaScore.current)));

    // ── Dominant emotion (mode over rolling window) ──────────────────────
    const counts: Record<EmotionBucket, number> = {
      neutral: 0, positive: 0, nervous: 0, confused: 0, disengaged: 0,
    };
    for (const e of emotionWindow.current) counts[e.emotion]++;
    const total = emotionWindow.current.length || 1;
    const breakdown: EmotionBreakdown = {
      neutral:    counts.neutral    / total,
      positive:   counts.positive   / total,
      nervous:    counts.nervous    / total,
      confused:   counts.confused   / total,
      disengaged: counts.disengaged / total,
    };
    const dominant = (Object.keys(counts) as EmotionBucket[]).reduce(
      (a, b) => counts[a] >= counts[b] ? a : b,
    );

    // ── Accumulate per-question data ─────────────────────────────────────
    if (questionId.current !== null) {
      qScores.current.push(smoothed);
      qEmotions.current.push(dominant);
    }

    // ── State update (batched by React 18 automatically) ─────────────────
    setComposureScore(smoothed);
    setDominantEmotion(dominant);
    setEmotionBreakdown(breakdown);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  const startQuestion = useCallback((id: string | number) => {
    questionId.current    = id;
    questionStart.current = Date.now();
    qScores.current       = [];
    qEmotions.current     = [];
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  const endQuestion = useCallback((violations: ViolationEvent[]): QuestionAggregate | null => {
    if (questionId.current === null) return null;

    const scores   = qScores.current;
    const emotions = qEmotions.current;

    // Composure stats
    const avg  = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const minS = scores.length ? Math.min(...scores) : 0;
    const maxS = scores.length ? Math.max(...scores) : 0;

    // Trend: slope of a simple linear regression on scores over time
    let trend = 0;
    if (scores.length >= 4) {
      const n    = scores.length;
      const xMid = (n - 1) / 2;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMid) * (scores[i] - avg);
        den += (i - xMid) ** 2;
      }
      trend = den > 0 ? num / den : 0; // points per frame — positive = improving
    }

    // Dominant emotion
    const eCounts: Record<EmotionBucket, number> = {
      neutral: 0, positive: 0, nervous: 0, confused: 0, disengaged: 0,
    };
    for (const e of emotions) eCounts[e]++;
    const total = emotions.length || 1;
    const breakdown: EmotionBreakdown = {
      neutral:    eCounts.neutral    / total,
      positive:   eCounts.positive   / total,
      nervous:    eCounts.nervous    / total,
      confused:   eCounts.confused   / total,
      disengaged: eCounts.disengaged / total,
    };
    const dominantQ = (Object.keys(eCounts) as EmotionBucket[]).reduce(
      (a, b) => eCounts[a] >= eCounts[b] ? a : b,
    );

    const aggregate: QuestionAggregate = {
      questionId:          questionId.current,
      startTime:           questionStart.current,
      endTime:             Date.now(),
      avgComposureScore:   Math.round(avg),
      minComposureScore:   Math.round(minS),
      maxComposureScore:   Math.round(maxS),
      composureTrend:      Math.round(trend * 100) / 100,
      dominantEmotion:     dominantQ,
      emotionBreakdown:    breakdown,
      proctoringViolations: violations,
    };

    // Reset accumulator
    questionId.current = null;
    qScores.current    = [];
    qEmotions.current  = [];

    return aggregate;
  }, []);

  return {
    composureScore,
    dominantEmotion,
    emotionBreakdown,
    pushFrame,
    startQuestion,
    endQuestion,
  };
}
