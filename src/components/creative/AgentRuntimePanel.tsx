import type { AgentStep } from "@/types/creative";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export function AgentRuntimePanel({
  steps,
  runningIndex,
}: {
  steps: AgentStep[];
  runningIndex: number; // -1 = idle, >=steps.length = done
}) {
  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const isDone = runningIndex > i;
        const isRunning = runningIndex === i;
        const isPending = runningIndex < i;
        return (
          <div
            key={s.id}
            className={`glass fade-in rounded-lg p-3 transition-all ${
              isRunning ? "glow-primary scan" : ""
            } ${isPending ? "opacity-40" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {isDone && <CheckCircle2 className="h-4 w-4 text-primary" />}
                {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {isPending && <span className="block h-2 w-2 rounded-full bg-muted-foreground/40" />}
                {s.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-accent/20 px-2 py-0.5 text-accent">{s.agent}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                    {s.skill}
                  </span>
                  <code className="text-[10px] text-primary">{s.tool}</code>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-foreground/80">thought:</span> {s.thought}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground/80">action:</span> {s.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground/80">obs:</span> {s.observation}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
