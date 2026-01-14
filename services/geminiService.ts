
import { GoogleGenAI } from "@google/genai";
import { PredictionRecord, AttributionCategory } from "../types";

// 统一 AI 实例化，严格遵守 process.env.API_KEY 规范
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const predictToday = async (marketType: string, history: PredictionRecord[]): Promise<Partial<PredictionRecord>> => {
  const ai = getAI();
  const dateStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // 提取历史修正规则，注入 AI 的“长期记忆”
  const learnedRules = history
    .filter(h => h.isReviewed)
    .slice(-10) 
    .map(h => `- [${h.attributionCategory}] 核心经验: ${h.learningRule}`)
    .join('\n');

  const prompt = `
    你是一名受过量化训练的资深 A 股策略研究员。
    当前日期: ${dateStr}
    分析对象: ${marketType}

    ### 任务指令
    1. **信源检索**：搜索东方财富、新浪财经的今日最新内参，重点关注：A50期指、中概股隔夜表现、人民币汇率。
    2. **深度推理**：基于当前市场情绪，分析是否存在“利好出尽”或“情绪超跌”情况。
    3. **偏误修正**：必须考虑以下历史教训：
    ${learnedRules || '初始运行，暂无历史教训。'}

    ### 输出要求 (必须严格包含以下字段进行结构化解析)
    - 宏观得分: [-5 到 +5]
    - 流动性得分: [-5 到 +5]
    - 情绪得分: [-5 到 +5]
    - 预测方向: [上涨/下跌/横盘]
    - 置信度: [0-100]
    - 研报正文: (包含推理过程和风险提示)
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      // 开启 32k token 的深度思考预算，模拟 R1 级别的推理链
      thinkingConfig: { thinkingBudget: 32768 } 
    },
  });

  const text = response.text || "";
  
  // 稳健的结构化数据提取
  const macro = text.match(/宏观得分[：:]\s*([+-]?\d+)/)?.[1] || "0";
  const liq = text.match(/流动性得分[：:]\s*([+-]?\d+)/)?.[1] || "0";
  const sent = text.match(/情绪得分[：:]\s*([+-]?\d+)/)?.[1] || "0";
  const conf = parseInt(text.match(/置信度[：:]\s*(\d+)/)?.[1] || "50");

  let pred: 'up' | 'down' | 'sideways' = 'sideways';
  if (text.includes("预测方向: 上涨")) pred = 'up';
  else if (text.includes("预测方向: 下跌")) pred = 'down';

  return {
    id: Date.now().toString(),
    date: dateStr,
    marketType,
    prediction: pred,
    confidence: conf,
    reasoning: {
      macro: `Score: ${macro}`,
      liquidity: `Score: ${liq}`,
      technical: "Reasoning Path Active",
      sentiment: `Score: ${sent}`
    },
    rawReport: text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    isReviewed: false
  };
};

export const reviewToday = async (record: PredictionRecord): Promise<Partial<PredictionRecord>> => {
  const ai = getAI();
  const prompt = `
    绩效审计：针对 ${record.date} 的 ${record.marketType} 预测进行归因分析。
    
    原始预测: ${record.prediction}
    逻辑推演: ${record.rawReport.substring(0, 300)}...

    ### 审计任务
    1. 核实今日 ${record.marketType} 真实走势。
    2. 进行因果归因（Policy/Liquidity/External/Technical/Sentiment）。
    3. 提炼一条修正未来预测逻辑的“金律”。

    ### 输出格式
    - 实际结果: [上涨/下跌/横盘]
    - 归因类别: [Category]
    - 预测结论: [正确/错误]
    - 逻辑修正规则: [具体规则]
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 16000 }
    },
  });

  const text = response.text || "";
  const category = (text.match(/归因类别[：:]\s*(\w+)/)?.[1] as AttributionCategory) || 'Other';

  return {
    ...record,
    isReviewed: true,
    actualOutcome: text.includes("实际结果: 上涨") ? 'up' : text.includes("实际结果: 下跌") ? 'down' : 'sideways',
    isCorrect: text.includes("预测结论: 正确"),
    attributionCategory: category,
    failureAnalysis: text,
    learningRule: text.match(/逻辑修正规则[：:]\s*(.*)/)?.[1] || "保持因子权重平衡"
  };
};
