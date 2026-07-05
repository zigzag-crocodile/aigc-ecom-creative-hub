import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Zap,
  LogIn,
  LogOut,
  FolderOpen,
  Home,
  Calendar,
  BookOpen,
  LayoutGrid,
  Settings,
  User as UserIcon,
  Plus,
  MessageSquareText,
  Clock3,
  ChevronRight,
  Target,
} from "lucide-react";

import type { CreativePackage, ProductInput, UploadedAsset } from "@/types/creative";
import { ImageUploader } from "@/components/creative/ImageUploader";
import { AgentRuntimePanel } from "@/components/creative/AgentRuntimePanel";
import { CreativePackageView } from "@/components/creative/CreativePackageView";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buildAgentSteps } from "@/lib/agent/mock";
import {
  generateCreativePackage,
  optimizeCreativePackage,
  optimizeCreativePackageBatch,
} from "@/lib/agent/orchestrator.functions";
import { autoSaveRecord, listProjects } from "@/lib/projects.functions";
import { useAuth } from "@/hooks/use-auth";

type ProjectNavItem = {
  id: string;
  name: string;
  description: string | null;
  updated_at: string;
  recordCount: number;
};

type DockView = "workspace" | "calendar" | "assets" | "templates" | "settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AIGC Ecom Creative Hub" },
      { name: "description", content: "面向电商品牌的 AIGC 创意生成、模型调度、效果评测与策略迭代平台。" },
      { property: "og:title", content: "AIGC Ecom Creative Hub" },
      { property: "og:description", content: "围绕品牌认知、种草、成交转化生成 Creative Package，并用 CTR/CVR/ROI 驱动优化。" },
    ],
  }),
  component: Index,
});

const CAMPAIGN_GOALS = ["提升点击率 CTR", "提升商品点击", "提升转化率 CVR", "提升 ROI", "提升 GMV"];
const VIDEO_STYLES = ["种草口播", "测评对比", "剧情短片", "直播切片风", "清爽广告片", "大促促销风"];
const GEN_GOALS = ["Hook", "脚本", "封面", "视频 Prompt", "评分", "合规"];

const DEFAULT_INPUT: ProductInput = {
  productName: "防晒喷雾",
  category: "美妆个护",
  sellingPoints: "清爽不油腻，SPF50+，适合夏天通勤和户外补涂",
  targetAudience: "18-30 岁年轻女性",
  campaignGoal: "提升点击率 CTR",
  videoStyle: "种草口播",
  generationGoals: ["Hook", "脚本", "封面", "视频 Prompt", "评分", "合规"],
  images: [],
};

