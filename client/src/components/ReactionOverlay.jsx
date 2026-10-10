import { Hand, Heart, HeartHandshake } from "lucide-react";
import { usePair } from "../context/PairContext";

const R = {
  heart: { Icon: Heart, text: "Thinking of you", color: "text-mail-red" },
  hug: { Icon: HeartHandshake, text: "Sent you a hug", color: "text-mail-red" },
  wave: { Icon: Hand, text: "Says hello", color: "text-mail-blue" },
};

export default function ReactionOverlay() {
  const { reaction } = usePair();
  if (!reaction) return null;
  const { Icon, text, color } = R[reaction.type];
  return (
    <div key={reaction.id} role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
      <div className="arrive flex flex-col items-center gap-3 rounded-[32px] bg-white/95 px-10 py-8 shadow-2xl">
        <Icon size={72} className={`${color} animate-pulse`} />
        <p className="text-2xl font-bold">{text}</p>
      </div>
    </div>
  );
}
