import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as pdfjs from 'pdfjs-dist';
import { useHostFile } from '../../../shared/src/webview/vscode';

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
/** ピンチ/ホイール操作が止まってから高解像度で描き直すまでの待ち */
const COMMIT_DELAY_MS = 120;

// worker は webview 起源から直接 new Worker できないため、取得して blob URL 化する。
async function setupWorker() {
  const self = (document.currentScript as HTMLScriptElement | null)?.src ?? '';
  const workerUrl = self.replace(/pdf\.js$/, 'pdf.worker.js');
  const code = await (await fetch(workerUrl)).text();
  pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
}
const workerReady = setupWorker();

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

interface Size {
  w: number;
  h: number;
}

function Page({ doc, n, scale, size }: { doc: pdfjs.PDFDocumentProxy; n: number; scale: number; size: Size }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: pdfjs.RenderTask | undefined;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled || !ref.current) return;
      const dpr = window.devicePixelRatio || 1;
      const vp = page.getViewport({ scale: scale * dpr });
      const c = ref.current;
      c.width = vp.width;
      c.height = vp.height;
      task = page.render({ canvasContext: c.getContext('2d')!, viewport: vp });
      await task.promise.catch(() => {});
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, n, scale]);
  // ラッパーの大きさは同期的に決まる (canvas の描画完了を待たない) ので、ズーム後のスクロール補正が効く
  return (
    <div className="mx-auto mb-3 bg-white shadow" style={{ width: size.w * scale, height: size.h * scale }}>
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}

function Viewer({ doc }: { doc: pdfjs.PDFDocumentProxy }) {
  const [scale, setScale] = useState(1.25);
  const [sizes, setSizes] = useState<Size[]>([]);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /** 操作中の拡縮率 (確定前) と、その基準点 (スクロール内容座標 / 表示座標) */
  const gesture = useRef<{ ratio: number; ax: number; ay: number; vx: number; vy: number } | null>(null);
  /** 描き直し後にスクロール位置を合わせるための基準 */
  const pendingAnchor = useRef<{ ax: number; ay: number; vx: number; vy: number; ratio: number } | null>(null);
  const commitTimer = useRef<number>();

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      Array.from({ length: doc.numPages }, async (_, i) => {
        const vp = (await doc.getPage(i + 1)).getViewport({ scale: 1 });
        return { w: vp.width, h: vp.height };
      }),
    ).then((s) => !cancelled && setSizes(s));
    return () => {
      cancelled = true;
    };
  }, [doc]);

  // 拡縮の確定: 本来の scale を更新して描き直し、基準点が動かないようスクロールを補正する
  const commit = () => {
    const g = gesture.current;
    const content = contentRef.current;
    if (!g || !content) return;
    gesture.current = null;
    content.style.transform = '';
    content.style.transformOrigin = '';
    pendingAnchor.current = g;
    setScale(clamp(scaleRef.current * g.ratio, MIN_SCALE, MAX_SCALE));
  };

  useLayoutEffect(() => {
    const a = pendingAnchor.current;
    const el = scrollRef.current;
    if (!a || !el) return;
    pendingAnchor.current = null;
    el.scrollLeft = a.ax * a.ratio - a.vx;
    el.scrollTop = a.ay * a.ratio - a.vy;
  }, [scale]);

  // トラックパッドのピンチは ctrlKey 付きの wheel として届く (Cmd/Ctrl+ホイールも同様)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const content = contentRef.current;
      if (!content) return;
      const rect = el.getBoundingClientRect();
      const vx = e.clientX - rect.left;
      const vy = e.clientY - rect.top;
      const prev = gesture.current;
      const base = prev?.ratio ?? 1;
      const step = Math.exp(-clamp(e.deltaY, -60, 60) * 0.01);
      const ratio = clamp(base * step, MIN_SCALE / scaleRef.current, MAX_SCALE / scaleRef.current);
      // 基準点は操作の最初の位置に固定する (途中で動かすと画面が泳ぐ)
      const g = prev ?? { ratio, ax: el.scrollLeft + vx, ay: el.scrollTop + vy, vx, vy };
      g.ratio = ratio;
      gesture.current = g;
      content.style.transformOrigin = `${g.ax}px ${g.ay}px`;
      content.style.transform = `scale(${ratio})`;
      window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(commit, COMMIT_DELAY_MS);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const step = (d: number) => setScale((s) => clamp(s + d, MIN_SCALE, MAX_SCALE));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-1 text-sm">
        <button className="px-2" onClick={() => step(-0.25)}>−</button>
        <span className="w-12 text-center">{Math.round(scale * 100)}%</span>
        <button className="px-2" onClick={() => step(0.25)}>＋</button>
        <span className="ml-auto opacity-70">{doc.numPages} pages</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto py-3">
        <div ref={contentRef}>
          {sizes.map((size, i) => (
            <Page key={i} doc={doc} n={i + 1} scale={scale} size={size} />
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  const file = useHostFile();
  const [doc, setDoc] = useState<pdfjs.PDFDocumentProxy>();
  const [err, setErr] = useState<string>();

  useEffect(() => {
    if (file.status !== 'ready') return;
    let d: pdfjs.PDFDocumentProxy | undefined;
    workerReady
      .then(() => pdfjs.getDocument({ data: file.bytes }).promise)
      .then((x) => {
        d = x;
        setDoc(x);
      })
      .catch((e) => setErr(String(e)));
    return () => void d?.destroy();
  }, [file.status === 'ready' ? file.bytes : null]);

  if (file.status === 'error') return <p className="p-4 text-red-500">{file.message}</p>;
  if (err) return <p className="p-4 text-red-500">{err}</p>;
  if (!doc) return <p className="p-4">読み込み中…</p>;
  return <Viewer doc={doc} />;
}

createRoot(document.getElementById('root')!).render(<App />);
