import { createServerFn } from "@tanstack/react-start";
import type { CreativePackage, ProductInput } from "@/types/creative";
import { buildAgentSteps, generateMockPackage } from "./mock";

const SYSTEM_PROMPT = `你是一个面向电商短视频投流场景的 AIGC 创意流水线 Agent (Creative Director Agent)。
你需要根据用户输入的商品文字信息和上传的图片素材，完成：
1. 商品分析 2. 图片素材分析 3. 创意策略 4. Hook 生成 5. 短视频脚本 6. 封面图方案 7. 视频分镜 8. 视频生成 Prompt 9. 创意评分 10. 合规检查 11. 优化建议

围绕投放指标思考：CTR / 商品点击 / CVR / ROI / GMV / 完播率 / 平台适配 / 合规风险。
根据投放目标和视频风格调整内容方向与评分权重。
合规：避免「最」「第一」「国家级」等绝对化用语；如有，标记并改写。

必须输出严格 JSON，符合给定 schema，不要输出 Markdown，不要解释性段落。`;

const JSON_SCHEMA_HINT = `{
  "productAnalysis": { "category": string, "coreSellingPoints": string[], "painPoints": string[], "purchaseMotivation": string[], "scenes": string[], "audienceInsight": string },
  "assetAnalysis": [ { "filename": string, "type": string, "visualElements": string[], "extractedSellingPoints": string[], "usableFor": string[], "diagnosis": string|null, "competitorInsights": string|null } ],
  "creativePlan": { "direction": string, "coreMessage": string, "expression": string, "whyFitGoal": string, "whyFitStyle": string },
  "hooks": [ { "text": string, "type": string, "ctrScore": number(0-100), "reason": string, "complianceRisk": string|null } ],
  "selectedHookIndex": number,
  "script": { "totalDuration": "15s", "segments": [ { "time": "0-3s"|"3-8s"|"8-12s"|"12-15s", "voiceover": string, "visual": string, "purpose": string } ], "cta": string },
  "coverPlan": { "title": string, "mainSubject": string, "composition": string, "visualStyle": string },
  "coverPrompt": string,
  "videoStoryboard": [ { "time": string, "visual": string, "action": string, "purpose": string } ],
  "videoPrompt": string,
  "creativeScore": { "overallScore": number, "hookCtrScore": number, "retentionScore": number, "sellingPointClarityScore": number, "audienceFitScore": number, "conversionIntentScore": number, "platformFitScore": number, "complianceRiskScore": number, "strengths": string[], "weaknesses": string[], "suggestions": string[] },
  "complianceCheck": { "hasRisk": boolean, "issues": [ { "original": string, "rewritten": string, "riskType": string, "riskLevel": "低"|"中"|"高" } ] },
  "optimizationSuggestions": [ { "module": string, "reason": string, "suggestion": string, "regenerate": boolean } ],
  "creativePackageSummary": string
}`;

