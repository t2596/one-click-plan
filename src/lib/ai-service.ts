import { getSettings } from './db';
import type { AIPlanItem, AIGenerateResponse } from './types';

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

function buildSystemPrompt(): string {
  return `你是一个专业的学习计划设计师。你的任务是根据用户的学习目标，生成一份结构化、可执行的每日学习计划。

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
      "suggestedDate": "2026-01-01",
      "suggestedStartTime": "09:00",
      "reviewEnabled": true
    }
  ]
}

规则：
1. planItems 数组必须覆盖用户指定的整个日期范围，每天一条
2. type 必须是以下之一：study（学习）、practice（练习）、review（复习）、output（产出）、other（其他）
3. 按阶段组织：入门基础 -> 核心概念 -> 进阶深入 -> 实践练习 -> 总结复习
4. estimatedMinutes 应等于用户每天可用时间（分钟）
5. suggestedStartTime 根据用户偏好设定（默认 09:00）
6. reviewEnabled 通常设为 true，表示该内容需要后续复习
7. 每天的任务要有明确、可执行的内容，不要笼统的描述
8. 加入适当的休息日和弹性调整空间`;
}

function buildUserPrompt(
  goal: string,
  availableHoursPerDay: number,
  startDate: string,
  endDate: string,
  preferences: string
): string {
  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  return `学习目标：${goal}
每天可用学习时间：${availableHoursPerDay} 小时（${availableHoursPerDay * 60} 分钟）
计划开始日期：${startDate}
计划结束日期：${endDate}
总共 ${days + 1} 天
${preferences ? `额外偏好：${preferences}` : ''}

请为这段时间生成详细的每日学习计划。确保每一天都有具体的学习任务，并按阶段渐进式推进。`;
}

function parseAIResponse(content: string): AIGenerateResponse {
  // 尝试提取 JSON（有时 AI 会在 JSON 外面包裹 markdown 代码块）
  let jsonStr = content.trim();

  // 去掉 markdown 代码块标记
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  // 验证并规范化
  if (!parsed.planItems || !Array.isArray(parsed.planItems)) {
    throw new Error('AI 返回的数据格式不正确：缺少 planItems');
  }

  const validTypes = ['study', 'practice', 'review', 'output', 'other'];

  const items: AIPlanItem[] = parsed.planItems.map((item: Record<string, unknown>) => ({
    title: String(item.title || '未命名任务'),
    description: String(item.description || ''),
    type: validTypes.includes(String(item.type)) ? String(item.type) as AIPlanItem['type'] : 'study',
    estimatedMinutes: Math.max(10, Math.min(480, Number(item.estimatedMinutes) || 60)),
    suggestedDate: String(item.suggestedDate || ''),
    suggestedStartTime: String(item.suggestedStartTime || '09:00'),
    reviewEnabled: item.reviewEnabled !== false,
  }));

  return {
    planTitle: String(parsed.planTitle || '学习计划'),
    planDescription: String(parsed.planDescription || ''),
    planItems: items,
  };
}

/**
 * 调用 AI API 生成学习计划
 */
export async function generatePlan(params: {
  goal: string;
  availableHoursPerDay: number;
  startDate: string;
  endDate: string;
  preferences: string;
}): Promise<AIGenerateResponse> {
  const { goal, availableHoursPerDay, startDate, endDate, preferences } = params;

  const settings = await getSettings();

  if (!settings.aiApiKey) {
    throw new Error(
      '请先在设置中配置 AI API Key。支持 OpenAI、通义千问、DeepSeek 等模型。'
    );
  }

  const baseUrl = getBaseUrl(settings.aiProvider, settings.aiBaseUrl);
  const apiUrl = `${baseUrl}/chat/completions`;

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(goal, availableHoursPerDay, startDate, endDate, preferences) },
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
