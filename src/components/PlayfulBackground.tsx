const FLOATERS: Array<{
  char: string;
  left: string;
  top: string;
  size: string;
  delay: string;
  duration: string;
}> = [
  { char: "🍓", left: "6%", top: "14%", size: "text-4xl md:text-5xl", delay: "0s", duration: "7s" },
  { char: "🍋", left: "82%", top: "10%", size: "text-3xl md:text-4xl", delay: "-1.4s", duration: "9s" },
  { char: "🍇", left: "12%", top: "68%", size: "text-3xl md:text-4xl", delay: "-2.8s", duration: "8s" },
  { char: "🥝", left: "88%", top: "62%", size: "text-4xl md:text-5xl", delay: "-0.7s", duration: "10s" },
  { char: "🍊", left: "72%", top: "38%", size: "text-3xl md:text-4xl", delay: "-3.5s", duration: "7.5s" },
  { char: "🍒", left: "24%", top: "34%", size: "text-3xl md:text-4xl", delay: "-2s", duration: "8.5s" },
  { char: "🅰️", left: "44%", top: "8%", size: "text-2xl md:text-3xl", delay: "-4.2s", duration: "9s" },
  { char: "🅱️", left: "58%", top: "80%", size: "text-2xl md:text-3xl", delay: "-1.1s", duration: "7.8s" },
  { char: "🍉", left: "36%", top: "88%", size: "text-3xl md:text-4xl", delay: "-3s", duration: "9.6s" },
  { char: "🍍", left: "94%", top: "30%", size: "text-3xl md:text-4xl", delay: "-5s", duration: "8.2s" }
];

/**
 * Fondo animado compartido por todas las pantallas: un degradado festivo con
 * "auroras" que se desplazan y frutas/letras flotando. Es puramente decorativo
 * (aria-hidden, pointer-events-none) y respeta prefers-reduced-motion.
 */
export default function PlayfulBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_15%_0%,#7c1d9e_0%,#3b0a63_45%,#1c0636_100%)]" />

      <div className="absolute -left-40 -top-40 h-[38rem] w-[38rem] animate-blob rounded-full bg-fuchsia-500/35 blur-3xl" />
      <div
        className="absolute -bottom-52 -right-32 h-[34rem] w-[34rem] animate-blob rounded-full bg-amber-400/25 blur-3xl"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 animate-blob rounded-full bg-violet-400/30 blur-3xl"
        style={{ animationDelay: "-12s" }}
      />

      {FLOATERS.map((item) => (
        <span
          key={item.char + item.left}
          className={`absolute select-none opacity-25 drop-shadow-lg ${item.size} animate-float`}
          style={{
            left: item.left,
            top: item.top,
            animationDelay: item.delay,
            animationDuration: item.duration
          }}
        >
          {item.char}
        </span>
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_35%,rgba(12,3,28,0.55)_100%)]" />
    </div>
  );
}
