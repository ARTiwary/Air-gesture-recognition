import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../lib/config";
import { api, getToken, setToken } from "../lib/api";
import { useToast } from "../lib/toast";

const Ctx = createContext(null);
export const usePair = () => useContext(Ctx);

export function PairProvider({ children }) {
  const toast = useToast();
  const sock = useRef(null);
  const bootRef = useRef(() => {});
  const [ready, setReady] = useState(false);
  const [paired, setPaired] = useState(false);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(false);
  const [received, setReceived] = useState([]);
  const [reaction, setReaction] = useState(null);

  const connect = useCallback(() => {
    sock.current?.disconnect();
    const s = io(API_URL, { auth: { token: getToken() }, transports: ["websocket"] });
    s.on("connect", () => setOnline(true));
    s.on("disconnect", () => setOnline(false));
    s.on("paired", () => { setPaired(true); toast("Paired. You can send now."); });
    s.on("unpaired", () => { setPaired(false); setPending(0); setReceived([]); toast("The other device unpaired."); });
    s.on("incoming", () => { setPending((n) => n + 1); toast("A picture is waiting. Make a drop gesture to receive it."); });
    s.on("recalled", () => setPending((n) => Math.max(0, n - 1)));
    s.on("reaction", (type) => { setReaction({ type, id: Date.now() }); setTimeout(() => setReaction(null), 2800); });
    s.on("connect_error", (e) => { // the server restarted and forgot this session
      if (e.message !== "unauthorized") return;
      s.disconnect(); setToken(null); setPaired(false); setPending(0); setReceived([]); bootRef.current();
    });
    sock.current = s;
  }, [toast]);

  const boot = useCallback(async () => {
    try {
      let me;
      if (getToken()) {
        try { me = await api("/api/me"); } catch (e) { if (e.status !== 401) throw e; setToken(null); }
      }
      if (!me) { // first visit, or the server restarted and forgot this session
        const { token } = await api("/api/session", { method: "POST" });
        setToken(token);
        me = await api("/api/me");
      }
      setPaired(me.paired);
      setPending(me.pending);
      connect();
      setReady(true);
    } catch {
      toast("Can't reach the server. Retrying…");
      setTimeout(boot, 5000);
    }
  }, [connect, toast]);

  useEffect(() => { bootRef.current = boot; boot(); return () => sock.current?.disconnect(); }, [boot]);

  const unpair = useCallback(async () => {
    await api("/api/pair", { method: "DELETE" });
    setPaired(false); setPending(0); setReceived([]);
  }, []);

  const sendReaction = useCallback((type) => api("/api/react", { method: "POST", json: { type } }), []);

  return (
    <Ctx.Provider value={{ ready, paired, setPaired, pending, setPending, online, received, setReceived, unpair, reaction, sendReaction }}>
      {children}
    </Ctx.Provider>
  );
}
