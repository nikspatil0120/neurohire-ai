/**
 * useFaceAnalysis
 *
 * Requests camera access, loads face-api.js TinyFaceDetector + FaceLandmark68Net,
 * and runs a detection loop throttled to DETECTION_INTERVAL_MS (~4-6 fps).
 *
 * Outputs a structured FrameSignal on each tick via onFrame callback.
 * All analysis is client-side — no video data leaves the device.
 *
 * Known limitation: relies on the client's JS environment for signal integrity;
 * no server-side video processing is performed (by design, v1).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
export const DETECTION_INTERVAL_MS = 220; // ~4.5 fps — enough for proctoring, easy on CPU
const MODELS_PATH = "/models";

// Low-confidence frames below this threshold are treated as "no face" rather
// than raising a false face_not_visible event (handles poor lighting / glasses).
const MIN_DETECTION_SCORE = 0.4;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type CameraError =
  | "permission_denied"       // user explicitly blocked camera in browser
  | "permission_denied_os"    // OS-level block (browser can't even ask)
  | "not_found"               // no camera hardware present
  | "in_use"                  // camera locked by another app
  | "model_load_failed"       // face-api models failed to load
  | "unknown";

export type FaceLandmarkData = {
  gazeOffsetX: number;        // -1 (far left) … +1 (far right), 0 = centered
  gazeOffsetY: number;        // -1 (top) … +1 (bottom), 0 = centered
  headYawProxy: number;       // unitless: eye-width asymmetry — positive = turned right
  mouthOpenness: number;      // 0-1  (0 = closed, 1 = wide open)
  eyeAspectRatioL: number;    // 0-1  (blink / squint detection)
  eyeAspectRatioR: number;
  browRaiseL: number;         // 0-1  relative to inter-eye distance
  browRaiseR: number;
  smileScore: number;         // 0-1  derived from mouth corner lift
};

export type FrameSignal = {
  timestamp: number;
  faceCount: number;           // number of distinct faces detected in frame
  detectionScore: number;      // confidence of primary face detection (0-1)
  primaryFace: FaceLandmarkData | null;
  frameProcessingMs: number;   // actual time taken — used for adaptive throttle
};

export type FaceAnalysisState = {
  ready: boolean;              // models loaded + camera active
  error: CameraError | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>; // for debug overlay
  lastFrame: FrameSignal | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Landmark geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Euclidean distance between two face-api Points */
function dist(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/** Mean of an array of Points (centroid) */
function centroid(pts: faceapi.Point[]): { x: number; y: number } {
  const sx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const sy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x: sx, y: sy };
}

/**
 * Eye Aspect Ratio (EAR) — standard blink/squint metric.
 * eye landmarks: [corner_left, top1, top2, corner_right, bot1, bot2]
 * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 */
function eyeAspectRatio(eye: faceapi.Point[]): number {
  if (eye.length < 6) return 0;
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal < 1) return 0;
  return (vertical1 + vertical2) / (2 * horizontal);
}

/**
 * Derive geometric signals from 68 face landmarks.
 * All values are normalized so they're stable across different face sizes.
 */
