import { Hand, Heart, HeartHandshake } from "lucide-react";
import { usePair } from "../context/PairContext";
import { useToast } from "../lib/toast";
import { btn2 } from "./ui";

const LIST = [["heart", "Heart", Heart], ["hug", "Hug", HeartHandshake], ["wave", "Wave", Hand]];

export default function Reactions() {
  const { paired, sendReaction } = usePair();
  const toast = useToast();
  if (!paired) return null;
  return (
    <div role="group" aria-label="Send a reaction" className="flex flex-wrap items-center gap-2">
      <span className="mr-2 text-sm text-ink/65">Send a reaction</span>
      {LIST.map(([type, label, Icon]) => (
        <button key={type} className={`${btn2} flex items-center gap-2 !px-4 !py-2`} onClick={() => sendReaction(type).then(() => toast(`${label} sent.`)).catch((e) => toast(e.message))}>
          <Icon size={16} />{label}
        </button>
      ))}
    </div>
  );
}
