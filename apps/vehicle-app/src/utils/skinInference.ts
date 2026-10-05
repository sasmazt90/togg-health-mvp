import type { FaceAlignment } from './skinAnalyzer';
import type { HeadSegmentation } from './skinSnapshot';

export class SkinInference {
  private worker = new Worker(new URL('./skinInference.worker.ts', import.meta.url));
  private sequence = 0;
  private closed = false;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();

  constructor() {
    this.worker.onmessage = event => {
      const request = this.pending.get(event.data.id);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data);
    };
    this.worker.onerror = () => this.close();
  }

  private request(type: string, frame?: ImageBitmap): Promise<any> {
    if (this.closed) {
      frame?.close();
      return Promise.reject(new Error('Cilt analiz motoru kapatıldı'));
    }
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Cilt analiz motoru yanıt vermiyor'));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, type, frame }, frame ? [frame] : []);
    });
  }

  async initialize(): Promise<void> {
    await this.request('initialize');
  }

  async assessAlignment(canvas: HTMLCanvasElement): Promise<FaceAlignment> {
    const frame = await createImageBitmap(canvas);
    return (await this.request('frame', frame)).alignment;
  }

  async segmentHead(canvas: HTMLCanvasElement): Promise<HeadSegmentation> {
    return (await this.request('segment', await createImageBitmap(canvas))).segmentation;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.worker.terminate();
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Cilt analiz motoru kapatıldı'));
    }
    this.pending.clear();
  }
}
