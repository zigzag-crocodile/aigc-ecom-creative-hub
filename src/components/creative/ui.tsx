import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyButton({
  text,
  label = "复制",
  iconOnly = false,
}: {
  text: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const [ok, setOk] = useState(false);
  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {}
  };
  if (iconOnly) {
    return (
      <button
        onClick={onClick}
        title={ok ? "已复制" : label}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-secondary text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {ok ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {ok ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {ok ? "已复制" : label}
    </button>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="glass fade-in rounded-xl p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone =
    v >= 85 ? "bg-primary" : v >= 70 ? "bg-accent" : v >= 55 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{v}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "warn" | "ok" }) {
  const cls =
    tone === "accent"
      ? "bg-accent/15 text-accent border-accent/30"
      : tone === "warn"
        ? "bg-warning/15 text-warning border-warning/30"
        : tone === "ok"
          ? "bg-primary/15 text-primary border-primary/40"
          : "bg-secondary text-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}
