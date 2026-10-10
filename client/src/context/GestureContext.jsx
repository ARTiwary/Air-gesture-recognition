import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ml5 from "ml5";
import { ACTIONS, CONFIDENCE, HOLD_MS, INTERVAL_MS, MODEL_URL } from "../lib/config";

const Ctx = createContext(null);
export const useGesture = () => useContext(Ctx);

const IDLE = { label: "idle", confidence: 0, progress: 0, stable: false };

export function GestureProvider({ children }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const classifierRef = useRef(null);
  const hold = useRef({ label: null, start: 0 });
  const lock = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | paused | denied | error
  const [modelReady, setModelReady] = useState(false);
  const [g, setG] = useState(IDLE);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("ready");
    } catch (e) {
      setStatus(e.name === "NotAllowedError" ? "denied" : "error");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    hold.current = { label: null, start: 0 };
    setG(IDLE);
    setStatus("paused");
  }, []);

  // Load the model once. Everything runs in the browser; no video is uploaded.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        classifierRef.current = await ml5.imageClassifier(MODEL_URL);
        if (!alive) return;
        setModelReady(true);
        startCamera();
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => { alive = false; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera]);

  // Turn raw predictions into a steady signal: confident, same label, held long enough.
  const ingest = useCallback((label, confidence) => {
    const now = performance.now();
    if (!ACTIONS.includes(label) || confidence < CONFIDENCE) {
      hold.current = { label: null, start: 0 };
      lock.current = null;
      setG((p) => (p.label === "idle" ? p : { ...IDLE, confidence }));
      return;
    }
    if (hold.current.label !== label) hold.current = { label, start: now };
    if (lock.current === label) return setG({ label, confidence, progress: 0, stable: false });
    const progress = Math.min(1, (now - hold.current.start) / HOLD_MS);
    setG({ label, confidence, progress, stable: progress >= 1 });
  }, []);

  useEffect(() => {
    if (status !== "ready" || !modelReady) return;
    let alive = true, timer;
    const tick = () => {
      if (!alive) return;
      classifierRef.current.classify(videoRef.current, (results, error) => {
        if (!alive) return;
        if (!error && results?.[0]) ingest(results[0].label, results[0].confidence);
        timer = setTimeout(tick, INTERVAL_MS);
      });
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [status, modelReady, ingest]);

  // After acting on a gesture, require the hand to release before it can fire again.
  const consume = useCallback(() => { lock.current = hold.current.label; hold.current = { label: null, start: 0 }; }, []);
  const toggle = useCallback(() => (status === "ready" ? stopCamera() : startCamera()), [status, startCamera, stopCamera]);

  return (
    <Ctx.Provider value={{ ...g, status, consume, toggle }}>
      {children}
      <figure className={`fixed bottom-4 right-4 z-40 w-40 overflow-hidden rounded-2xl border-4 bg-ink shadow-xl ${status === "ready" ? (g.label === "idle" ? "border-white" : "border-mail-red") : "hidden"}`}>
        <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full -scale-x-100 object-cover" />
        <figcaption className="absolute inset-x-0 bottom-0 bg-ink/75 px-2 py-1 text-[11px] text-white">Video stays on this device</figcaption>
      </figure>
    </Ctx.Provider>
  );
}
