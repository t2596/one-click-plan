'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate, todayStr } from '@/lib/db';
import {
  BookOpen,
  CalendarDays,
  Brain,
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    plans,
    todaySchedule,
    dueReviews,
    outputs,
    loadPlans,
    loadTodaySchedule,
    loadDueReviews,
    loadAllOutputs,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadPlans(),
        loadTodaySchedule(),
        loadDueReviews(),
        loadAllOutputs(),
      ]);
      setLoading(false);
    }
    init();
  }, [loadPlans, loadTodaySchedule, loadDueReviews, loadAllOutputs]);

  const today = todayStr();
  const activePlans = plans.filter(p => p.status === 'active');
  const todayTasks = todaySchedule;
  const completedToday = todayTasks.filter(t => t.isCompleted).length;
  const totalToday = todayTasks.length;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground mt-1">{today}，开始你的一天</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">进行中计划</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {plans.length} 个计划
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">今日任务</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedToday}/{totalToday}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalToday > 0
                ? totalToday === completedToday
                  ? '全部完成!'
                  : `还有 ${totalToday - completedToday} 项待完成`
                : '今天没有安排任务'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">待复习</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueReviews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dueReviews.length > 0 ? '有复习任务等待你' : '暂无待复习内容'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">产出笔记</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outputs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              累计产出
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">今日日程</CardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="gap-1">
                日历视图 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>今日没有安排任务</p>
                <Link href="/plans/new">
                  <Button variant="outline" size="sm" className="mt-4 gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 创建计划
                  </Button>
                </Link>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {todayTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {statusIcon(task.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {/* We'll resolve planItem names later */}
                          {task.notes || '未命名任务'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {task.startTime} - {task.endTime}
                        </p>
                      </div>
                      <Badge variant={task.isCompleted ? 'default' : 'outline'}>
                        {task.isCompleted ? '完成' : task.status === 'in_progress' ? '进行中' : '待开始'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Active Plans Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">进行中的计划</CardTitle>
            <Link href="/plans">
              <Button variant="ghost" size="sm" className="gap-1">
                查看全部 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activePlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>还没有进行中的计划</p>
                <Link href="/plans/new">
                  <Button variant="outline" size="sm" className="mt-4 gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 创建计划
                  </Button>
                </Link>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {activePlans.map(plan => (
                    <Link key={plan.id} href={`/plans/${plan.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: plan.color || '#6366f1' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{plan.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {plan.description || '暂无描述'}
                          </p>
                        </div>
                        <Badge variant="secondary">{plan.status === 'active' ? '进行中' : plan.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Due Reviews */}
        {dueReviews.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">待复习</CardTitle>
              <Link href="/review">
                <Button variant="ghost" size="sm" className="gap-1">
                  复习中心 <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dueReviews.map(card => (
                  <Badge key={card.id} variant="destructive" className="text-sm py-1 px-3">
                    <Brain className="h-3 w-3 mr-1" />
                    待复习 #{card.reps + 1}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