function buildUserPrompt(input: ProductInput, optimizeNote?: string): string {
  return `# 商品输入
- 商品名称: ${input.productName}
- 商品类目: ${input.category}
- 商品卖点: ${input.sellingPoints}
- 目标人群: ${input.targetAudience}
- 投放目标: ${input.campaignGoal}
- 视频风格: ${input.videoStyle}
- 生成目标: ${input.generationGoals.join("、") || "全部"}
- 上传图片类型: ${input.images.map((i) => `${i.filename}(${i.type})`).join("，") || "无"}

${optimizeNote ? `# 优化要求\n${optimizeNote}\n` : ""}

# 输出要求
严格 JSON，匹配以下 schema（不要输出多余字段、不要 markdown、不要解释）：
${JSON_SCHEMA_HINT}

要求：
- hooks 数量 4-5 条，按 ctrScore 降序；selectedHookIndex 指向最佳。
- script.segments 必须包含 4 段：0-3s / 3-8s / 8-12s / 12-15s。
- 评分按投放目标调整权重（CTR→Hook 权重高；CVR/GMV→转化权重高；ROI→人群匹配权重高）。
- 若图片为「旧素材」需给出 diagnosis；若为「竞品素材图」需给出 competitorInsights。
- 不允许出现「最/第一/国家级/绝对/100%/根治」等绝对化或医疗承诺用语；如有请在 complianceCheck 列出并改写。`;
}

function toTextOnlyMessages(messages: any[]) {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    const text = message.content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part.text;
        if (part?.type === "image_url") return "[已上传图片素材，当前文本模型仅使用文件名与图片类型摘要]";
        return "";
      })
      .filter(Boolean)
      .join("\n");
    return { ...message, content: text };
  });
}

async function callJsonChatCompletion({
  provider,
  url,
  key,
  model,
  messages,
  textOnly = false,
}: {
  provider: string;
  url: string;
  key: string;
  model: string;
  messages: any[];
  textOnly?: boolean;
}): Promise<string> {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 25000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: textOnly ? toTextOnlyMessages(messages) : messages,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error(`${provider} timeout after ${timeoutMs}ms`);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${provider} ${resp.status}: ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "{}";
}

async function callLovableAI(messages: any[]): Promise<string> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const arkKey = process.env.ARK_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;

  if (deepseekKey) {
    return callJsonChatCompletion({
      provider: "DeepSeek",
      url: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions",
      key: deepseekKey,
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages,
      textOnly: true,
    });
  }

  if (groqKey) {
    return callJsonChatCompletion({
      provider: "Groq",
      url: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      textOnly: true,
    });
  }

  // 优先使用火山方舟 ARK
  if (arkKey) {
    return callJsonChatCompletion({
      provider: "ARK",
      url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      key: arkKey,
      model: process.env.ARK_MODEL || "doubao-seed-1-6-250615",
      messages,
    });
  }

  if (!lovableKey) throw new Error("No AI key configured");
  return callJsonChatCompletion({
    provider: "AI Gateway",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: lovableKey,
    model: process.env.OPENAI_MODEL || "google/gemini-2.5-flash",
    messages,
  });
}

function hasAIKey() {
  return !!(
    process.env.DEEPSEEK_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.ARK_API_KEY ||
    process.env.LOVABLE_API_KEY
  );
}

function buildMessages(input: ProductInput, optimizeNote?: string) {
  const userContent: any[] = [{ type: "text", text: buildUserPrompt(input, optimizeNote) }];
  for (const img of input.images) {
    if (img.base64?.startsWith("data:")) {
      userContent.push({
        type: "image_url",
        image_url: { url: img.base64 },
      });
      userContent.push({ type: "text", text: `↑ 图片「${img.filename}」类型: ${img.type}` });
    }
  }
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ];
}

function safeParseJSON(s: string): any | null {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ============== 合规拦截 ==============
const FORBIDDEN_RULES: { re: RegExp; sub: string; type: string }[] = [
  { re: /最[佳优好棒强大新先进低高便宜便捷快有效安全]/g, sub: "出色", type: "绝对化用语" },
  { re: /第一(?!次|时间|印象)/g, sub: "领先", type: "绝对化用语" },
  { re: /国家级|世界级|顶级|顶尖/g, sub: "高标准", type: "绝对化用语" },
  { re: /100%|百分之百/g, sub: "高比例", type: "绝对化用语" },
  { re: /根治|彻底治愈|药到病除/g, sub: "改善", type: "医疗承诺" },
  { re: /绝对(?!值)/g, sub: "明显", type: "绝对化用语" },
  { re: /唯一(?!性)/g, sub: "少见", type: "绝对化用语" },
  { re: /永久|永远/g, sub: "长效", type: "绝对化用语" },
  { re: /包治|包好|包瘦|包退/g, sub: "助力", type: "虚假承诺" },
  { re: /神器|神效|奇效/g, sub: "好物", type: "夸大用语" },
];

function sanitizeString(s: string): { out: string; issues: { original: string; rewritten: string; type: string }[] } {
  let out = s;
  const issues: { original: string; rewritten: string; type: string }[] = [];
  for (const f of FORBIDDEN_RULES) {
    const matches = out.match(f.re);
    if (matches && matches.length) {
      for (const m of matches) issues.push({ original: m, rewritten: f.sub, type: f.type });
      out = out.replace(f.re, f.sub);
    }
  }
  return { out, issues };
}

function deepSanitize<T>(value: T): { value: T; issues: { original: string; rewritten: string; type: string }[] } {
  const all: { original: string; rewritten: string; type: string }[] = [];
  const walk = (v: any): any => {
    if (typeof v === "string") {
      const { out, issues } = sanitizeString(v);
      all.push(...issues);
      return out;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: any = {};
      for (const k of Object.keys(v)) o[k] = walk(v[k]);
      return o;
    }
    return v;
  };
  return { value: walk(value), issues: all };
}

function enforceCompliance(pkg: CreativePackage): { pkg: CreativePackage; rewrittenCount: number } {
  const { value: cleaned, issues } = deepSanitize(pkg);
  // 去重
  const dedup = new Map<string, { original: string; rewritten: string; riskType: string; riskLevel: "低" | "中" | "高" }>();
  for (const i of issues) {
    const key = `${i.original}->${i.rewritten}`;
    if (!dedup.has(key)) {
      dedup.set(key, {
        original: i.original,
        rewritten: i.rewritten,
        riskType: i.type,
        riskLevel: i.type.includes("医疗") || i.type.includes("虚假") ? "高" : "中",
      });
    }
  }
  const autoIssues = Array.from(dedup.values());
  cleaned.complianceCheck = {
    hasRisk: false,
    issues: [...autoIssues, ...((cleaned.complianceCheck?.issues ?? []) as any[])],
  } as any;
  return { pkg: cleaned, rewrittenCount: autoIssues.length };
}

function assembleFromAI(raw: any, input: ProductInput): CreativePackage {
  const fallback = generateMockPackage(input);
  if (!raw || typeof raw !== "object") return fallback;
  const hooks = Array.isArray(raw.hooks) && raw.hooks.length ? raw.hooks : fallback.hooks;
  const selectedIdx = typeof raw.selectedHookIndex === "number" ? raw.selectedHookIndex : 0;
  const selectedHook = hooks[Math.min(Math.max(selectedIdx, 0), hooks.length - 1)] || hooks[0];

  return {
    mode: "api",
    agentSteps: buildAgentSteps(),
    productAnalysis: raw.productAnalysis ?? fallback.productAnalysis,
    assetAnalysis: Array.isArray(raw.assetAnalysis) ? raw.assetAnalysis : fallback.assetAnalysis,
    creativePlan: raw.creativePlan ?? fallback.creativePlan,
    hooks,
    selectedHook,
    script: raw.script ?? fallback.script,
    coverPlan: raw.coverPlan ?? fallback.coverPlan,
    coverPrompt: raw.coverPrompt ?? fallback.coverPrompt,
    videoStoryboard: Array.isArray(raw.videoStoryboard) ? raw.videoStoryboard : fallback.videoStoryboard,
    videoPrompt: raw.videoPrompt ?? fallback.videoPrompt,
    videoUrl: null,
    creativeScore: raw.creativeScore ?? fallback.creativeScore,
    complianceCheck: raw.complianceCheck ?? fallback.complianceCheck,
    optimizationSuggestions: Array.isArray(raw.optimizationSuggestions) ? raw.optimizationSuggestions : fallback.optimizationSuggestions,
    creativePackageSummary: raw.creativePackageSummary ?? fallback.creativePackageSummary,
  };
}

// 检测包内是否仍存在违禁词
function detectViolations(pkg: CreativePackage): string[] {
  const hits = new Set<string>();
  const walk = (v: any) => {
    if (typeof v === "string") {
      for (const f of FORBIDDEN_RULES) {
        const m = v.match(f.re);
        if (m) m.forEach((x) => hits.add(x));
      }
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(pkg);
  return Array.from(hits);
}

async function generateCompliantPackage(input: ProductInput, baseNote?: string): Promise<{ pkg: CreativePackage; warning?: string }> {
  let note = baseNote;
  let lastPkg: CreativePackage | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await callLovableAI(buildMessages(input, note));
    const raw = safeParseJSON(content);
    const pkg = assembleFromAI(raw, input);
    const violations = detectViolations(pkg);
    lastPkg = pkg;
    if (!violations.length) {
      const { pkg: cleaned } = enforceCompliance(pkg);
      return { pkg: cleaned };
    }
    // 让模型重写
    note = `${baseNote ? baseNote + "\n" : ""}上一版输出仍包含违禁词：${violations.join("、")}。请彻底重写所有相关字段，去除一切绝对化用语、医疗承诺、虚假承诺、夸大用语（如最/第一/国家级/100%/根治/绝对/唯一/永久/包治/神器 等及其变体），并保持其它模块协调。`;
  }
  // 兜底：本地强制改写
  const { pkg: cleaned, rewrittenCount } = enforceCompliance(lastPkg!);
  return {
    pkg: cleaned,
    warning: rewrittenCount > 0 ? `已自动改写 ${rewrittenCount} 处违禁表达以确保合规。` : undefined,
  };
}

export const generateCreativePackage = createServerFn({ method: "POST" })
  .inputValidator((data: { input: ProductInput }) => data)
  .handler(async ({ data }) => {
    const { input } = data;
    if (!hasAIKey()) {
      const { pkg } = enforceCompliance(generateMockPackage(input));
      return { mode: "mock" as const, pkg, warning: "未检测到 AI 密钥，正在使用 Mock 模式。" };
    }
    try {
      const { pkg, warning } = await generateCompliantPackage(input);
      return { mode: "api" as const, pkg, warning };
    } catch (e: any) {
      const msg = String(e?.message || e);
      const isRate = msg.includes("429");
      const isCredit = msg.includes("402");
      const { pkg } = enforceCompliance(generateMockPackage(input));
      return {
        mode: "mock" as const,
        pkg,
        warning: isRate
          ? "AI 调用过于频繁（429），已切换 Mock。"
          : isCredit
            ? "AI 额度不足（402），已切换 Mock。"
            : `AI 调用失败：${msg.slice(0, 160)}，已使用 Mock。`,
      };
    }
  });

export const optimizeCreativePackage = createServerFn({ method: "POST" })
  .inputValidator((data: { input: ProductInput; targetModule: string; optimizationGoal: string }) => data)
  .handler(async ({ data }) => {
    const { input, targetModule, optimizationGoal } = data;
    const note = `请重点优化模块「${targetModule}」，优化目标：${optimizationGoal}。在保持其余模块一致性的基础上，重写该模块并相应更新评分。`;
    if (!hasAIKey()) {
      const base = generateMockPackage(input);
      base.creativeScore.overallScore = Math.min(95, base.creativeScore.overallScore + 5);
      base.creativePackageSummary = `已根据「${targetModule}」目标优化（Mock）。`;
      const { pkg } = enforceCompliance(base);
      return { mode: "mock" as const, pkg, warning: "未检测到 AI 密钥，使用 Mock 优化。" };
    }
    try {
      const { pkg, warning } = await generateCompliantPackage(input, note);
      return { mode: "api" as const, pkg, warning };
    } catch (e: any) {
      const base = generateMockPackage(input);
      base.creativeScore.overallScore = Math.min(95, base.creativeScore.overallScore + 3);
      const { pkg } = enforceCompliance(base);
      return { mode: "mock" as const, pkg, warning: `AI 调用失败，使用 Mock 优化：${String(e?.message || e).slice(0, 120)}` };
    }
  });

export const optimizeCreativePackageBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { input: ProductInput; selections: { module: string; suggestion: string }[] }) => data)
  .handler(async ({ data }) => {
    const { input, selections } = data;
    if (!selections.length) {
      const { pkg } = enforceCompliance(generateMockPackage(input));
      return { mode: "mock" as const, pkg, warning: "未选择任何优化项。" };
    }
    const note = `请同时采纳以下多条优化建议，整体重写并保持各模块协调一致，并相应更新评分：\n${selections
      .map((s, i) => `${i + 1}. 【${s.module}】${s.suggestion}`)
      .join("\n")}`;
    if (!hasAIKey()) {
      const base = generateMockPackage(input);
      base.creativeScore.overallScore = Math.min(98, base.creativeScore.overallScore + Math.min(10, selections.length * 2));
      base.creativePackageSummary = `已批量采纳 ${selections.length} 条优化建议（Mock）。`;
      const { pkg } = enforceCompliance(base);
      return { mode: "mock" as const, pkg, warning: "未检测到 AI 密钥，使用 Mock 优化。" };
    }
    try {
      const { pkg, warning } = await generateCompliantPackage(input, note);
      return { mode: "api" as const, pkg, warning };
    } catch (e: any) {
      const base = generateMockPackage(input);
      base.creativeScore.overallScore = Math.min(98, base.creativeScore.overallScore + 5);
      const { pkg } = enforceCompliance(base);
      return { mode: "mock" as const, pkg, warning: `AI 调用失败，使用 Mock 优化：${String(e?.message || e).slice(0, 120)}` };
    }
  });

export const checkHealth = createServerFn({ method: "GET" }).handler(async () => {
  return {
    ok: true,
    hasOpenAIKey: hasAIKey(),
    mode: hasAIKey() ? "api" : "mock",
  };
});
