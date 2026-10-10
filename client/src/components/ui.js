const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mail-blue";
export const btn = `rounded-full bg-mail-blue px-6 py-3 font-semibold text-white transition-colors hover:bg-mail-blue/90 disabled:opacity-40 ${focus}`;
export const btn2 = `rounded-full border border-ink/25 px-5 py-3 font-medium transition-colors hover:bg-ink/5 disabled:opacity-40 ${focus}`;
export const tab = ({ isActive }) =>
  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${focus} ${isActive ? "bg-ink text-white" : "text-ink/70 hover:bg-ink/5"}`;