function extractLandmarkData(
  landmarks: faceapi.FaceLandmarks68,
  detection: faceapi.FaceDetection,
): FaceLandmarkData {
  const lEye  = landmarks.getLeftEye();
  const rEye  = landmarks.getRightEye();
  const lBrow = landmarks.getLeftEyeBrow();
  const rBrow = landmarks.getRightEyeBrow();
  const mouth = landmarks.getMouth();
  const nose  = landmarks.getNose();
  const jaw   = landmarks.getJawOutline();

  // ── Reference scale: inter-eye distance ────────────────────────────────
  const lEyeCenter = centroid(lEye);
  const rEyeCenter = centroid(rEye);
  const interEye   = dist(
    new faceapi.Point(lEyeCenter.x, lEyeCenter.y),
    new faceapi.Point(rEyeCenter.x, rEyeCenter.y),
  );
  const scale = interEye > 1 ? interEye : 1;

  // ── Gaze offset: nose tip relative to face bounding box center ──────────
  // Nose tip is landmark index 3 of getNose() results (tip in 68-point model)
  const noseTip = nose[3] || nose[0];
  const box     = detection.box;
  const boxCx   = box.x + box.width  / 2;
  const boxCy   = box.y + box.height / 2;
  // Normalize to [-1, 1] by half-box dimensions
  const gazeOffsetX = box.width  > 1 ? ((noseTip.x - boxCx) / (box.width  / 2)) * 1.5 : 0;
  const gazeOffsetY = box.height > 1 ? ((noseTip.y - boxCy) / (box.height / 2)) * 1.5 : 0;

  // ── Head yaw proxy: difference in visible eye widths ───────────────────
  // When face turns right, left eye appears wider than right eye (and vice versa)
  const lEyeWidth = dist(lEye[0], lEye[3]);
  const rEyeWidth = dist(rEye[0], rEye[3]);
  const headYawProxy = scale > 0 ? (lEyeWidth - rEyeWidth) / scale : 0;

  // ── Mouth openness: vertical lip gap / inter-eye scale ─────────────────
  // Mouth has 20 points in 68-model; top lip top ≈ index 3, bottom lip bot ≈ index 9
  const mouthTop = mouth[3]  || mouth[0];
  const mouthBot = mouth[9]  || mouth[6];
  const mouthOpenness = Math.min(dist(mouthTop, mouthBot) / scale, 1.0);

  // ── Smile: mouth corner height vs center height ─────────────────────────
  const mouthLeft  = mouth[0];
  const mouthRight = mouth[6];
  const mouthMidY  = (mouthTop.y + mouthBot.y) / 2;
  const cornerLift = (mouthMidY - (mouthLeft.y + mouthRight.y) / 2) / scale;
  const smileScore = Math.max(0, Math.min(cornerLift * 4, 1));

  // ── Brow raise: distance from brow center to eye center / scale ─────────
  const lBrowCenter = centroid(lBrow);
  const rBrowCenter = centroid(rBrow);
  const browRaiseL  = Math.min(
    dist(new faceapi.Point(lBrowCenter.x, lBrowCenter.y), new faceapi.Point(lEyeCenter.x, lEyeCenter.y)) / scale,
    1.0,
  );
  const browRaiseR  = Math.min(
    dist(new faceapi.Point(rBrowCenter.x, rBrowCenter.y), new faceapi.Point(rEyeCenter.x, rEyeCenter.y)) / scale,
    1.0,
  );

  return {
    gazeOffsetX: Math.max(-1, Math.min(gazeOffsetX, 1)),
    gazeOffsetY: Math.max(-1, Math.min(gazeOffsetY, 1)),
    headYawProxy,
    mouthOpenness,
    eyeAspectRatioL: eyeAspectRatio(lEye),
    eyeAspectRatioR: eyeAspectRatio(rEye),
    browRaiseL,
    browRaiseR,
    smileScore,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useFaceAnalysis(
  onFrame: (signal: FrameSignal) => void,
): FaceAnalysisState {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  // Adaptive interval: if a frame took too long, slow down
  const adaptiveInterval = useRef<number>(DETECTION_INTERVAL_MS);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [lastFrame, setLastFrame] = useState<FrameSignal | null>(null);

  // Keep onFrame stable in the rAF loop without recreating the loop
  const onFrameRef = useRef(onFrame);
  useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);

  const stopEverything = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // ── Step 1: Load models (only if not already loaded) ─────────────────
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_PATH);
        }
        if (!faceapi.nets.faceLandmark68Net.isLoaded) {
          await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH);
        }
      } catch {
        if (!cancelled) setError("model_load_failed");
        return;
      }
      if (cancelled) return;

      // ── Step 2: Request camera ─────────────────────────────────────────
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
      } catch (err: any) {
        if (cancelled) return;
        const name: string = err?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          // Distinguish OS-level block from browser-level deny
          // If the browser never showed a prompt, it's likely an OS block
          const deviceAvailable = await navigator.mediaDevices
            .enumerateDevices()
            .then(ds => ds.some(d => d.kind === "videoinput"))
            .catch(() => false);
          setError(deviceAvailable ? "permission_denied" : "permission_denied_os");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("not_found");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setError("in_use");
        } else {
          setError("unknown");
        }
        return;
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;

      // ── Step 3: Attach stream to video element ─────────────────────────
      const video = videoRef.current;
      if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch {
        // autoplay blocked — not fatal, frames will still come once user interacts
      }
      if (cancelled) { stopEverything(); return; }

      setReady(true);

      // ── Step 4: Detection rAF loop ────────────────────────────────────
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,  // lower than default 416 — faster, still reliable
        scoreThreshold: MIN_DETECTION_SCORE,
      });

      const loop = async () => {
        if (cancelled) return;
        const now = Date.now();

        // Throttle to adaptive interval
        if (now - lastTickRef.current < adaptiveInterval.current) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTickRef.current = now;

        const frameStart = performance.now();

        let signal: FrameSignal = {
          timestamp: now,
          faceCount: 0,
          detectionScore: 0,
          primaryFace: null,
          frameProcessingMs: 0,
        };

        try {
          if (video.readyState >= 2) {
            const detections = await faceapi
              .detectAllFaces(video, detectorOptions)
              .withFaceLandmarks();

            const validDetections = detections.filter(
              d => d.detection.score >= MIN_DETECTION_SCORE,
            );

            signal.faceCount = validDetections.length;

            if (validDetections.length > 0) {
              // Sort by detection score, take the best one as primary
              validDetections.sort((a, b) => b.detection.score - a.detection.score);
              const primary = validDetections[0];
              signal.detectionScore = primary.detection.score;
              signal.primaryFace = extractLandmarkData(
                primary.landmarks,
                primary.detection,
              );
            }
          }
        } catch {
          // Detection error — emit a "no face" signal rather than crashing
        }

        const elapsed = performance.now() - frameStart;
        signal.frameProcessingMs = elapsed;

        // Adaptive interval: if frame took > 80ms, back off to avoid UI jank
        if (elapsed > 80) {
          adaptiveInterval.current = Math.min(adaptiveInterval.current + 50, 800);
        } else if (elapsed < 40 && adaptiveInterval.current > DETECTION_INTERVAL_MS) {
          adaptiveInterval.current = Math.max(adaptiveInterval.current - 25, DETECTION_INTERVAL_MS);
        }

        if (!cancelled) {
          setLastFrame(signal);
          onFrameRef.current(signal);
          rafRef.current = requestAnimationFrame(loop);
        }
      };

      rafRef.current = requestAnimationFrame(loop);
    };

    init();

    return () => {
      cancelled = true;
      stopEverything();
    };
  }, []); // intentionally empty — runs once on mount, cleans up on unmount

  return { ready, error, videoRef, canvasRef, lastFrame };
}
