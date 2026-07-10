'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { PostponeDialog } from '@/components/postpone-dialog';
import { refinePlan } from '@/lib/ai-service';
import type { PlanItem, AIPlanItem } from '@/lib/types';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Clock,
  FileText,
  Trash2,
  Edit3,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const {
    currentPlan,
    planItems,
    planOutputs,
    loadPlan,
    loadPlanItems,
    loadPlanOutputs,
    editPlan,
    addPlanItem,
    editPlanItem,
    removePlanItem,
    bulkAddPlanItems,
    addOutput,
    editOutput,
    removeOutput,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemMinutes, setNewItemMinutes] = useState(30);
  const [showPostpone, setShowPostpone] = useState(false);
  const [showAIOptimize, setShowAIOptimize] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');

  useEffect(() => {
    async function init() {
      await loadPlan(planId);
      await loadPlanItems(planId);
      await loadPlanOutputs(planId);
      setLoading(false);
    }
    init();
  }, [planId, loadPlan, loadPlanItems, loadPlanOutputs]);

  const handleAIOptimize = async () => {
    if (!optimizeInstruction.trim() || !currentPlan) return;
    setOptimizing(true);
    setOptimizeError('');

    try {
      const currentAIPlanItems: AIPlanItem[] = planItems.map(item => ({
        title: item.title,
        description: item.description,
        type: item.type,
        estimatedMinutes: item.estimatedMinutes,
        suggestedDate: '',
        reviewEnabled: item.reviewConfig.enabled,
      }));

      const result = await refinePlan({
        goal: currentPlan.goal || '',
        planTitle: currentPlan.title,
        currentItems: currentAIPlanItems,
        refineInstruction: optimizeInstruction.trim(),
      });

      for (const item of planItems) {
        await removePlanItem(item.id);
      }

      const newItems: PlanItem[] = result.planItems.map((item, idx) => ({
        id: uuidv4(),
        planId: currentPlan.id,
        title: item.title,
        description: item.description,
        type: item.type,
        estimatedMinutes: item.estimatedMinutes,
        order: idx,
        dependencies: [],
        reviewConfig: {
          enabled: item.reviewEnabled,
          strategy: 'sm2' as const,
          intervals: [1, 3, 7, 15, 30],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await bulkAddPlanItems(newItems);
      setShowAIOptimize(false);
      setOptimizeInstruction('');
    } catch (err) {
      const message = err instanceof Error ? err.message : '优化失败';
      setOptimizeError(message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    const item: PlanItem = {
      id: uuidv4(),
      planId,
      title: newItemTitle,
      description: newItemDesc,
      type: 'study',
      estimatedMinutes: newItemMinutes,
      order: planItems.length,
      dependencies: [],
      reviewConfig: { enabled: false, strategy: 'sm2', intervals: [1, 3, 7, 15, 30] },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addPlanItem(item);
    setNewItemTitle('');
    setNewItemDesc('');
    setNewItemMinutes(30);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen">
        <p className="text-muted-foreground mb-4">计划不存在</p>
        <Button onClick={() => router.push('/plans')}>返回计划列表</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/plans')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: currentPlan.color || '#6366f1' }}
            />
            <h1 className="text-2xl font-bold">{currentPlan.title}</h1>
            <Badge>{currentPlan.status === 'active' ? '进行中' : currentPlan.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{currentPlan.description}</p>
          {currentPlan.goal && (
            <p className="text-sm text-muted-foreground mt-1">目标：{currentPlan.goal}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAIOptimize(true)}
          >
            <Sparkles className="h-4 w-4" />
            AI 优化
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowPostpone(true)}
          >
            <ChevronRight className="h-4 w-4" />
            推迟计划
          </Button>
        </div>
      </div>

      <PostponeDialog
        planId={currentPlan.id}
        planTitle={currentPlan.title}
        open={showPostpone}
        onOpenChange={setShowPostpone}
      />

      <Dialog open={showAIOptimize} onOpenChange={setShowAIOptimize}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 优化计划
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              描述你希望如何修改这个计划，AI 会基于当前内容进行优化。
            </p>
            {optimizeError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{optimizeError}</AlertDescription>
              </Alert>
            )}
            <Textarea
              placeholder="例如：把前3天的内容拆成更小的任务，增加更多练习环节..."
              value={optimizeInstruction}
              onChange={e => setOptimizeInstruction(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowAIOptimize(false)}>
              取消
            </Button>
            <Button
              onClick={handleAIOptimize}
              disabled={optimizing || !optimizeInstruction.trim()}
              className="gap-2"
            >
              {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {optimizing ? '优化中...' : '开始优化'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="items" className="w-full">
        <TabsList>
          <TabsTrigger value="items">计划项目</TabsTrigger>
          <TabsTrigger value="schedule">日程安排</TabsTrigger>
          <TabsTrigger value="outputs">产出笔记</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4 mt-4">
          {/* Add Item Form */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <Input
                    placeholder="新任务标题"
                    value={newItemTitle}
                    onChange={e => setNewItemTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="分钟"
                    value={newItemMinutes}
                    onChange={e => setNewItemMinutes(Number(e.target.value))}
                    className="w-24"
                  />
                  <Button onClick={handleAddItem} disabled={!newItemTitle.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> 添加
                  </Button>
                </div>
                <Textarea
                  placeholder="任务描述（可选）"
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          {planItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-50" />
                <p>还没有计划项目，开始添加吧</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {planItems.map((item, index) => (
                <Card key={item.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {item.estimatedMinutes}分钟
                        </Badge>
                        <Badge variant="secondary">{item.type}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removePlanItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
              <Clock className="h-10 w-10 mb-2 opacity-50" />
              <p>日程将在日历视图中统一管理</p>
              <Button variant="outline" className="mt-4" onClick={() => router.push('/calendar')}>
                前往日历视图
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outputs" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">计划产出笔记</h3>
            <Button
              size="sm"
              className="gap-1"
              onClick={async () => {
                const title = prompt('笔记标题：') || '未命名笔记';
                const output = {
                  id: uuidv4(),
                  planId,
                  planItemId: null,
                  title,
                  content: '',
                  tags: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await addOutput(output);
                await loadPlanOutputs(planId);
              }}
            >
              <Plus className="h-4 w-4" />
              新建笔记
            </Button>
          </div>
          {planOutputs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2 opacity-50" />
                <p>该计划还没有产出笔记</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/outputs')}>
                  前往产出库
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {planOutputs.map(output => (
                <Card key={output.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium truncate">{output.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {output.content.slice(0, 200)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(output.updatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/outputs?edit=${output.id}`)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={async () => {
                            if (confirm('确定要删除吗？')) {
                              await removeOutput(output.id);
                              await loadPlanOutputs(planId);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
