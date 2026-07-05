import type { CreativePackage, ProductInput, AgentStep } from "@/types/creative";

const SUBAGENTS: { agent: string; skill: string; tool: string; thought: string; action: string; observation: string }[] = [
  { agent: "Product Analyst Agent", skill: "Product Understanding", tool: "analyze_product", thought: "解析商品名称、类目与卖点", action: "调用 analyze_product", observation: "识别核心商品属性与类目定位" },
  { agent: "Product Analyst Agent", skill: "Audience Insight", tool: "generate_audience_insight", thought: "基于人群画像推断购买动机", action: "调用 generate_audience_insight", observation: "输出痛点、动机与场景标签" },
  { agent: "Asset Analyst Agent", skill: "Product Image Understanding", tool: "analyze_product_image", thought: "对上传图片做多模态视觉分析", action: "Vision Model 解析", observation: "提取视觉元素、卖点与可用方向" },
  { agent: "Strategy Planner Agent", skill: "Creative Strategy", tool: "generate_creative_plan", thought: "根据投放目标和视频风格制定方向", action: "调用 generate_creative_plan", observation: "产出推荐创意方向与表达方式" },
  { agent: "Hook Agent", skill: "Hook Optimization", tool: "generate_hooks", thought: "召回爆款模式并生成多版本 Hook", action: "调用 generate_hooks", observation: "产出 5 条 Hook 候选 + CTR 评分" },
  { agent: "Script Agent", skill: "Short Video Script", tool: "generate_script", thought: "按视频风格生成分段脚本", action: "调用 generate_script", observation: "0-3s/3-8s/8-12s/12-15s 分段" },
  { agent: "Visual Agent", skill: "Image Prompt", tool: "build_image_prompt", thought: "构造封面图 Prompt", action: "调用 build_image_prompt", observation: "输出封面主体与图片 Prompt" },
  { agent: "Video Agent", skill: "Video Prompt", tool: "build_video_prompt", thought: "构造分镜与视频 Prompt", action: "调用 build_video_prompt", observation: "输出分镜与视频生成 Prompt" },
  { agent: "Scoring Agent", skill: "Creative Scoring", tool: "score_creative", thought: "按投放目标权重打分", action: "调用 score_creative", observation: "输出 8 维评分与优劣势" },
  { agent: "Reflection Agent", skill: "Reflection Optimization", tool: "generate_optimization_plan", thought: "定位低分模块并生成优化建议", action: "调用 generate_optimization_plan", observation: "输出优化清单" },
];

