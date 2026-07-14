import { getSettings, getAllKnowledgeEntries } from './db';
import type { AIPlanItem, AIGenerateResponse, AIFileAnalysisResponse, KnowledgeEntry } from './types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  tongyi: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  deepseek: 'https://api.deepseek.com/v1',
};

function getBaseUrl(provider: string, customUrl?: string): string {
  if (provider === 'custom' && customUrl) {
    return customUrl.replace(/\/+$/, '');
  }
  return PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.openai;
}

function buildSystemPrompt(knowledgeContext?: string): string {
  const knowledgeSection = knowledgeContext
    ? `\n\n用户已掌握以下知识背景：\n${knowledgeContext}\n\n请在此基础上制定计划，避免重复已掌握的基础内容，可以直接从进阶内容开始。`
    : '';

  const today = new Date().toISOString().split('T')[0];

  return `你是一个专业的学习计划设计师。你的任务是根据用户的学习目标，生成一份结构化、可执行的每日学习计划。${knowledgeSection}

今天是 ${today}。

你必须严格按照以下 JSON 格式输出（不要输出任何其他内容，只输出 JSON）：

{
  "planTitle": "计划的标题",
  "planDescription": "计划的简短描述（一句话）",
  "planItems": [
    {
      "title": "每日学习任务的标题（简洁）",
      "description": "当天任务的具体描述，包含学习内容和目标",
      "type": "study",
      "estimatedMinutes": 60,
      "suggestedDate": "${today}",
      "reviewEnabled": true
    }
  ]
}

规则：
1. planItems 必须严格按照用户指定的可用学习日排期，不可在非学习日安排任务
2. type 必须是以下之一：study（学习）、practice（练习）、review（复习）、output（产出）、other（其他）
3. 按阶段组织：入门基础 -> 核心概念 -> 进阶深入 -> 实践练习 -> 总结复习
4. estimatedMinutes 应等于用户每天可用时间（分钟）
5. reviewEnabled 通常设为 true，表示该内容需要后续复习
6. 每天的任务要有明确、可执行的内容，不要笼统的描述
7. 加入适当的休息日和弹性调整空间
8. 不要生成具体的学习时间（如几点到几点），只需给出每天的学习时长即可`;
}

function buildSystemPromptAuto(knowledgeContext?: string): string {
  const knowledgeSection = knowledgeContext
    ? `\n\n用户已掌握以下知识背景：\n${knowledgeContext}\n\n请在此基础上制定计划，避免重复已掌握的基础内容，可以直接从进阶内容开始。`
    : '';

  const today = new Date().toISOString().split('T')[0];

  return `你是一个专业的学习计划设计师。你的任务是根据用户的学习目标，自主判断合理的学习周期和每日投入时间，生成一份结构化、可执行的每日学习计划。${knowledgeSection}

今天是 ${today}。

你必须严格按照以下 JSON 格式输出（不要输出任何其他内容，只输出 JSON）：

{
  "planTitle": "计划的标题",
  "planDescription": "计划的简短描述（一句话）",
  "planItems": [
    {
      "title": "每日学习任务的标题（简洁）",
      "description": "当天任务的具体描述，包含学习内容和目标",
      "type": "study",
      "estimatedMinutes": 60,
      "suggestedDate": "${today}",
      "reviewEnabled": true
    }
  ]
}

规则：
1. 你需要根据学习目标的难度，自主判断合理的总天数（通常在7-60天之间）和每天的学习时长（通常在30-180分钟之间）
2. planItems 必须严格按照用户指定的可用学习日排期，不可在非学习日安排任务
3. type 必须是以下之一：study（学习）、practice（练习）、review（复习）、output（产出）、other（其他）
4. 按阶段组织：入门基础 -> 核心概念 -> 进阶深入 -> 实践练习 -> 总结复习
5. 每个阶段的长度要合理，难的内容分配更多天数
6. reviewEnabled 通常设为 true，表示该内容需要后续复习
7. 每天的任务要有明确、可执行的内容，不要笼统的描述
8. 加入适当的休息日和弹性调整空间
9. 不要生成具体的学习时间（如几点到几点），只需给出每天的学习时长即可
10. suggestedDate 从明天（${shiftDateStr(today, 1)}）开始排，格式为 YYYY-MM-DD`;
}

function shiftDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function buildUserPrompt(
  goal: string,
  availableHoursPerDay: number | null,
  startDate: string | null,
  endDate: string | null,
  preferences: string,
  availableDays: string[],
): string {
  const parts: string[] = [`学习目标：${goal}`];

  if (availableHoursPerDay !== null) {
    parts.push(`每天可用学习时间：${availableHoursPerDay} 小时（${availableHoursPerDay * 60} 分钟）`);
  } else {
    parts.push('每天可用学习时间：由你根据目标难度自主判断');
  }

  if (startDate !== null) {
    parts.push(`计划开始日期：${startDate}`);
  }

  if (endDate !== null && startDate !== null) {
    const days = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    parts.push(`计划结束日期：${endDate}`);
    parts.push(`总共 ${days + 1} 天`);
  } else {
    parts.push('学习周期：由你根据目标难度自主判断合理的天数');
  }

  // 学习日说明
  if (availableDays.length > 0) {
    const dayLabels: Record<string, string> = {
      monday: '周一', tuesday: '周二', wednesday: '周三', thursday: '周四',
      friday: '周五', saturday: '周六', sunday: '周日',
    };
    const dayNames = availableDays.map(d => dayLabels[d] || d).join('、');
    parts.push(`每周学习日：仅 ${dayNames}（请严格只在这些日期安排学习任务，不要在非学习日排任何任务）`);
  }

  if (preferences) {
    parts.push(`额外偏好：${preferences}`);
  }

  return parts.join('\n') + '\n\n请为这段时间生成详细的每日学习计划。确保每一天都有具体的学习任务，并按阶段渐进式推进。';
}

/**
 * 修复常见的 AI 生成 JSON 格式问题
 */
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr;

  // 1. 移除 trailing commas（在 ] 或 } 前多余的逗号）
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  // 2. 尝试修复被截断的 JSON
  let openBraces = 0, closeBraces = 0, openBrackets = 0, closeBrackets = 0;
  for (const ch of repaired) {
    if (ch === '{') openBraces++;
    if (ch === '}') closeBraces++;
    if (ch === '[') openBrackets++;
    if (ch === ']') closeBrackets++;
  }

  if (openBraces > closeBraces || openBrackets > closeBrackets) {
    // 找到最后一个完整的对象边界，截断不完整部分
    const lastComplete = Math.max(
      repaired.lastIndexOf('},\n'),
      repaired.lastIndexOf('}\n'),
      repaired.lastIndexOf('},'),
    );
    if (lastComplete > 0) {
      repaired = repaired.slice(0, lastComplete + 1);
      // 重新计数
      openBraces = 0; closeBraces = 0; openBrackets = 0; closeBrackets = 0;
      for (const ch of repaired) {
        if (ch === '{') openBraces++;
        if (ch === '}') closeBraces++;
        if (ch === '[') openBrackets++;
        if (ch === ']') closeBrackets++;
      }
    }

    repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
    repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
  }

  return repaired;
}

/**
 * 从 AI 返回的原始文本中提取 planItems（正则兜底方案）
 */
function extractPlanItemsFromRawText(content: string): AIPlanItem[] {
  const items: AIPlanItem[] = [];

  // 匹配每个 planItem 对象（容错模式）
  const itemRegex = /\{\s*"title"\s*:\s*"([^"]*)"[^}]*"description"\s*:\s*"([^"]*)"[^}]*"type"\s*:\s*"([^"]*)"[^}]*"estimatedMinutes"\s*:\s*(\d+)[^}]*"suggestedDate"\s*:\s*"([^"]*)"[^}]*"reviewEnabled"\s*:\s*(true|false)[^}]*\}/g;

  let match;
  while ((match = itemRegex.exec(content)) !== null) {
    const validTypes = ['study', 'practice', 'review', 'output', 'other'];
    items.push({
      title: match[1],
      description: match[2],
      type: validTypes.includes(match[3]) ? match[3] as AIPlanItem['type'] : 'study',
      estimatedMinutes: Math.max(10, Math.min(480, Number(match[4]) || 60)),
      suggestedDate: match[5],
      reviewEnabled: match[6] === 'true',
    });
  }

  return items;
}

