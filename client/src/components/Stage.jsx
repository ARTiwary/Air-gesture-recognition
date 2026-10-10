// The airmail-striped frame. The bar underneath fills with the same stripes while a gesture is held.
export default function Stage({ progress = 0, children, hint }) {
  return (
    <section>
      <div className="airmail rounded-[32px] p-[7px] shadow-[0_18px_40px_-24px_rgba(15,27,45,.5)]">
        <div className="grid min-h-[22rem] place-items-center rounded-[26px] bg-white p-6">{children}</div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-label="Gesture hold" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="airmail h-full rounded-full transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
      </div>
      {hint && <p className="mt-3 text-sm text-ink/65">{hint}</p>}
    </section>
  );
}
