import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { api } from "../lib/api";
import { IMAGE_TYPES, MAX_BYTES } from "../lib/config";
import { useToast } from "../lib/toast";
import { useGesture } from "../context/GestureContext";
import { usePair } from "../context/PairContext";
import Stage from "../components/Stage";
import Reactions from "../components/Reactions";
import { btn, btn2 } from "../components/ui";

export default function SendPage() {
  const { paired, ready } = usePair();
  const g = useGesture();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const pick = (f) => {
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) return toast("Use a JPG, PNG, WebP or GIF image.");
    if (f.size > MAX_BYTES) return toast("That image is over 5 MB. Choose a smaller one.");
    setFile(f);
  };

  useEffect(() => {
    if (!file) return setUrl(null);
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const send = useCallback(async () => {
    if (!file || busy || !paired) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const { id } = await api("/api/send", { method: "POST", form });
      setFile(null);
      toast("Sent.", {
        label: "Undo",
        run: () => api(`/api/send/${id}`, { method: "DELETE" }).then(() => toast("Send cancelled.")).catch(() => toast("Too late to undo. It was already received.")),
      });
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }, [file, busy, paired, toast]);

  useEffect(() => {
    if (g.stable && g.label === "grab" && file && paired) { g.consume(); send(); }
  }, [g, file, paired, send]);

  const holding = g.label === "grab" && !!file && paired;

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold tracking-tight">Send a picture</h1>
      {ready && !paired && (
        <p className="rounded-2xl bg-mail-red/10 px-4 py-3 text-sm">
          You're not paired with another device yet. <Link to="/pair" className="font-semibold underline underline-offset-4">Pair a device</Link> to start sending.
        </p>
      )}
      <Stage progress={holding ? g.progress : 0} hint={file ? "Hold a grab gesture to send, or use the button." : "Choose a picture, then hold a grab gesture to send it."}>
        {file ? (
          <div className="arrive flex w-full flex-col items-center gap-4">
            <img src={url} alt="Selected" className="max-h-72 rounded-2xl object-contain" />
            <p className="text-sm text-ink/65">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
            <div className="flex gap-3">
              <button className={btn} onClick={send} disabled={busy || !paired}>{busy ? "Sending…" : "Send now"}</button>
              <button className={btn2} onClick={() => setFile(null)}>Choose another</button>
            </div>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
            className={`flex h-72 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-mail-blue ${over ? "border-mail-blue bg-mail-blue/5" : "border-ink/25 hover:bg-ink/[.03]"}`}
          >
            <ImagePlus size={40} className="text-mail-blue" />
            <span className="text-lg font-medium">Drop a picture here or click to browse</span>
            <span className="text-sm text-ink/60">JPG, PNG, WebP or GIF, up to 5 MB</span>
            <input type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" onChange={(e) => pick(e.target.files[0])} />
          </label>
        )}
      </Stage>
      <Reactions />
    </div>
  );
}
