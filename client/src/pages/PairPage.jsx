import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { usePair } from "../context/PairContext";
import Reactions from "../components/Reactions";
import { btn, btn2 } from "../components/ui";

export default function PairPage() {
  const { ready, paired, setPaired, unpair } = usePair();
  const toast = useToast();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [code, setCode] = useState(null); // { code, expiresAt }
  const [left, setLeft] = useState(0);
  const [input, setInput] = useState("");
  const tried = useRef(false);

  const join = (c) =>
    api("/api/pair/join", { method: "POST", json: { code: c } })
      .then(() => { setPaired(true); nav("/"); })
      .catch((err) => toast(err.message));

  // Scanning the QR opens /pair?code=XXXXXX and pairs automatically.
  useEffect(() => {
    const c = params.get("code");
    if (!c || !ready || paired || tried.current) return;
    tried.current = true;
    setParams({}, { replace: true });
    join(c);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!code) return;
    const tick = () => setLeft(Math.max(0, Math.round((code.expiresAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [code]);

  useEffect(() => { if (paired) setCode(null); }, [paired]);

  const create = () => api("/api/pair/code", { method: "POST" }).then(setCode).catch((e) => toast(e.message));

  if (paired) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">Paired</h1>
        <p className="max-w-prose text-ink/70">This device is linked to one other device. Nothing is saved: closing or reloading this page ends the link.</p>
        <Reactions />
        <button className={btn2} onClick={() => unpair().then(() => toast("Unpaired."))}>Unpair this device</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold tracking-tight">Pair two devices</h1>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-[28px] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Show a code</h2>
          <p className="mt-1 text-sm text-ink/65">Use this on the first device.</p>
          {code ? (
            <div className="arrive mt-6 space-y-4">
              <p className="text-5xl font-bold tabular-nums tracking-[.12em]" aria-label={`Code ${code.code.split("").join(" ")}`}>{code.code.slice(0, 3)} {code.code.slice(3)}</p>
              {left > 0 && (
                <div className="w-fit rounded-2xl border border-ink/15 p-3">
                  <QRCodeSVG value={`${window.location.origin}/pair?code=${code.code}`} size={144} title="Scan to pair" />
                </div>
              )}
              <p className="text-sm text-ink/65">{left ? `Scan it or type the code. Expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}. Works once.` : "Code expired."}</p>
              {!left && <button className={btn2} onClick={create}>Get a new code</button>}
            </div>
          ) : (
            <button className={`${btn} mt-6`} onClick={create}>Show pairing code</button>
          )}
        </section>
        <section className="rounded-[28px] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Enter a code</h2>
          <p className="mt-1 text-sm text-ink/65">Use this on the second device.</p>
          <form onSubmit={(e) => { e.preventDefault(); join(input); }} className="mt-6 space-y-4">
            <label className="block text-sm font-medium" htmlFor="code">Pairing code</label>
            <input id="code" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} maxLength={7} autoComplete="off" autoCapitalize="characters" spellCheck={false}
              className="w-full rounded-2xl border border-ink/25 px-4 py-3 text-2xl font-semibold tracking-[.2em] focus-visible:outline-2 focus-visible:outline-mail-blue" />
            <button className={btn} disabled={input.replace(/[^A-Z0-9]/g, "").length < 6}>Pair devices</button>
          </form>
        </section>
      </div>
    </div>
  );
}
