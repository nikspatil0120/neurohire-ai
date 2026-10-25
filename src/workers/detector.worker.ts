import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let model: cocoSsd.ObjectDetection | null = null;
let isDetecting = false;

// Load COCO-SSD with local weights
cocoSsd.load({
  base: "lite_mobilenet_v2",
  modelUrl: "/models/coco-ssd/model.json",
}).then((m) => {
  model = m;
  self.postMessage({ type: "READY" });
}).catch((err) => {
  // Fallback to default
  cocoSsd.load({ base: "lite_mobilenet_v2" })
    .then((m) => {
      model = m;
      self.postMessage({ type: "READY" });
    })
    .catch((e) => {
      self.postMessage({ type: "ERROR", error: String(e) });
    });
});

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === "DETECT") {
    const { imageBitmap } = e.data;
    if (!model || isDetecting) {
      if (imageBitmap && typeof imageBitmap.close === "function") {
        imageBitmap.close();
      }
      return;
    }

    isDetecting = true;
    try {
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
