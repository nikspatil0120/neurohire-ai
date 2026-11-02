import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let model: cocoSsd.ObjectDetection | null = null;
let isDetecting = false;
let isInitializing = false;

async function loadModel(customUrl?: string) {
  if (model || isInitializing) return;
  isInitializing = true;

  const origin =
    typeof location !== "undefined" && location.origin && location.origin !== "null"
      ? location.origin
      : "";
  const localModelUrl =
    customUrl || (origin ? `${origin}/models/coco-ssd/model.json` : "/models/coco-ssd/model.json");

  // Attempt 1: Load local weights from /models/coco-ssd/model.json
  try {
    console.log("[ObjectDetectorWorker] Loading local COCO-SSD from:", localModelUrl);
    model = await cocoSsd.load({
      base: "lite_mobilenet_v2",
      modelUrl: localModelUrl,
    });
    console.log("✅ [ObjectDetectorWorker] Local COCO-SSD loaded successfully");
    self.postMessage({ type: "READY" });
    isInitializing = false;
    return;
  } catch (err) {
    console.warn("[ObjectDetectorWorker] Failed to load local weights, trying default...", err);
  }

  // Attempt 2: Fallback to default COCO-SSD CDN
  try {
    model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    console.log("✅ [ObjectDetectorWorker] Fallback COCO-SSD loaded successfully");
    self.postMessage({ type: "READY" });
  } catch (e: any) {
    console.error("❌ [ObjectDetectorWorker] COCO-SSD load failed completely:", e);
    self.postMessage({ type: "ERROR", error: String(e) });
  } finally {
    isInitializing = false;
  }
}

// Automatically begin initialization on worker startup
loadModel();

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === "INIT") {
    if (!model) {
      await loadModel(e.data.modelUrl);
    } else {
      self.postMessage({ type: "READY" });
    }
  } else if (e.data.type === "DETECT") {
    const { imageBitmap } = e.data;
    if (!model || isDetecting) {
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      return;
    }

    isDetecting = true;
    try {
      // 0.20 scoreThreshold ensures mobile phones and devices are promptly detected
      const predictions = await model.detect(imageBitmap, 10, 0.20);
      self.postMessage({ type: "PREDICTIONS", predictions });
    } catch (err: any) {
      self.postMessage({ type: "PREDICTIONS", predictions: [], error: String(err) });
    } finally {
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      isDetecting = false;
    }
  }
};
