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
import { v4 as uuidv4 } from 'uuid';
import { formatDate, formatTime } from '@/lib/db';
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
} from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function NewPlanPage() {
  const router = useRouter();
  const { addPlan, bulkAddPlanItems, bulkAddScheduleEntries, addReviewCard } = usePlanStore();

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

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError('请输入学习目标');
      return;
    }

    setGenerating(true);
    setError('');

    // Simulate AI generation with a structured template-based approach
    // In production, this would call the LLM API
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a sample plan based on user input
    const topics = goal.split(/[,，、\s]+/).filter(Boolean);
    if (topics.length === 0) topics.push(goal);

    const items: AIPlanItem[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    let currentDate = new Date(start);
    let dayIndex = 0;
    const phases = ['入门基础', '核心概念', '进阶深入', '实践练习', '总结复习'];

    while (currentDate <= end && dayIndex < totalDays) {
      const phaseIndex = Math.min(Math.floor(dayIndex / Math.max(1, Math.ceil(totalDays / phases.length))), phases.length - 1);
      const phase = phases[phaseIndex];
      const topic = topics[dayIndex % topics.length];

      const hour = 9 + Math.floor(Math.random() * 3);

      items.push({
        title: `[${phase}] ${topic} - 第${dayIndex + 1}天`,
        description: `学习 ${topic} 的${phase}部分，预计需要 ${availableHoursPerDay * 60} 分钟`,
        type: phaseIndex === 3 ? 'practice' : phaseIndex === 4 ? 'review' : 'study',
        estimatedMinutes: availableHoursPerDay * 60,
        suggestedDate: formatDate(currentDate),
        suggestedStartTime: `${String(hour).padStart(2, '0')}:00`,
        reviewEnabled: true,
      });

      currentDate.setDate(currentDate.getDate() + 1);
      dayIndex++;
    }

    setGeneratedPlan({
      title: `${goal} - 学习计划`,
      description: `为期 ${totalDays} 天的系统学习计划，每天 ${availableHoursPerDay} 小时`,
      items,
    });

    setPlanTitle(`${goal} - 学习计划`);
    setPlanDesc(`为期 ${totalDays} 天的系统学习计划，每天 ${availableHoursPerDay} 小时`);
    setGenerating(false);
  };

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
      const startTime = item.suggestedStartTime;
      const [h, m] = startTime.split(':').map(Number);
      const endH = h + Math.floor((item.estimatedMinutes + (h * 60 + m) % 60) / 60);
      const endM = (m + item.estimatedMinutes) % 60;
      const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      return {
        id: uuidv4(),
        planItemId,
        planId,
        date: item.suggestedDate,
        startTime,
        endTime,
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
  };

  const resetGeneration = () => {
    setGeneratedPlan(null);
    setError('');
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
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {generatedPlan.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border text-sm">
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
                  </div>
                </div>
              ))}
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
