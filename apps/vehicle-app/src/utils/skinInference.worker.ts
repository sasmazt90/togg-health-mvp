import { SkinAnalyzer } from './skinAnalyzer';
import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

let segmenter: ImageSegmenter | null = null;
async function getSegmenter() {
  if (!segmenter) segmenter = await ImageSegmenter.createFromOptions(
    await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'),
    { baseOptions: { modelAssetPath: '/models/selfie_multiclass_256x256.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: true });
  return segmenter;
}

// Dedicated worker: the unchanged model and gates run away from cockpit input.
self.onmessage = async (event: MessageEvent) => {
  const { id, type, frame } = event.data;
  try {
    if (type === 'initialize') {
      const model = await SkinAnalyzer.getFaceLandmarker();
      if (!model) throw new Error('MediaPipe başlatılamadı');
      self.postMessage({ id, ready: true });
      return;
    }
    const canvas = new OffscreenCanvas(frame.width, frame.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Analiz tuvali başlatılamadı');
    ctx.drawImage(frame, 0, 0);
    if (type === 'segment') {
      const model = await getSegmenter();
      const start = performance.now();
      const result = model.segment(canvas);
      try {
        const mask = result.categoryMask;
        if (!mask) throw Error('SEGMENTATION_EMPTY');
        const categories = new Uint8Array(mask.getAsUint8Array());
        const confidenceMasks = result.confidenceMasks;
        if (!confidenceMasks || confidenceMasks.length !== 6) throw Error('SEGMENTATION_CONFIDENCE_MISSING');
        const hair = confidenceMasks[1].getAsFloat32Array(), face = confidenceMasks[3].getAsFloat32Array();
        const confidence = new Float32Array(hair.length);
        for (let i=0;i<confidence.length;i++) confidence[i]=Math.min(1,hair[i]+face[i]);
        const neckConfidence=new Float32Array(confidenceMasks[2].getAsFloat32Array());
        self.postMessage({ id, segmentation: { width: mask.width, height: mask.height, categories, confidence, neckConfidence, elapsedMs: performance.now() - start } }, { transfer: [categories.buffer, confidence.buffer,neckConfidence.buffer] });
      } finally { result.close(); }
      return;
    }
    // Both canvas types have the pixel/drawing operations used by this analyzer.
    const alignment = SkinAnalyzer.assessAlignment(ctx as unknown as CanvasRenderingContext2D, canvas.width, canvas.height);
    self.postMessage({ id, alignment });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  } finally {
    frame?.close();
  }
};
