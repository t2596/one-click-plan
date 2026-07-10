'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Sparkles,
  BookOpen,
  MoreHorizontal,
  Play,
  Pause,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PlansPage() {
  const { plans, loadPlans, editPlan, removePlan } = usePlanStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans().then(() => setLoading(false));
  }, [loadPlans]);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">进行中</Badge>;
      case 'completed':
        return <Badge variant="secondary">已完成</Badge>;
      case 'paused':
        return <Badge variant="outline">已暂停</Badge>;
      default:
        return null;
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">计划列表</h1>
          <p className="text-muted-foreground mt-1">管理你的所有学习计划</p>
        </div>
        <Link href="/plans/new">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI 创建计划
          </Button>
        </Link>
      </div>

      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">还没有任何计划</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              使用 AI 一键创建你的学习计划，或者手动创建一个新计划
            </p>
            <div className="flex gap-3">
              <Link href="/plans/new">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI 创建计划
                </Button>
              </Link>
              <Link href="/plans/new?manual=true">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  手动创建
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Link key={plan.id} href={`/plans/${plan.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: plan.color || '#6366f1' }}
                      />
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={e => e.preventDefault()} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.preventDefault();
                            editPlan(plan.id, {
                              status: plan.status === 'active' ? 'paused' : 'active',
                            });
                          }}
                        >
                          {plan.status === 'active' ? (
                            <><Pause className="h-4 w-4 mr-2" /> 暂停</>
                          ) : (
                            <><Play className="h-4 w-4 mr-2" /> 继续</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={e => {
                            e.preventDefault();
                            editPlan(plan.id, { status: 'completed' });
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" /> 标记完成
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={e => {
                            e.preventDefault();
                            if (confirm(`确定要删除计划「${plan.title}」吗？\n删除后，关联的日程、复习和笔记也将一并删除，此操作不可恢复。`)) {
                              removePlan(plan.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> 删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {plan.description || '暂无描述'}
                  </p>
                  {plan.goal && (
                    <p className="text-xs text-muted-foreground mb-3">
                      目标：{plan.goal}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {statusBadge(plan.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(plan.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