function Index() {
  const { user, signOut } = useAuth();
  const [input, setInput] = useState<ProductInput>(DEFAULT_INPUT);
  const [pkg, setPkg] = useState<CreativePackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [runIdx, setRunIdx] = useState(-1);
  const [warning, setWarning] = useState<string | null>(null);
  const [tab, setTab] = useState("workbench");
  const [dockView, setDockView] = useState<DockView>("workspace");
  const [projects, setProjects] = useState<ProjectNavItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const generate = useServerFn(generateCreativePackage);
  const optimize = useServerFn(optimizeCreativePackage);
  const optimizeBatch = useServerFn(optimizeCreativePackageBatch);
  const autoSave = useServerFn(autoSaveRecord);
  const loadProjects = useServerFn(listProjects);

  const steps = useMemo(() => pkg?.agentSteps ?? buildAgentSteps(), [pkg]);

  useEffect(() => {
    if (!loading && !optimizing) return;
    setRunIdx(0);
    const id = setInterval(() => {
      setRunIdx((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 700);
    return () => clearInterval(id);
  }, [loading, optimizing, steps.length]);

  const refreshProjects = async () => {
    if (!user) {
      setProjects([]);
      return;
    }
    setProjectsLoading(true);
    try {
      const rows = await loadProjects();
      setProjects(rows as ProjectNavItem[]);
    } catch (e: any) {
      toast.error(`加载项目失败：${e?.message || e}`);
    } finally {
      setProjectsLoading(false);
    }
  };

  useEffect(() => {
    refreshProjects();
  }, [user?.id]);

  const persist = async (p: CreativePackage) => {
    const payload = {
      name: `${input.productName} · ${input.campaignGoal}`,
      tags: [input.category, input.videoStyle].filter(Boolean),
      input,
      pkg: p,
      ts: Date.now(),
    };
    // 本地兜底：未登录或网络失败时也不丢
    try {
      if (typeof window !== "undefined") {
        const key = "creative_local_history";
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        prev.unshift({ ...payload, input: { ...payload.input, images: [] } });
        localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
      }
    } catch {}

    if (!user) {
      toast.message("已暂存到本地，登录后将自动同步到「我的项目」", {
        action: { label: "去登录", onClick: () => (window.location.href = "/login") },
      });
      return;
    }
    try {
      await autoSave({
        data: { name: payload.name, tags: payload.tags, input, pkg: p },
      });
      await refreshProjects();
      toast.success("已自动同步到「我的项目 / 默认项目」");
    } catch (e: any) {
      toast.error(`同步项目失败：${e?.message || e}`);
    }
  };

  const onGenerate = async () => {
    if (!input.productName.trim()) {
      toast.error("请填写商品名称");
      return;
    }
    setLoading(true);
    setWarning(null);
    setPkg(null);
    setTab("workbench");
    try {
      const res = await generate({ data: { input } });
      setPkg(res.pkg);
      if ("warning" in res && res.warning) setWarning(res.warning);
      setRunIdx(steps.length);
      toast.success(res.mode === "api" ? "Creative Package 已生成（API）" : "Creative Package 已生成（Mock）");
      setTab("results");
      await persist(res.pkg);
    } catch (e: any) {
      toast.error(`生成失败：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const onOptimize = async (targetModule: string, optimizationGoal: string) => {
    setOptimizing(true);
    setWarning(null);
    try {
      const res = await optimize({ data: { input, targetModule, optimizationGoal } });
      setPkg(res.pkg);
      if ("warning" in res && res.warning) setWarning(res.warning);
      setRunIdx(steps.length);
      toast.success(`已重新优化「${targetModule}」`);
      await persist(res.pkg);
    } catch (e: any) {
      toast.error(`优化失败：${e?.message || e}`);
    } finally {
      setOptimizing(false);
    }
  };

  const onOptimizeBatch = async (selections: { module: string; suggestion: string }[]) => {
    if (selections.length === 0) return;
    setOptimizing(true);
    setWarning(null);
    try {
      const res = await optimizeBatch({ data: { input, selections } });
      setPkg(res.pkg);
      if ("warning" in res && res.warning) setWarning(res.warning);
      setRunIdx(steps.length);
      toast.success(`已批量采纳 ${selections.length} 条优化建议`);
      await persist(res.pkg);
    } catch (e: any) {
      toast.error(`批量优化失败：${e?.message || e}`);
    } finally {
      setOptimizing(false);
    }
  };

  const toggleGoal = (g: string) =>
    setInput((s) => ({
      ...s,
      generationGoals: s.generationGoals.includes(g)
        ? s.generationGoals.filter((x) => x !== g)
        : [...s.generationGoals, g],
    }));

  return (
    <div className="min-h-screen bg-[#bff3dd] px-3 py-6 sm:px-8 lg:py-10">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[34px] bg-[#fffaf6] shadow-[0_30px_90px_rgba(25,92,67,0.24)]">
      <header className="border-b border-[#efe7df] bg-[#fffaf6]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1.5 pr-4 sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff6f61]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#f6c453]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#65c96f]" />
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-display text-sm font-semibold tracking-tight sm:text-base">
                AIGC Ecom Creative Hub
              </h1>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                Creative Director Agent · Brand-to-ROI Creative Workflow
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                  <UserIcon className="h-3 w-3" /> {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  title="退出登录"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/60 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <LogIn className="h-3.5 w-3.5" /> 登录
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="grid gap-0 bg-[#fffaf6] lg:grid-cols-[84px_260px_1fr] lg:h-[calc(100vh-112px)] lg:min-h-[720px] lg:overflow-hidden">
        <IconDock
          userEmail={user?.email}
          signedIn={Boolean(user)}
          active={dockView}
          onSelect={(view) => {
            setDockView(view);
            if (view === "workspace") setTab("workbench");
          }}
        />
        <ProjectRail
          userEmail={user?.email}
          projects={projects}
          loading={projectsLoading}
          signedIn={Boolean(user)}
        />

        {dockView !== "workspace" ? (
          <DockFeaturePanel view={dockView} />
        ) : (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 min-w-0 flex-col px-5 py-5">
          <TabsList className="mb-5 rounded-full bg-[#eee8e2] p-1">
            <TabsTrigger value="workbench">创意工作台</TabsTrigger>
            <TabsTrigger value="results">生成结果</TabsTrigger>
            <TabsTrigger value="agent">策略链路</TabsTrigger>
          </TabsList>

          {/* Workbench tab */}
          <TabsContent value="workbench" className="min-h-0 flex-1 overflow-hidden">
            <div className="grid h-full gap-5 lg:grid-cols-[380px_1fr_320px]">
              <aside className="min-h-0 space-y-4 overflow-y-auto pr-1">
                <section className="rounded-[28px] border border-[#eadfd5] bg-white p-5 shadow-sm">
                  <h2 className="font-display text-sm font-semibold">商品输入</h2>
                  <p className="mb-3 text-xs text-muted-foreground">不同商品 / 投放目标 / 风格会得到不同结果</p>
                  <div className="space-y-3">
                    <Field label="商品名称">
                      <input
                        value={input.productName}
                        onChange={(e) => setInput({ ...input, productName: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </Field>
                    <Field label="商品类目">
                      <input
                        value={input.category}
                        onChange={(e) => setInput({ ...input, category: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </Field>
                    <Field label="商品卖点">
                      <textarea
                        rows={3}
                        value={input.sellingPoints}
                        onChange={(e) => setInput({ ...input, sellingPoints: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </Field>
                    <Field label="目标人群">
                      <input
                        value={input.targetAudience}
                        onChange={(e) => setInput({ ...input, targetAudience: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </Field>
                    <Field label="投放目标">
                      <select
                        value={input.campaignGoal}
                        onChange={(e) => setInput({ ...input, campaignGoal: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      >
                        {CAMPAIGN_GOALS.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="视频风格">
                      <select
                        value={input.videoStyle}
                        onChange={(e) => setInput({ ...input, videoStyle: e.target.value })}
                        className="w-full rounded-md bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      >
                        {VIDEO_STYLES.map((g) => <option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="生成目标（多选）">
                      <div className="flex flex-wrap gap-1.5">
                        {GEN_GOALS.map((g) => {
                          const on = input.generationGoals.includes(g);
                          return (
                            <button
                              key={g}
                              type="button"
                              onClick={() => toggleGoal(g)}
                              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                                on
                                  ? "border-primary bg-primary/15 text-primary"
                                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {g}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>
                </section>

                <section className="rounded-[28px] border border-[#eadfd5] bg-white p-5 shadow-sm">
                  <h2 className="mb-3 font-display text-sm font-semibold">图片素材上传</h2>
                  <ImageUploader
                    assets={input.images}
                    onChange={(images: UploadedAsset[]) => setInput({ ...input, images })}
                  />
                </section>

                <button
                  onClick={onGenerate}
                  disabled={loading}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#141018] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(20,16,24,0.18)] transition-all hover:opacity-95 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Agent 执行中…" : "生成 Creative Package"}
                </button>
                {warning && (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                    {warning}
                  </div>
                )}
              </aside>

              <section className="min-h-0 overflow-y-auto pr-1">
                {loading || optimizing ? (
                  <GeneratingState steps={steps} runIdx={runIdx} />
                ) : pkg ? (
                  <WorkbenchResultPreview pkg={pkg} onOpenResults={() => setTab("results")} />
                ) : (
                  <EmptyState />
                )}
              </section>

              <aside className="hidden xl:block">
                <div className="h-full overflow-y-auto rounded-[30px] bg-[#f2ebe5] p-5 shadow-sm">
                  <h2 className="mb-3 font-display text-sm font-semibold">实时评分</h2>
                  {pkg ? (
                    <ScoreSidebar pkg={pkg} />
                  ) : (
                    <p className="text-xs text-muted-foreground">生成后这里会显示评分概览。</p>
                  )}
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="results" className="min-h-0 flex-1 overflow-hidden">
            <div className="grid h-full gap-5 xl:grid-cols-[1fr_320px]">
              <section className="min-h-0 overflow-y-auto pr-1">
                {pkg ? (
                  <>
                    {user && (
                      <div className="mb-3 flex items-center justify-end text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" /> 已自动同步到「我的项目 / 默认项目」
                        </span>
                      </div>
                    )}
                    <CreativePackageView
                      pkg={pkg}
                      onOptimize={onOptimize}
                      onOptimizeBatch={onOptimizeBatch}
                      optimizing={optimizing}
                    />
                  </>
                ) : loading || optimizing ? (
                  <GeneratingState steps={steps} runIdx={runIdx} />
                ) : (
                  <ResultEmptyState onBack={() => setTab("workbench")} />
                )}
              </section>
              <aside className="hidden min-h-0 overflow-y-auto rounded-[30px] bg-[#f2ebe5] p-5 shadow-sm xl:block">
                <h2 className="mb-3 font-display text-sm font-semibold">评分概览</h2>
                {pkg ? <ScoreSidebar pkg={pkg} /> : <p className="text-xs text-muted-foreground">生成后这里会显示评分概览。</p>}
              </aside>
            </div>
          </TabsContent>

          {/* Agent runtime tab */}
          <TabsContent value="agent" className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto rounded-[30px] border border-[#eadfd5] bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-semibold">策略链路</h2>
                  <p className="text-xs text-muted-foreground">
                    从商品理解、创意生成到评分复盘的实时编排过程
                  </p>
                </div>
                {(loading || optimizing) && (
                  <span className="inline-flex items-center gap-2 text-xs text-primary">
                    <span className="pulse-dot" /> running
                  </span>
                )}
              </div>
              <AgentRuntimePanel
                steps={steps}
                runningIndex={loading || optimizing ? runIdx : (pkg ? steps.length : -1)}
              />
              {pkg && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="text-sm font-semibold">Creative Package 已生成</p>
                    <p className="text-xs text-muted-foreground">
                      策略链路用于复盘过程，完整结果仍保留在创意工作台。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab("results")}
                    className="rounded-full bg-[#141018] px-4 py-2 text-xs font-semibold text-white"
                  >
                    查看结果
                  </button>
                </div>
              )}
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-foreground">Main Agent</p>
                  编排子 Agent，整合最终 Creative Package
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-foreground">SubAgents</p>
                  Product / Asset / Strategy / Hook / Script / Visual / Scoring / Compliance / Reflection
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-foreground">Skills & Tools</p>
                  Multi-modal Vision · JSON Schema · Compliance Rules · Self-Reflection
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}

        <footer className="hidden border-t border-[#efe7df] px-5 py-4 text-center text-[11px] text-muted-foreground lg:col-span-3">
          AIGC Ecom Creative Hub · TanStack server function · 多模态 AI 网关（火山方舟 / Lovable AI）·
          无密钥时自动 Mock
        </footer>
      </main>

      </div>
    </div>
  );
}


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function WorkbenchResultPreview({ pkg, onOpenResults }: { pkg: CreativePackage; onOpenResults: () => void }) {
  const score = Math.round(pkg.creativeScore.overallScore);
  const cards = [
    { label: "主 Hook", value: pkg.selectedHook.text, tone: "bg-[#f7c4ca]" },
    { label: "创意方向", value: pkg.creativePlan.direction, tone: "bg-[#fee0ad]" },
    { label: "转化动作", value: pkg.script.cta, tone: "bg-[#bff3dd]" },
    { label: "封面标题", value: pkg.coverPlan.title, tone: "bg-[#cbc8fb]" },
  ];
  return (
    <div className="grid h-full content-start gap-4">
      <section className="rounded-[30px] bg-[#f2ebe5] p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">生成完成</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Creative Package Ready</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{pkg.creativePackageSummary}</p>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-[#141018] text-white">
            <div className="text-center">
              <p className="font-mono text-3xl font-bold">{score}</p>
              <p className="text-[10px] text-white/70">score</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenResults}
          className="mt-5 rounded-full bg-[#141018] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(20,16,24,0.16)]"
        >
          查看完整生成结果
        </button>
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.label} className={`${card.tone} rounded-[24px] p-4`}>
            <p className="text-xs text-black/55">{card.label}</p>
            <p className="mt-2 line-clamp-3 text-base font-semibold text-[#141018]">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultEmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center rounded-[30px] border border-dashed border-[#dfd2c6] bg-white/70 p-8 text-center">
      <div>
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-lg font-semibold">还没有生成结果</h2>
        <p className="mt-1 text-sm text-muted-foreground">回到创意工作台填写商品信息后，即可在这里查看完整结果。</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-full bg-[#141018] px-5 py-2 text-sm font-semibold text-white"
        >
          返回工作台
        </button>
      </div>
    </div>
  );
}

function DockFeaturePanel({ view }: { view: DockView }) {
  const config = {
    calendar: {
      icon: Calendar,
      title: "投放排期",
      subtitle: "按品牌节奏安排素材生成、复盘和二次迭代。",
      cards: [
        ["本周", "夏季防晒主推素材复盘"],
        ["下周", "种草短视频 A/B Hook 测试"],
        ["月度", "ROI 表现素材沉淀与再生成"],
      ],
    },
    assets: {
      icon: BookOpen,
      title: "素材库",
      subtitle: "管理商品图、旧广告封面、竞品参考和可复用视觉方向。",
      cards: [
        ["商品图", "用于商品识别与卖点抽取"],
        ["旧素材", "用于诊断画面问题与改版方向"],
        ["竞品参考", "用于拆解品类表达和差异化"],
      ],
    },
    templates: {
      icon: LayoutGrid,
      title: "创意模板",
      subtitle: "面向不同营销目标的生成模板，点击即可作为策略起点。",
      cards: [
        ["CTR 提升", "强 Hook + 高信息密度封面"],
        ["CVR 转化", "痛点场景 + 信任背书 + CTA"],
        ["ROI 优化", "人群细分 + 卖点聚焦 + 素材复用"],
      ],
    },
    settings: {
      icon: Settings,
      title: "工作台设置",
      subtitle: "统一管理模型、合规、同步和导出偏好。",
      cards: [
        ["模型调度", "DeepSeek / Groq 自动兜底"],
        ["合规策略", "禁用绝对化与虚假承诺表达"],
        ["项目同步", "生成后自动保存到我的项目"],
      ],
    },
    workspace: {
      icon: Home,
      title: "创意工作台",
      subtitle: "回到主页继续生成。",
      cards: [],
    },
  }[view];
  const Icon = config.icon;
  return (
    <section className="min-h-0 overflow-y-auto px-5 py-5">
      <div className="rounded-[34px] bg-[#f2ebe5] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.subtitle}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {config.cards.map(([title, desc], i) => (
            <div
              key={title}
              className={`rounded-[26px] p-5 ${
                i === 0 ? "bg-[#f7c4ca]" : i === 1 ? "bg-[#fee0ad]" : "bg-[#bff3dd]"
              }`}
            >
              <p className="text-sm font-semibold text-[#141018]">{title}</p>
              <p className="mt-2 text-sm text-black/60">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[26px] bg-white/80 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" />
            当前状态
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            这是可用的功能面板入口，后续生成结果、素材和排期都会和项目记录保持统一风格。
          </p>
        </div>
      </div>
    </section>
  );
}

function IconDock({
  userEmail,
  signedIn,
  active,
  onSelect,
}: {
  userEmail?: string;
  signedIn: boolean;
  active: DockView;
  onSelect: (view: DockView) => void;
}) {
  const avatarText = (userEmail?.[0] || "G").toUpperCase();
  const items: { icon: typeof Home; label: string; view: DockView }[] = [
    { icon: Home, label: "工作台", view: "workspace" },
    { icon: Calendar, label: "排期", view: "calendar" },
    { icon: BookOpen, label: "素材库", view: "assets" },
    { icon: LayoutGrid, label: "模板", view: "templates" },
  ];
  return (
    <aside className="hidden bg-[#f2ebe5] px-3 py-4 lg:flex lg:flex-col lg:items-center">
      <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#fffaf6] text-primary shadow-sm">
        <Zap className="h-5 w-5" />
      </div>
      <nav className="flex flex-1 flex-col items-center gap-3">
        {items.map(({ icon: Icon, label, view }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(view)}
            title={label}
            className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${
              active === view
                ? "bg-[#141018] text-white shadow-[0_10px_25px_rgba(20,16,24,0.18)]"
                : "bg-[#fffaf6] text-foreground hover:bg-white"
            }`}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => onSelect("settings")}
          title="设置"
          className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${
            active === "settings" ? "bg-[#141018] text-white shadow-[0_10px_25px_rgba(20,16,24,0.18)]" : "bg-[#fffaf6] text-foreground hover:bg-white"
          }`}
        >
          <Settings className="h-5 w-5" />
        </button>
        <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#f7a6b8] to-[#9bdcc2] text-sm font-semibold text-white">
          {signedIn ? avatarText : "G"}
        </div>
      </div>
    </aside>
  );
}

function ProjectRail({
  userEmail,
  projects,
  loading,
  signedIn,
}: {
  userEmail?: string;
  projects: ProjectNavItem[];
  loading: boolean;
  signedIn: boolean;
}) {
  const avatarText = (userEmail?.[0] || "G").toUpperCase();
  return (
    <aside className="sticky top-0 flex h-full min-h-0 flex-col bg-[#fffaf6] p-4 lg:border-r lg:border-[#efe7df]">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </div>
        <Link
          to="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground hover:text-foreground"
          title="新建创意"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div className="mb-3 px-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Workspace</p>
        <h2 className="mt-1 font-display text-sm font-semibold">我的项目</h2>
      </div>

      <Link
        to="/"
        className="mb-2 flex items-center gap-2 rounded-full bg-[#141018] px-3 py-2.5 text-xs font-semibold text-white shadow-sm"
      >
        <MessageSquareText className="h-4 w-4" />
        新建创意会话
      </Link>

      {signedIn ? (
        <Link
          to="/projects"
          className="mb-3 flex items-center justify-between rounded-full bg-[#f2ebe5] px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            全部项目
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <Link
          to="/login"
          className="mb-3 flex items-center justify-between rounded-full bg-[#f2ebe5] px-3 py-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <span className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            登录后同步项目
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}

      <div className="mb-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>最近记录</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {signedIn && projects.length > 0 ? (
          projects.map((project) => (
            <Link
              key={project.id}
              to="/projects/$projectId"
              params={{ projectId: project.id }}
              className="group block rounded-[22px] border border-transparent bg-[#f6f0ea] p-3 hover:border-primary/30 hover:bg-white"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <MessageSquareText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    <span>{new Date(project.updated_at).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>{project.recordCount} 条</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : signedIn ? (
          <div className="rounded-[22px] border border-dashed border-[#dfd2c6] bg-[#f6f0ea] p-4 text-xs text-muted-foreground">
            生成 Creative Package 后，会自动沉淀到这里。
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[#dfd2c6] bg-[#f6f0ea] p-4 text-xs text-muted-foreground">
            登录后可查看项目记录、生成历史和复盘结果。
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[26px] bg-[#f2ebe5] p-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-500 text-sm font-semibold text-primary-foreground">
            {avatarText}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{signedIn ? userEmail : "Guest User"}</p>
            <p className="text-[11px] text-muted-foreground">
              {signedIn ? "项目自动同步中" : "未登录"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function ScoreSidebar({ pkg }: { pkg: CreativePackage }) {
  const s = pkg.creativeScore;
  const items: [string, number][] = [
    ["Hook CTR", s.hookCtrScore],
    ["完播", s.retentionScore],
    ["卖点", s.sellingPointClarityScore],
    ["人群", s.audienceFitScore],
    ["转化", s.conversionIntentScore],
    ["平台", s.platformFitScore],
    ["合规", s.complianceRiskScore],
  ];
  const overall = Math.max(0, Math.min(100, Math.round(s.overallScore)));
  const ringColor = overall >= 85 ? "#0f9f6e" : overall >= 70 ? "#7c5cff" : overall >= 55 ? "#d99021" : "#d94b4b";
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] bg-white/70 p-4 text-center">
        <div
          className="mx-auto grid h-28 w-28 place-items-center rounded-full"
          style={{ background: `conic-gradient(${ringColor} ${overall * 3.6}deg, rgba(20,16,24,0.08) 0deg)` }}
        >
          <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[#f2ebe5]">
            <div>
              <p className="font-mono text-3xl font-bold" style={{ color: ringColor }}>{overall}</p>
              <p className="text-[11px] text-muted-foreground">综合</p>
            </div>
          </div>
        </div>
      </div>
      {items.map(([k, v]) => (
        <div key={k} className="rounded-2xl bg-white/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{k}</span>
            <span className="font-mono text-xs font-semibold">{Math.round(v)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${v >= 85 ? "bg-primary" : v >= 70 ? "bg-accent" : v >= 55 ? "bg-warning" : "bg-destructive"}`}
              style={{ width: `${v}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass gridline flex h-[360px] items-center justify-center rounded-xl">
      <div className="text-center">
        <Sparkles className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-display text-sm font-semibold">等待输入</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          填写商品信息与上传素材后，点击「生成 Creative Package」启动 Agent。
        </p>
      </div>
    </div>
  );
}

function GeneratingState({ steps, runIdx }: { steps: any[]; runIdx: number }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-[#eadfd5] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold">正在生成 Creative Package</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              结果会直接出现在这里；策略链路只作为过程记录保留。
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <span className="pulse-dot" /> running
          </span>
        </div>
        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl bg-muted/30 p-3">
          <AgentRuntimePanel steps={steps} runningIndex={runIdx} />
        </div>
      </div>
    </div>
  );
}