function parseAIResponse(content: string): AIGenerateResponse {
  let jsonStr = content.trim();

  // 去掉 markdown 代码块标记
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // 尝试多次解析，逐步修复
  const attempts = [
    () => JSON.parse(jsonStr),                                    // 原始 JSON
    () => JSON.parse(repairJSON(jsonStr)),                        // 修复 trailing comma + 括号补全
    () => {
      // 尝试提取 planTitle/planDescription，然后用正则提取 items
      const titleMatch = jsonStr.match(/"planTitle"\s*:\s*"([^"]*)"/);
      const descMatch = jsonStr.match(/"planDescription"\s*:\s*"([^"]*)"/);
      const items = extractPlanItemsFromRawText(jsonStr);
      if (items.length > 0) {
        return {
          planTitle: titleMatch?.[1] || '学习计划',
          planDescription: descMatch?.[1] || '',
          planItems: items,
        };
      }
      throw new Error('无法提取计划内容');
    },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const parsed = attempt();

      // 验证
      if (!parsed.planItems || !Array.isArray(parsed.planItems) || parsed.planItems.length === 0) {
        throw new Error('AI 返回的数据格式不正确：缺少 planItems');
      }

      const validTypes = ['study', 'practice', 'review', 'output', 'other'];

      const items: AIPlanItem[] = parsed.planItems.map((item: Record<string, unknown>) => ({
        title: String(item.title || '未命名任务'),
        description: String(item.description || ''),
        type: validTypes.includes(String(item.type)) ? String(item.type) as AIPlanItem['type'] : 'study',
        estimatedMinutes: Math.max(10, Math.min(480, Number(item.estimatedMinutes) || 60)),
        suggestedDate: String(item.suggestedDate || ''),
        reviewEnabled: item.reviewEnabled !== false,
      }));

      return {
        planTitle: String(parsed.planTitle || '学习计划'),
        planDescription: String(parsed.planDescription || ''),
        planItems: items,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // 所有尝试都失败了
  throw new Error(
    `AI 返回的 JSON 格式无法解析：${lastError?.message || '未知错误'}\n\n` +
    `原始返回内容前 500 字符：\n${content.slice(0, 500)}`
  );
}

export async function buildKnowledgeContext(): Promise<string> {
  const entries = await getAllKnowledgeEntries();
  if (entries.length === 0) return '';

  // 按分类分组并截断
  const byCategory: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!byCategory[entry.category]) byCategory[entry.category] = [];
    byCategory[entry.category].push(`- ${entry.title}（熟练度: ${entry.proficiency}/5）: ${entry.content.slice(0, 150)}`);
  }

  const parts: string[] = [];
  let totalChars = 0;
  const MAX_CHARS = 3000;

  for (const [cat, items] of Object.entries(byCategory)) {
    const section = `[${cat}]\n${items.join('\n')}`;
    if (totalChars + section.length > MAX_CHARS) break;
    parts.push(section);
    totalChars += section.length;
  }

  return parts.join('\n\n');
}

/**
 * 调用 AI API 生成学习计划
 */
export async function generatePlan(params: {
  goal: string;
  availableHoursPerDay?: number;
  startDate?: string;
  endDate?: string;
  preferences?: string;
  availableDays?: string[];
}): Promise<AIGenerateResponse> {
  const {
    goal,
    availableHoursPerDay = null,
    startDate = null,
    endDate = null,
    preferences = '',
    availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  } = params;

  const settings = await getSettings();
  const knowledgeContext = await buildKnowledgeContext();

  if (!settings.aiApiKey) {
    throw new Error(
      '请先在设置中配置 AI API Key。支持 OpenAI、通义千问、DeepSeek 等模型。'
    );
  }

  const baseUrl = getBaseUrl(settings.aiProvider, settings.aiBaseUrl);
  const apiUrl = `${baseUrl}/chat/completions`;

  // 如果用户指定了时间参数，用精确 prompt；否则用自主规划 prompt
  const isAutoMode = availableHoursPerDay === null || startDate === null || endDate === null;
  const systemPrompt = isAutoMode
    ? buildSystemPromptAuto(knowledgeContext)
    : buildSystemPrompt(knowledgeContext);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildUserPrompt(goal, availableHoursPerDay as number | null, startDate as string | null, endDate as string | null, preferences, availableDays) },
  ];

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.aiModel || 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let errorMsg = `API 请求失败 (${response.status})`;

    if (response.status === 401) {
      errorMsg = 'API Key 无效或已过期，请在设置中检查';
    } else if (response.status === 429) {
      errorMsg = 'API 请求频率过高或额度不足，请稍后重试';
    } else if (response.status === 404) {
      errorMsg = `模型 "${settings.aiModel}" 不存在，请检查模型名称`;
    } else if (errorBody) {
      try {
        const err = JSON.parse(errorBody);
        errorMsg = err.error?.message || errorMsg;
      } catch {
        errorMsg = `${errorMsg}: ${errorBody.slice(0, 200)}`;
      }
    }

    throw new Error(errorMsg);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 未返回有效内容，请重试');
  }

  return parseAIResponse(content);
}

