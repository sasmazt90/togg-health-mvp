import { SkinAnalyzer } from './skinAnalyzer';

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
    // Both canvas types have the pixel/drawing operations used by this analyzer.
    const alignment = SkinAnalyzer.assessAlignment(ctx as unknown as CanvasRenderingContext2D, canvas.width, canvas.height);
    self.postMessage({ id, alignment });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  } finally {
    frame?.close();
  }
};
