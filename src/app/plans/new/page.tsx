'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { v4 as uuidv4 } from 'uuid';
import { formatDate, formatTime } from '@/lib/db';
import { generatePlan, refinePlan, buildKnowledgeContext } from '@/lib/ai-service';
import type { Plan, PlanItem, ScheduleEntry, ReviewCard, AIPlanItem } from '@/lib/types';
import {
  Sparkles,
  ArrowLeft,
  Send,
  Loader2,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Brain,
  Clock,
  AlertCircle,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

const WEEKDAYS = [
  { key: 'monday', label: '一' },
  { key: 'tuesday', label: '二' },
  { key: 'wednesday', label: '三' },
  { key: 'thursday', label: '四' },
  { key: 'friday', label: '五' },
  { key: 'saturday', label: '六' },
  { key: 'sunday', label: '日' },
];

function getCategoryFromGoal(goal: string): string {
  const g = goal.toLowerCase();
  if (/python|java|javascript|typescript|rust|go|编程|代码|前端|后端|算法|数据结构|react|vue|node|web/.test(g)) return '编程语言';
  if (/数学|概率|统计|线性代数|微积分|几何/.test(g)) return '数学';
  if (/英语|雅思|托福|gre|日语|韩语|法语|德语|外语/.test(g)) return '英语';
  if (/设计|ui|ux|figma|photoshop|配色|排版/.test(g)) return '设计';
  if (/机器学习|深度学习|ai|人工智能|数据|神经网络|nlp/.test(g)) return '数据科学';
  if (/计算机|网络|操作系统|数据库|linux|云计算/.test(g)) return '计算机科学';
  return '其他';
}

export default function NewPlanPage() {
  const router = useRouter();
  const { addPlan, bulkAddPlanItems, bulkAddScheduleEntries, addReviewCard, addKnowledgeEntry, loadKnowledgeEntries } = usePlanStore();

  // Form state
  const [goal, setGoal] = useState('');
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(2);
  const [startDate, setStartDate] = useState(formatDate(new Date()));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDate(d);
  });
  const [preferences, setPreferences] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedPlan, setGeneratedPlan] = useState<{
    title: string;
    description: string;
    items: AIPlanItem[];
  } | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [planDesc, setPlanDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refining, setRefining] = useState(false);
  const [autoPlanMode, setAutoPlanMode] = useState(false);
  const [availableDays, setAvailableDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError('请输入学习目标');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      // 尝试调用 AI API 生成计划
      const result = await generatePlan({
        goal: goal.trim(),
        availableHoursPerDay: autoPlanMode ? undefined : availableHoursPerDay,
        startDate: autoPlanMode ? undefined : startDate,
        endDate: autoPlanMode ? undefined : endDate,
        preferences: preferences.trim(),
        availableDays,
      });

      const mapped = {
        title: result.planTitle,
        description: result.planDescription,
        items: result.planItems,
      };

      setGeneratedPlan(mapped);
      setPlanTitle(mapped.title);
      setPlanDesc(mapped.description);
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';

      // 如果是 API Key 未配置或其他 API 错误，使用本地模拟生成作为降级方案
      if (message.includes('API Key') || message.includes('API 请求')) {
        setError(`${message}，将使用本地模拟生成计划。`);

        // 降级：本地模拟生成
        const fallbackPlan = generateFallbackPlan(
          goal.trim(),
          availableHoursPerDay,
          startDate,
          endDate,
          availableDays,
        );

        // 延迟一下让用户看到提示
        await new Promise(resolve => setTimeout(resolve, 1500));

        setGeneratedPlan(fallbackPlan);
        setPlanTitle(fallbackPlan.title);
        setPlanDesc(fallbackPlan.description);
        setError('');
      } else {
        setError(message);
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * 本地模拟生成计划（AI API 不可用时的降级方案）
   */
  function generateFallbackPlan(
    planGoal: string,
    hoursPerDay: number,
    start: string,
    end: string,
    studyDays: string[],
  ) {
    const topics = planGoal.split(/[,，、\s]+/).filter(Boolean);
    if (topics.length === 0) topics.push(planGoal);

    const items: AIPlanItem[] = [];
    let startD = new Date(start);
    let endD = new Date(end);

    // Auto mode: use reasonable defaults
    if (autoPlanMode || !start || !end) {
      startD = new Date(); startD.setDate(startD.getDate() + 1); // start tomorrow
      endD = new Date(startD); endD.setDate(endD.getDate() + 20); // 3 weeks default
    }

    // Day-of-week map: getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
    const weekdayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    let currentDate = new Date(startD);
    let dayIndex = 0;
    const phases = ['入门基础', '核心概念', '进阶深入', '实践练习', '总结复习'];

    while (currentDate <= endD) {
      // Skip non-study days
      const dow = currentDate.getDay();
      const isStudyDay = studyDays.some(d => weekdayMap[d] === dow);
      if (!isStudyDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const phaseIndex = Math.min(Math.floor(dayIndex / 4), phases.length - 1);
      const phase = phases[phaseIndex];
      const topic = topics[dayIndex % topics.length];
      items.push({
        title: `[${phase}] ${topic} - 第${dayIndex + 1}天`,
        description: `学习 ${topic} 的${phase}部分，预计需要 ${hoursPerDay * 60} 分钟`,
        type: phaseIndex === 3 ? 'practice' : phaseIndex === 4 ? 'review' : 'study',
        estimatedMinutes: autoPlanMode ? 60 : hoursPerDay * 60,
        suggestedDate: formatDate(currentDate),
        reviewEnabled: true,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      dayIndex++;
    }

    return {
      title: `${planGoal} - 学习计划`,
      description: autoPlanMode
        ? `AI 自主规划的 ${items.length} 天系统学习计划`
        : `为期 ${items.length} 天的系统学习计划，每天 ${hoursPerDay} 小时`,
      items,
    };
  }

  const handleSavePlan = async () => {
    if (!generatedPlan) return;

    const planId = uuidv4();
    const now = new Date();

    // Create Plan
    const plan: Plan = {
      id: planId,
      title: planTitle || generatedPlan.title,
      description: planDesc || generatedPlan.description,
      goal: goal,
      color: selectedColor,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    await addPlan(plan);

    // Create PlanItems
    const planItems: PlanItem[] = generatedPlan.items.map((item, idx) => ({
      id: uuidv4(),
      planId,
      title: item.title,
      description: item.description,
      type: item.type,
      estimatedMinutes: item.estimatedMinutes,
      order: idx,
      dependencies: [],
      reviewConfig: {
        enabled: item.reviewEnabled,
        strategy: 'sm2',
        intervals: [1, 3, 7, 15, 30],
      },
      createdAt: now,
      updatedAt: now,
    }));
    await bulkAddPlanItems(planItems);

    // Create ScheduleEntries
    const scheduleEntries: ScheduleEntry[] = generatedPlan.items.map((item, idx) => {
      const planItemId = planItems[idx].id;

      return {
        id: uuidv4(),
        planItemId,
        planId,
        date: item.suggestedDate,
        startTime: '',
        endTime: '',
        status: 'pending' as const,
        isCompleted: false,
        completedAt: null,
        notes: item.title,
        createdAt: now,
        updatedAt: now,
      };
    });
    await bulkAddScheduleEntries(scheduleEntries);

    // Create initial ReviewCards for items with review enabled
    for (const item of planItems) {
      if (item.reviewConfig.enabled) {
        const scheduleEntry = scheduleEntries.find(e => e.planItemId === item.id);
        if (scheduleEntry) {
          const reviewDate = new Date(scheduleEntry.date);
          reviewDate.setDate(reviewDate.getDate() + 1); // First review next day
          const reviewCard: ReviewCard = {
            id: uuidv4(),
            planItemId: item.id,
            planId,
            nextReviewDate: formatDate(reviewDate),
            interval: 1,
            easeFactor: 2.5,
            reps: 0,
            status: 'upcoming',
            reviewHistory: [],
            createdAt: now,
            updatedAt: now,
          };
          await addReviewCard(reviewCard);
        }
      }
    }

    router.push(`/plans/${planId}`);

    // 自动创建知识记忆
    try {
      const now2 = new Date();
      const knowledgeEntry = {
        id: uuidv4(),
        title: planTitle || generatedPlan.title,
        content: `目标：${goal}\n描述：${planDesc || generatedPlan.description}\n共 ${generatedPlan.items.length} 个学习任务`,
        category: getCategoryFromGoal(goal),
        proficiency: 1,
        source: 'auto_plan' as const,
        sourceId: planId,
        sourceFileName: null,
        createdAt: now2,
        updatedAt: now2,
      };
      await addKnowledgeEntry(knowledgeEntry);
    } catch {
      // 静默失败，不影响计划保存
    }
  };

  const resetGeneration = () => {
    setGeneratedPlan(null);
    setError('');
    setEditingItemIndex(null);
    setRefineInstruction('');
  };

  const handleRefine = async () => {
    if (!refineInstruction.trim() || !generatedPlan) return;
    setRefining(true);
    setError('');

    try {
      const result = await refinePlan({
        goal: goal.trim(),
        planTitle: planTitle || generatedPlan.title,
        currentItems: generatedPlan.items,
        refineInstruction: refineInstruction.trim(),
      });

      setGeneratedPlan({
        title: result.planTitle,
        description: result.planDescription,
        items: result.planItems,
      });
      setRefineInstruction('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '修改失败';
      setError(message);
    } finally {
      setRefining(false);
    }
  };

  const updateItem = (index: number, field: string, value: string | number | boolean) => {
    if (!generatedPlan) return;
    const items = [...generatedPlan.items];
    items[index] = { ...items[index], [field]: value };
    setGeneratedPlan({ ...generatedPlan, items });
  };

  if (generatedPlan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={resetGeneration}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI 生成的计划
            </h1>
            <p className="text-muted-foreground">检查并确认你的学习计划</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>计划信息</CardTitle>
            <CardDescription>可以修改 AI 生成的标题和描述</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>计划标题</Label>
              <Input value={planTitle} onChange={e => setPlanTitle(e.target.value)} />
            </div>
            <div>
              <Label>计划描述</Label>
              <Textarea value={planDesc} onChange={e => setPlanDesc(e.target.value)} rows={3} />
            </div>
            <div>
              <Label>颜色标签</Label>
              <div className="flex gap-2 mt-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              计划项目 ({generatedPlan.items.length} 项)
            </CardTitle>
            <CardDescription>点击项目可展开编辑</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {generatedPlan.items.map((item, idx) => (
                <div key={idx}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setEditingItemIndex(editingItemIndex === idx ? null : idx)}
                  >
                    <span className="text-muted-foreground w-6">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-muted-foreground truncate">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {item.suggestedDate}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {item.estimatedMinutes}分钟
                      </Badge>
                      {item.reviewEnabled && (
                        <Badge variant="secondary" className="gap-1">
                          <Brain className="h-3 w-3" />
                          复习
                        </Badge>
                      )}
                      {editingItemIndex === idx ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {editingItemIndex === idx && (
                    <div className="p-3 border border-t-0 rounded-b-lg bg-muted/30 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">标题</Label>
                          <Input
                            value={item.title}
                            onChange={e => updateItem(idx, 'title', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">类型</Label>
                          <select
                            value={item.type}
                            onChange={e => updateItem(idx, 'type', e.target.value)}
                            className="w-full h-8 text-sm rounded-md border bg-background px-2"
                          >
                            <option value="study">学习</option>
                            <option value="practice">练习</option>
                            <option value="review">复习</option>
                            <option value="output">产出</option>
                            <option value="other">其他</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">描述</Label>
                        <Textarea
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">时长 (分钟)</Label>
                          <Input
                            type="number"
                            value={item.estimatedMinutes}
                            onChange={e => updateItem(idx, 'estimatedMinutes', Number(e.target.value))}
                            className="h-8 text-sm"
                            min={10}
                            max={480}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">日期</Label>
                          <Input
                            type="date"
                            value={item.suggestedDate}
                            onChange={e => updateItem(idx, 'suggestedDate', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.reviewEnabled}
                              onChange={e => updateItem(idx, 'reviewEnabled', e.target.checked)}
                              className="rounded"
                            />
                            启用复习
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Refine Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI 修改计划
            </CardTitle>
            <CardDescription>
              告诉 AI 你想如何调整这个计划，AI 会在保留其他内容的基础上修改
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-3">
              <Input
                placeholder="例如：把第三天的任务改成更基础的内容，第5天加入一个小测验..."
                value={refineInstruction}
                onChange={e => setRefineInstruction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRefine()}
                className="flex-1"
              />
              <Button
                onClick={handleRefine}
                disabled={refining || !refineInstruction.trim()}
                className="gap-2 shrink-0"
              >
                {refining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit3 className="h-4 w-4" />
                )}
                {refining ? '修改中...' : 'AI 修改'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={resetGeneration}>
            重新生成
          </Button>
          <Button onClick={handleSavePlan} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            确认并创建计划
          </Button>
        </div>
      </div>
    );
  }

  // Input form
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push('/plans')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI 创建计划
          </h1>
          <p className="text-muted-foreground">告诉 AI 你的学习目标，自动生成完整计划</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="text-base">学习目标</Label>
            <Textarea
              placeholder="例如：学习 React 前端开发，掌握 Python 数据分析，准备考研英语..."
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium text-sm">AI 自主规划</p>
              <p className="text-xs text-muted-foreground">
                让 AI 根据目标难度，自动判断学习周期和每日投入时间
              </p>
            </div>
            <Switch
              checked={autoPlanMode}
              onCheckedChange={setAutoPlanMode}
            />
          </div>

          <div>
            <Label className="text-sm">每周学习日</Label>
            <p className="text-xs text-muted-foreground mb-2">选择每周哪几天安排学习任务</p>
            <div className="flex gap-1.5">
              {WEEKDAYS.map(day => {
                const selected = availableDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-all border-2 ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                    }`}
                    onClick={() => {
                      if (selected) {
                        if (availableDays.length > 1) {
                          setAvailableDays(availableDays.filter(d => d !== day.key));
                        }
                      } else {
                        setAvailableDays([...availableDays, day.key]);
                      }
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!autoPlanMode && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>每天可用时间 (小时)</Label>
                  <Input
                    type="number"
                    value={availableHoursPerDay}
                    onChange={e => setAvailableHoursPerDay(Number(e.target.value))}
                    min={0.5}
                    max={12}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>开始日期</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </>
          )}

          <div>
            <Label>额外偏好（可选）</Label>
            <Textarea
              placeholder="例如：偏好早上学习，需要大量动手实践，希望按主题分阶段..."
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              rows={2}
              className="mt-2"
            />
          </div>

          <Separator />

          <Button
            onClick={handleGenerate}
            disabled={generating || !goal.trim()}
            className="w-full gap-2"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI 正在生成计划...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                生成学习计划
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
