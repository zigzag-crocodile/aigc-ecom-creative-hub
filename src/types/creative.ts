export type ImageType =
  | "商品图"
  | "包装图"
  | "详情页截图"
  | "旧广告封面"
  | "旧短视频截图"
  | "竞品素材图"
  | "直播间截图";

export type UploadedAsset = {
  id: string;
  type: ImageType;
  filename: string;
  mimeType: string;
  base64: string; // data URL
  previewUrl?: string;
};

export type ProductInput = {
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience: string;
  campaignGoal: string;
  videoStyle: string;
  generationGoals: string[];
  images: UploadedAsset[];
};

export type AgentStep = {
  id: string;
  agent: string;
  skill: string;
  tool: string;
  thought: string;
  action: string;
  observation: string;
  status: "running" | "success" | "failed";
};

export type HookItem = {
  text: string;
  type: string;
  ctrScore: number;
  reason: string;
  complianceRisk?: string;
};

export type ScriptSegment = {
  time: string;
  voiceover: string;
  visual: string;
  purpose: string;
};

export type StoryboardShot = {
  time: string;
  visual: string;
  action: string;
  purpose: string;
};

export type CreativeScore = {
  overallScore: number;
  hookCtrScore: number;
  retentionScore: number;
  sellingPointClarityScore: number;
  audienceFitScore: number;
  conversionIntentScore: number;
  platformFitScore: number;
  complianceRiskScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
};

export type ComplianceIssue = {
  original: string;
  rewritten: string;
  riskType: string;
  riskLevel: "低" | "中" | "高";
};

export type OptimizationSuggestion = {
  module: string;
  reason: string;
  suggestion: string;
  regenerate: boolean;
};

export type AssetAnalysisItem = {
  filename: string;
  type: ImageType;
  visualElements: string[];
  extractedSellingPoints: string[];
  usableFor: string[];
  diagnosis?: string;
  competitorInsights?: string;
};

export type CreativePackage = {
  mode: "api" | "mock";
  agentSteps: AgentStep[];
  productAnalysis: {
    category: string;
    coreSellingPoints: string[];
    painPoints: string[];
    purchaseMotivation: string[];
    scenes: string[];
    audienceInsight: string;
  };
  assetAnalysis: AssetAnalysisItem[];
  creativePlan: {
    direction: string;
    coreMessage: string;
    expression: string;
    whyFitGoal: string;
    whyFitStyle: string;
  };
  hooks: HookItem[];
  selectedHook: HookItem;
  script: {
    totalDuration: string;
    segments: ScriptSegment[];
    cta: string;
  };
  coverPlan: {
    title: string;
    mainSubject: string;
    composition: string;
    visualStyle: string;
  };
  coverPrompt: string;
  videoStoryboard: StoryboardShot[];
  videoPrompt: string;
  videoUrl?: string | null;
  creativeScore: CreativeScore;
  complianceCheck: {
    hasRisk: boolean;
    issues: ComplianceIssue[];
  };
  optimizationSuggestions: OptimizationSuggestion[];
  creativePackageSummary: string;
};
