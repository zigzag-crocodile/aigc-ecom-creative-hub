import type { CreativePackage } from "@/types/creative";
import { CopyButton, Pill, SectionCard } from "./ui";
import { Sparkles, ShieldAlert, Star, Wand2, Loader2, Target, TrendingUp, BadgeCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

export function CreativePackageView({
  pkg,
  onOptimize,
  onOptimizeBatch,
  optimizing,
}: {
  pkg: CreativePackage;
  onOptimize: (targetModule: string, goal: string) => void;
  onOptimizeBatch?: (selections: { module: string; suggestion: string }[]) => void;
  optimizing: boolean;
}) {
  const s = pkg.creativeScore;
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
        <TabsTrigger value="overview">总览/评分</TabsTrigger>
        <TabsTrigger value="analysis">商品&素材</TabsTrigger>
        <TabsTrigger value="hooks">Hook</TabsTrigger>
        <TabsTrigger value="script">脚本</TabsTrigger>
        <TabsTrigger value="visual">封面&视频</TabsTrigger>
        <TabsTrigger value="compliance">合规</TabsTrigger>
        <TabsTrigger value="optimization">优化建议</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-4">
        <SectionCard
          title="Creative Package 总览"
          subtitle={pkg.creativePackageSummary}
          right={<Pill tone={pkg.mode === "api" ? "ok" : "warn"}>{pkg.mode === "api" ? "API 模式" : "Mock 模式"}</Pill>}
        >
          <ScoreDashboard score={s} />
        </SectionCard>
      </TabsContent>

      {/* Analysis */}
      <TabsContent value="analysis" className="space-y-4">
        <SectionCard title="商品分析" subtitle="Product Analyst Agent">
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="商品类目" value={pkg.productAnalysis.category} />
            <Info label="人群洞察" value={pkg.productAnalysis.audienceInsight} />
            <Tags label="核心卖点" items={pkg.productAnalysis.coreSellingPoints} tone="ok" />
            <Tags label="用户痛点" items={pkg.productAnalysis.painPoints} tone="warn" />
            <Tags label="购买动机" items={pkg.productAnalysis.purchaseMotivation} tone="accent" />
            <Tags label="使用场景" items={pkg.productAnalysis.scenes} />
          </div>
        </SectionCard>

        {pkg.assetAnalysis.length > 0 && (
          <SectionCard title="图片素材分析" subtitle="Asset Analyst Agent · 多模态视觉">
            <div className="grid gap-3 md:grid-cols-2">
              {pkg.assetAnalysis.map((a, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium" title={a.filename}>{a.filename}</p>
                    <Pill tone="accent">{a.type}</Pill>
                  </div>
                  <Tags label="视觉元素" items={a.visualElements || []} />
                  <Tags label="提取卖点" items={a.extractedSellingPoints || []} tone="ok" />
                  <Tags label="可用于" items={a.usableFor || []} tone="accent" />
                  {a.diagnosis && <p className="mt-2 text-xs text-warning">⚠ 旧素材诊断：{a.diagnosis}</p>}
                  {a.competitorInsights && <p className="mt-2 text-xs text-accent">⚡ 竞品参考：{a.competitorInsights}</p>}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard title="创意策略" subtitle="Strategy Planner Agent">
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="推荐方向" value={pkg.creativePlan.direction} />
            <Info label="核心信息" value={pkg.creativePlan.coreMessage} />
            <Info label="表达方式" value={pkg.creativePlan.expression} />
            <Info label="为什么适合此投放目标" value={pkg.creativePlan.whyFitGoal} />
            <Info label="为什么适合此视频风格" value={pkg.creativePlan.whyFitStyle} />
          </div>
        </SectionCard>
      </TabsContent>

      {/* Hooks */}
      <TabsContent value="hooks" className="space-y-4">
        <SectionCard
          title="Hook 列表"
          subtitle="Hook Agent · 按 CTR 评分排序"
          right={
            <div className="flex items-center gap-2">
              <CopyButton
                label="一键复制全部"
                text={pkg.hooks
                  .map((h, i) => `${i + 1}. [${h.type} · CTR ${h.ctrScore}] ${h.text}`)
                  .join("\n")}
              />
              <button
                disabled={optimizing}
                onClick={() => onOptimize("hook", "提升 CTR 与首屏抓力，避免绝对化用语")}
                className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                重新优化
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {pkg.hooks.map((h, i) => {
              const selected = h.text === pkg.selectedHook.text;
              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 ${selected ? "border-primary bg-primary/5 glow-primary" : "border-border bg-muted/40"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {selected && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                        <p className="text-sm font-medium">{h.text}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Pill tone="accent">{h.type}</Pill>
                        <Pill tone="ok">CTR {h.ctrScore}</Pill>
                        {h.complianceRisk && <Pill tone="warn">⚠ {h.complianceRisk}</Pill>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{h.reason}</p>
                    </div>
                    <CopyButton iconOnly text={h.text} label="复制 Hook" />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </TabsContent>

      {/* Script */}
      <TabsContent value="script" className="space-y-4">
        <SectionCard
          title={`短视频脚本 · ${pkg.script.totalDuration}`}
          subtitle="Script Agent"
          right={
            <div className="flex gap-2">
              <CopyButton
                label="一键复制脚本"
                text={pkg.script.segments.map((s) => `【${s.time}】口播：${s.voiceover}\n画面：${s.visual}\n目的：${s.purpose}`).join("\n\n") + `\n\nCTA：${pkg.script.cta}`}
              />
              <button
                disabled={optimizing}
                onClick={() => onOptimize("script", "增强完播率与转化引导")}
                className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                重新优化
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {pkg.script.segments.map((seg, i) => (
              <div key={i} className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pill tone="ok">{seg.time}</Pill>
                    <span className="text-xs text-muted-foreground">{seg.purpose}</span>
                  </div>
                  <CopyButton iconOnly text={`【${seg.time}】口播：${seg.voiceover}\n画面：${seg.visual}`} label="复制此段" />
                </div>
                <p className="mt-2 text-sm"><span className="text-primary">口播：</span>{seg.voiceover}</p>
                <p className="text-sm text-muted-foreground"><span className="text-accent">画面：</span>{seg.visual}</p>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
              <div><span className="text-primary">CTA：</span>{pkg.script.cta}</div>
              <CopyButton iconOnly text={pkg.script.cta} label="复制 CTA" />
            </div>
          </div>
        </SectionCard>
      </TabsContent>

      {/* Visual: Cover + Video */}
      <TabsContent value="visual" className="space-y-4">
        <SectionCard
          title="封面图方案"
          subtitle="Visual Agent"
          right={<CopyButton label="一键复制 Prompt" text={pkg.coverPrompt} />}
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
            <div className="grid gap-3 md:grid-cols-2">
              <Info label="封面标题" value={pkg.coverPlan.title} />
              <Info label="画面主体" value={pkg.coverPlan.mainSubject} />
              <Info label="构图建议" value={pkg.coverPlan.composition} />
              <Info label="视觉风格" value={pkg.coverPlan.visualStyle} />
            </div>
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-4 text-center">
              <div>
                <Sparkles className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-sm font-semibold">{pkg.coverPlan.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">封面预览占位</p>
              </div>
            </div>
          </div>
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap">{pkg.coverPrompt}</pre>
        </SectionCard>

        <SectionCard
          title="视频分镜"
          subtitle="Video Agent"
          right={
            <CopyButton
              label="一键复制全部分镜"
              text={pkg.videoStoryboard.map((sh) => `【${sh.time}】画面：${sh.visual}\n动作：${sh.action}\n目的：${sh.purpose}`).join("\n\n")}
            />
          }
        >
          <div className="grid gap-3 md:grid-cols-2">
            {pkg.videoStoryboard.map((sh, i) => (
              <div key={i} className="rounded-2xl border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pill tone="accent">{sh.time}</Pill>
                    <span className="text-xs text-muted-foreground">镜头 {i + 1}</span>
                  </div>
                  <CopyButton iconOnly text={`【${sh.time}】画面：${sh.visual}\n动作：${sh.action}`} label="复制分镜" />
                </div>
                <p className="mt-2 text-xs font-semibold text-primary">画面</p>
                <p>{sh.visual}</p>
                <p className="mt-2 text-xs font-semibold text-accent">动作</p>
                <p className="text-muted-foreground">{sh.action}</p>
                <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-muted-foreground">目的：{sh.purpose}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="视频 Prompt"
          subtitle="用于视频生成模型的完整提示词"
          right={<CopyButton label="复制视频 Prompt" text={pkg.videoPrompt} />}
        >
          <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/60 p-3 font-mono text-xs whitespace-pre-wrap">{pkg.videoPrompt}</pre>
          <div className="mt-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
            <div className="text-center">
              <Sparkles className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-2">视频生成 Mock 卡片（videoUrl 字段已预留）</p>
            </div>
          </div>
        </SectionCard>
      </TabsContent>

      {/* Compliance */}
      <TabsContent value="compliance" className="space-y-4">
        <SectionCard
          title="合规检查"
          subtitle="Compliance Skill"
          right={<Pill tone={pkg.complianceCheck.hasRisk ? "warn" : "ok"}>{pkg.complianceCheck.hasRisk ? "存在风险" : "通过"}</Pill>}
        >
          {pkg.complianceCheck.issues.length === 0 && (
            <p className="text-xs text-muted-foreground">未检测到合规风险。</p>
          )}
          <div className="space-y-2">
            {pkg.complianceCheck.issues.map((it, i) => (
              <div key={i} className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    <Pill tone="warn">{it.riskType} · {it.riskLevel}风险</Pill>
                  </div>
                  <CopyButton iconOnly text={it.rewritten} label="复制改写" />
                </div>
                <p className="mt-2 text-xs">原表达：<span className="line-through">{it.original}</span></p>
                <p className="text-xs text-primary">建议改写：{it.rewritten}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </TabsContent>

      {/* Optimization with batch checkboxes */}
      <TabsContent value="optimization" className="space-y-4">
        <OptimizationPanel pkg={pkg} onOptimize={onOptimize} onOptimizeBatch={onOptimizeBatch} optimizing={optimizing} />
      </TabsContent>
    </Tabs>
  );
}

function ScoreDashboard({ score }: { score: CreativePackage["creativeScore"] }) {
  const metrics = [
    { label: "Hook CTR", value: score.hookCtrScore },
    { label: "完播潜力", value: score.retentionScore },
    { label: "卖点清晰度", value: score.sellingPointClarityScore },
    { label: "人群匹配", value: score.audienceFitScore },
    { label: "转化意图", value: score.conversionIntentScore },
    { label: "平台适配", value: score.platformFitScore },
    { label: "合规安全", value: score.complianceRiskScore },
  ];
  const topMetric = metrics.reduce((best, item) => (item.value > best.value ? item : best), metrics[0]);
  const weakMetric = metrics.reduce((weak, item) => (item.value < weak.value ? item : weak), metrics[0]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="rounded-[28px] bg-[#f2ebe5] p-5 text-center">
          <ScoreRing value={score.overallScore} />
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-2xl bg-white/70 p-3">
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <TrendingUp className="h-3.5 w-3.5" /> 最强项
              </div>
              <p className="mt-1 text-sm font-semibold">{topMetric.label}</p>
              <p className="font-mono text-lg">{Math.round(topMetric.value)}</p>
            </div>
            <div className="rounded-2xl bg-white/70 p-3">
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <Target className="h-3.5 w-3.5" /> 优先优化
              </div>
              <p className="mt-1 text-sm font-semibold">{weakMetric.label}</p>
              <p className="font-mono text-lg">{Math.round(weakMetric.value)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((item) => (
            <ScoreTile key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ScoreList title="优势" tone="ok" items={score.strengths} />
        <ScoreList title="待优化" tone="warn" items={score.weaknesses} />
        <ScoreList title="下一步建议" tone="accent" items={score.suggestions} />
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = v >= 85 ? "#0f9f6e" : v >= 70 ? "#7c5cff" : v >= 55 ? "#d99021" : "#d94b4b";
  return (
    <div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${v * 3.6}deg, rgba(20,16,24,0.08) 0deg)` }}>
      <div className="grid h-28 w-28 place-items-center rounded-full bg-[#fffaf6]">
        <div>
          <p className="font-mono text-4xl font-bold" style={{ color }}>{v}</p>
          <p className="text-xs text-muted-foreground">综合评分</p>
        </div>
      </div>
    </div>
  );
}

function ScoreTile({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const tone = v >= 85 ? "text-primary bg-primary/10" : v >= 70 ? "text-accent bg-accent/10" : v >= 55 ? "text-warning bg-warning/10" : "text-destructive bg-destructive/10";
  return (
    <div className="rounded-2xl border border-border bg-white/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={`rounded-full px-2 py-0.5 font-mono text-xs ${tone}`}>{v}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-current text-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function ScoreList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" | "accent" }) {
  const iconClass = tone === "ok" ? "text-primary" : tone === "warn" ? "text-warning" : "text-accent";
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
      <div className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${iconClass}`}>
        <BadgeCheck className="h-3.5 w-3.5" />
        {title}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {items.map((x, i) => <li key={i}>· {x}</li>)}
      </ul>
    </div>
  );
}

function OptimizationPanel({
  pkg,
  onOptimize,
  onOptimizeBatch,
  optimizing,
}: {
  pkg: CreativePackage;
  onOptimize: (m: string, g: string) => void;
  onOptimizeBatch?: (sel: { module: string; suggestion: string }[]) => void;
  optimizing: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === pkg.optimizationSuggestions.length) setSelected(new Set());
    else setSelected(new Set(pkg.optimizationSuggestions.map((_, i) => i)));
  };
  const applyBatch = () => {
    if (!onOptimizeBatch || selected.size === 0) return;
    const sel = [...selected].map((i) => ({
      module: pkg.optimizationSuggestions[i].module,
      suggestion: pkg.optimizationSuggestions[i].suggestion,
    }));
    onOptimizeBatch(sel);
  };

  return (
    <SectionCard
      title="优化建议"
      subtitle="Reflection Agent · 勾选后可一键批量采纳"
      right={
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
          >
            {selected.size === pkg.optimizationSuggestions.length ? "全不选" : "全选"}
          </button>
          <button
            onClick={applyBatch}
            disabled={optimizing || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            一键采纳已选 ({selected.size})
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        {pkg.optimizationSuggestions.map((o, i) => {
          const checked = selected.has(i);
          return (
            <label
              key={i}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-muted/40"}`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(i)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <Pill tone="accent">{o.module}</Pill>
                <p className="mt-1 text-sm">{o.suggestion}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">原因：{o.reason}</p>
              </div>
              {o.regenerate && (
                <button
                  disabled={optimizing}
                  onClick={(e) => { e.preventDefault(); onOptimize(o.module, o.suggestion); }}
                  className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  单独优化
                </button>
              )}
            </label>
          );
        })}
      </div>
    </SectionCard>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function Tags({ label, items, tone }: { label: string; items: string[]; tone?: "default" | "accent" | "warn" | "ok" }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.map((t, i) => <Pill key={i} tone={tone}>{t}</Pill>)}
      </div>
    </div>
  );
}