/**
 * 通用 AI API 调用
 */
async function callAI(messages: ChatMessage[]): Promise<string> {
  const settings = await getSettings();

  if (!settings.aiApiKey) {
    throw new Error('请先在设置中配置 AI API Key');
  }

  const baseUrl = getBaseUrl(settings.aiProvider, settings.aiBaseUrl);
  const apiUrl = `${baseUrl}/chat/completions`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.aiApiKey}`,
    },
    body: JSON.stringify({
      model: settings.aiModel || 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let errorMsg = `API 请求失败 (${response.status})`;

    if (response.status === 401) {
      errorMsg = 'API Key 无效或已过期，请在设置中检查';
    } else if (response.status === 429) {
      errorMsg = 'API 请求频率过高或额度不足，请稍后重试';
    } else if (response.status === 404) {
      errorMsg = `模型 "${settings.aiModel}" 不存在，请检查模型名称`;
    } else if (errorBody) {
      try {
        const err = JSON.parse(errorBody);
        errorMsg = err.error?.message || errorMsg;
      } catch {
        errorMsg = `${errorMsg}: ${errorBody.slice(0, 200)}`;
      }
    }

    throw new Error(errorMsg);
  }

  const data: ChatCompletionResponse = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 未返回有效内容，请重试');
  }

  return content;
}

/**
 * 基于现有计划进行迭代修改
 */
export async function refinePlan(params: {
  goal: string;
  planTitle: string;
  currentItems: AIPlanItem[];
  refineInstruction: string;
}): Promise<AIGenerateResponse> {
  const { goal, planTitle, currentItems, refineInstruction } = params;

  const currentPlanJson = JSON.stringify(currentItems, null, 2);

  const systemPrompt = `你是一个专业的学习计划设计师。用户已经有一个初步的学习计划，现在需要根据用户的反馈进行修改。

当前计划标题：${planTitle}
学习目标：${goal}

当前计划内容：
${currentPlanJson}

用户的修改要求如下。请只修改用户提到的部分，其余保持不变。按原 JSON 格式输出完整的修改后计划。

{
  "planTitle": "${planTitle}",
  "planDescription": "计划的简短描述",
  "planItems": [...]
}`;

  const content = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `修改要求：${refineInstruction}\n\n请输出修改后的完整计划 JSON。` },
  ]);

  return parseAIResponse(content);
}

/**
 * AI 分析上传的文件内容，提炼为知识条目
 */
export async function analyzeFileContent(
  fileContent: string,
  fileName: string
): Promise<AIFileAnalysisResponse> {
  const systemPrompt = `你是一个知识管理助手。用户上传了一个学习相关文件，请你分析其中的内容，提炼出知识要点。

你必须输出以下 JSON 格式（只输出 JSON）：
{
  "title": "知识条目的标题（简明扼要）",
  "content": "从文件中提炼出的知识摘要（200字以内）",
  "category": "知识分类（如：编程语言、数学、英语、设计、其他）",
  "proficiency": 3
}

规则：
1. proficiency 为用户对该内容的熟练度估计，1=刚入门，5=精通（根据文件内容深度估算）
2. category 根据内容自动判断最合适的分类
3. content 要简洁但信息量大，突出核心知识点`;

  const content = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `文件名：${fileName}\n文件内容：\n${fileContent.slice(0, 8000)}` },
  ]);

  // 解析 AI 返回
  let jsonStr = content.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  return {
    title: String(parsed.title || `来自 ${fileName} 的知识`),
    content: String(parsed.content || ''),
    category: String(parsed.category || '其他'),
    proficiency: Math.max(1, Math.min(5, Number(parsed.proficiency) || 3)),
  };
}
