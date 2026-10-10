import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import { Camera, CameraOff, Inbox, Link2, Send } from "lucide-react";
import { ToastProvider } from "./lib/toast";
import { GestureProvider, useGesture } from "./context/GestureContext";
import { PairProvider, usePair } from "./context/PairContext";
import { tab } from "./components/ui";
import SendPage from "./pages/SendPage";
import ReceivePage from "./pages/ReceivePage";
import PairPage from "./pages/PairPage";
import ReactionOverlay from "./components/ReactionOverlay";

const CAMERA = { loading: "Loading model…", ready: "Camera on", paused: "Camera paused", denied: "Camera blocked", error: "No camera found" };

function Header() {
  const g = useGesture();
  const { pending, paired, online } = usePair();
  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <span className="mr-auto text-lg font-bold tracking-tight">Air Gesture</span>
        <nav className="flex gap-1" aria-label="Main">
          <NavLink to="/" end className={tab}><Send size={16} />Send</NavLink>
          <NavLink to="/receive" className={tab}>
            <Inbox size={16} />Receive
            {pending > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-mail-red px-1 text-xs text-white">{pending}</span>}
          </NavLink>
          <NavLink to="/pair" className={tab}><Link2 size={16} />{paired ? "Paired" : "Pair"}</NavLink>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-ink/25"}`} title={online ? "Connected" : "Offline"} />
          <span className="min-w-28 text-ink/70">{g.label === "idle" ? CAMERA[g.status] : `${g.label} ${Math.round(g.confidence * 100)}%`}</span>
          <button onClick={g.toggle} aria-label={g.status === "ready" ? "Pause camera" : "Turn camera on"} className="grid h-9 w-9 place-items-center rounded-full border border-ink/20 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-mail-blue">
            {g.status === "ready" ? <Camera size={16} /> : <CameraOff size={16} />}
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <PairProvider>
          <GestureProvider>
            <Header />
            <ReactionOverlay />
            <main className="mx-auto max-w-3xl px-4 py-8">
              <Routes>
                <Route path="/" element={<SendPage />} />
                <Route path="/receive" element={<ReceivePage />} />
                <Route path="/pair" element={<PairPage />} />
                <Route path="/drop" element={<Navigate to="/receive" replace />} />
              </Routes>
            </main>
          </GestureProvider>
        </PairProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