export function buildAgentSteps(): AgentStep[] {
  return SUBAGENTS.map((s, i) => ({
    id: `step-${i + 1}`,
    ...s,
    status: "success",
  }));
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateMockPackage(input: ProductInput): CreativePackage {
  const seed = hash(input.productName + input.campaignGoal + input.videoStyle);
  const goalAccent: Record<string, string> = {
    "提升点击率 CTR": "强 Hook、前 3 秒制造好奇/反差",
    "提升商品点击": "突出爆款标签 + 直给价格信号",
    "提升转化率 CVR": "信任建立 + 适合谁 + 明确 CTA",
    "提升 ROI": "精准人群 + 高购买意图触发",
    "提升 GMV": "组合装/福利/价格锚点/囤货心智",
  };
  const styleVibe: Record<string, string> = {
    "种草口播": "真实达人体验、口语化、亲切",
    "测评对比": "对比结构、避坑表达、结论先行",
    "剧情短片": "生活场景、角色冲突、小反转",
    "直播切片风": "直播间语气、福利感、强 CTA",
    "清爽广告片": "画面质感、简洁文案、品牌感",
    "大促促销风": "倒计时、限量、价格爆破",
  };

  const painSeed = [
    "怕踩雷 / 怕不适合自己",
    "用过同类但效果一般",
    "预算有限想要性价比",
    "需要场景化解决方案",
  ];
  const hooksPool = [
    { text: `别再乱买${input.productName}了，这 3 个坑我替你踩过`, type: "避坑反差型", ctrScore: 88 },
    { text: `${input.targetAudience || "懂行的人"}都在悄悄囤的${input.productName}`, type: "圈层认同型", ctrScore: 82 },
    { text: `用一周${input.productName}，我老板都问我换了什么`, type: "效果可视化", ctrScore: 85 },
    { text: `100 块以内最值得入的${input.productName}，没有之一`, type: "价格锚定型", ctrScore: 79 },
    { text: `如果你也有这些问题，这条视频请看完`, type: "痛点钩子", ctrScore: 76 },
  ];
  const hooks = hooksPool.map((h, i) => ({
    ...h,
    ctrScore: Math.max(60, Math.min(95, h.ctrScore + ((seed + i) % 7) - 3)),
    reason: `匹配「${input.campaignGoal}」目标，${goalAccent[input.campaignGoal] || ""}`,
    complianceRisk: i === 3 ? "避免使用「最」等绝对化用语，建议改写" : undefined,
  }));
  hooks.sort((a, b) => b.ctrScore - a.ctrScore);

  const selectedHook = hooks[0];

  const segments = [
    { time: "0-3s", voiceover: selectedHook.text, visual: "特写商品 + 反差画面", purpose: "Hook 抓注意力" },
    { time: "3-8s", voiceover: `${input.sellingPoints || "核心卖点"}，我用下来最大的感受是…`, visual: "使用场景演示", purpose: "建立信任与共鸣" },
    { time: "8-12s", voiceover: `适合${input.targetAudience || "你"}，尤其是${pick(painSeed, seed)}的姐妹/兄弟`, visual: "before / after 对比", purpose: "强化购买理由" },
    { time: "12-15s", voiceover: `点左下角小黄车，今天下单还有福利，先到先得`, visual: "购物车特写 + 优惠贴片", purpose: "CTA 转化" },
  ];

  return {
    mode: "mock",
    agentSteps: buildAgentSteps(),
    productAnalysis: {
      category: input.category || "未指定类目",
      coreSellingPoints: (input.sellingPoints || "卖点A,卖点B,卖点C").split(/[，,、]/).slice(0, 4),
      painPoints: painSeed.slice(0, 3),
      purchaseMotivation: ["解决具体问题", "圈层认同", "性价比与福利"],
      scenes: ["日常通勤", "居家使用", "出行/外出补给"],
      audienceInsight: `${input.targetAudience || "目标人群"}决策偏感性，受达人 + 真实测评影响大；关注「适不适合我」「会不会踩坑」。`,
    },
    assetAnalysis: input.images.map((img) => ({
      filename: img.filename,
      type: img.type,
      visualElements: ["主体清晰", "颜色饱和度高", "包装信息显眼"],
      extractedSellingPoints: ["核心卖点视觉化"],
      usableFor: img.type === "竞品素材图" ? ["差异化 Hook 参考"] : ["封面主体", "首帧画面"],
      diagnosis: img.type.startsWith("旧") ? "Hook 信息不突出，前 3 秒缺乏反差" : undefined,
      competitorInsights: img.type === "竞品素材图" ? "竞品偏价格信号，可走情绪/痛点差异化" : undefined,
    })),
    creativePlan: {
      direction: `${styleVibe[input.videoStyle] || "种草向"}的「痛点 → 体验 → 信任 → CTA」结构`,
      coreMessage: `${input.productName}：${(input.sellingPoints || "解决你的真实问题").split(/[，,]/)[0]}`,
      expression: styleVibe[input.videoStyle] || "口语化达人种草",
      whyFitGoal: goalAccent[input.campaignGoal] || "围绕投放目标设计权重",
      whyFitStyle: `与「${input.videoStyle}」气质一致：${styleVibe[input.videoStyle] || ""}`,
    },
    hooks,
    selectedHook,
    script: { totalDuration: "15s", segments, cta: "点击左下角小黄车，今天下单立减" },
    coverPlan: {
      title: selectedHook.text,
      mainSubject: `${input.productName} 特写 + 使用场景人物`,
      composition: "左侧大字标题 + 右侧商品主体，三七构图",
      visualStyle: "高饱和、自然光、生活感强",
    },
    coverPrompt: `Short-video e-commerce cover image, ${input.productName}, ${input.category}, lifestyle shot, vivid color, bold headline overlay "${selectedHook.text}", high contrast, 9:16 portrait, photoreal`,
    videoStoryboard: [
      { time: "0-3s", visual: "特写商品 + 反差表情", action: "主角抛出 Hook", purpose: "抓注意力" },
      { time: "3-8s", visual: "使用过程演示", action: "讲解核心卖点", purpose: "建立信任" },
      { time: "8-12s", visual: "before / after 对比", action: "强化效果", purpose: "推动决策" },
      { time: "12-15s", visual: "购物车 + 价格贴片", action: "口播 CTA", purpose: "转化" },
    ],
    videoPrompt: `Vertical 9:16 short-form e-commerce video, ${input.videoStyle}, product: ${input.productName} (${input.category}). Hook: "${selectedHook.text}". 15s total, fast cuts every 2-3s, natural lighting, real-life scene, energetic VO, on-screen captions, end with shopping cart CTA.`,
    videoUrl: null,
    creativeScore: {
      overallScore: 82,
      hookCtrScore: selectedHook.ctrScore,
      retentionScore: 78,
      sellingPointClarityScore: 80,
      audienceFitScore: 84,
      conversionIntentScore: input.campaignGoal.includes("CVR") || input.campaignGoal.includes("GMV") ? 86 : 78,
      platformFitScore: 88,
      complianceRiskScore: 90,
      strengths: ["Hook 抓力强", "结构清晰", "平台适配度高"],
      weaknesses: ["卖点叙事可更具象", "CTA 可更紧迫"],
      suggestions: ["在 3-8s 加入数字化证据", "CTA 增加倒计时/限量"],
    },
    complianceCheck: {
      hasRisk: true,
      issues: [
        { original: "最值得入", rewritten: "非常值得入手", riskType: "绝对化用语", riskLevel: "中" },
      ],
    },
    optimizationSuggestions: [
      { module: "script.retention", reason: "完播潜力中等", suggestion: "在 8s 增加反转/对比镜头", regenerate: true },
      { module: "hook.compliance", reason: "存在绝对化用语风险", suggestion: "改写第 4 条 Hook", regenerate: false },
    ],
    creativePackageSummary: `已为「${input.productName}」生成完整 Creative Package：核心方向「${styleVibe[input.videoStyle] || ""}」，主推 Hook「${selectedHook.text}」，综合评分 82。`,
  };
}
