import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Hand } from "lucide-react";
import { api } from "../lib/api";
import { API_URL } from "../lib/config";
import { useToast } from "../lib/toast";
import { useGesture } from "../context/GestureContext";
import { usePair } from "../context/PairContext";
import Stage from "../components/Stage";
import { btn } from "../components/ui";

export default function ReceivePage() {
  const { paired, ready, pending, setPending, received, setReceived } = usePair();
  const g = useGesture();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(0);

  const receive = useCallback(async () => {
    if (busy) return;
    if (!pending) return toast("Nothing is waiting yet.");
    setBusy(true);
    try {
      const item = await api("/api/receive");
      setReceived((r) => [item, ...r]);
      setShown(0);
      setPending((n) => Math.max(0, n - 1));
    } catch (e) {
      toast(e.message);
      setPending(0);
    } finally {
      setBusy(false);
    }
  }, [busy, pending, setPending, setReceived, toast]);

  useEffect(() => {
    if (g.stable && g.label === "drop" && paired) { g.consume(); receive(); }
  }, [g, paired, receive]);

  const current = received[shown];
  const holding = g.label === "drop" && paired;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Receive</h1>
      {ready && !paired && (
        <p className="rounded-2xl bg-mail-red/10 px-4 py-3 text-sm">
          Nothing to receive until you <Link to="/pair" className="font-semibold underline underline-offset-4">pair a device</Link>.
        </p>
      )}
      <Stage progress={holding ? g.progress : 0} hint={pending ? `${pending} waiting. Hold a drop gesture to receive.` : "Waiting for a picture. This page updates as soon as one is sent."}>
        {current ? (
          <img key={current.id} src={`${API_URL}${current.url}`} alt="Received" className="arrive max-h-96 rounded-2xl object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Hand size={44} className={`text-mail-blue ${pending ? "animate-bounce" : ""}`} />
            <p className="text-lg font-medium">{pending ? "Something is waiting for you" : "Nothing yet"}</p>
          </div>
        )}
      </Stage>
      <div className="flex items-center gap-3">
        <button className={btn} onClick={receive} disabled={busy || !pending}>{busy ? "Receiving…" : "Receive now"}</button>
        {received.length > 1 && (
          <div className="flex gap-2" aria-label="Received this session">
            {received.map((r, i) => (
              <button key={r.id} onClick={() => setShown(i)} aria-label={`Show picture ${received.length - i}`} className={`h-12 w-12 overflow-hidden rounded-xl border-2 focus-visible:outline-2 focus-visible:outline-mail-blue ${i === shown ? "border-mail-red" : "border-transparent"}`}>
                <img src={`${API_URL}${r.url}`} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
