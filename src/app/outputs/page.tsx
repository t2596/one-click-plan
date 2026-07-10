'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PlanOutput } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Layers,
} from 'lucide-react';

export default function OutputsPage() {
  const router = useRouter();
  const {
    outputs,
    plans,
    loadAllOutputs,
    loadPlans,
    removeOutput,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function init() {
      await loadPlans();
      await loadAllOutputs();
      setLoading(false);
    }
    init();
  }, [loadPlans, loadAllOutputs]);

  // 按计划分组的产出
  const outputsByPlan = (() => {
    const map: Record<string, PlanOutput[]> = {};
    const uncategorized: PlanOutput[] = [];

    for (const o of outputs) {
      if (o.planId) {
        if (!map[o.planId]) map[o.planId] = [];
        map[o.planId].push(o);
      } else {
        uncategorized.push(o);
      }
    }

    return { map, uncategorized };
  })();

  // 过滤当前选中的产出
  const filteredOutputs = (() => {
    let result = outputs;
    if (selectedPlanId === null) {
      result = outputs;
    } else if (selectedPlanId === '__uncategorized__') {
      result = outputsByPlan.uncategorized;
    } else {
      result = outputsByPlan.map[selectedPlanId] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.content.toLowerCase().includes(q) ||
        o.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    return result.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  })();

  // 获取计划名称
  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.title || '未知计划';
  };

  const getPlanColor = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.color || '#6366f1';
  };

  const togglePlanExpand = (planId: string) => {
    const next = new Set(expandedPlans);
    if (next.has(planId)) next.delete(planId);
    else next.add(planId);
    setExpandedPlans(next);
  };

  const handleSelectPlan = (planId: string | null) => {
    setSelectedPlanId(planId);
    if (planId && planId !== '__uncategorized__') {
      setExpandedPlans(prev => new Set([...prev, planId]));
    }
  };

  const handleEdit = (output: PlanOutput) => {
    router.push(`/outputs/${output.id}`);
  };

  const handleNew = () => {
    router.push('/outputs/new');
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这条笔记吗？')) {
      await removeOutput(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // 统计各计划产出数量
  const getPlanOutputCount = (planId: string) => {
    return (outputsByPlan.map[planId] || []).length;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* 左侧：计划文件夹树 */}
      <div className="w-64 border-r flex flex-col shrink-0 bg-muted/20">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            计划文件夹
          </h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* 全部笔记 */}
            <button
              onClick={() => handleSelectPlan(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                selectedPlanId === null
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">全部笔记</span>
              <Badge variant="secondary" className="text-xs">{outputs.length}</Badge>
            </button>

            {/* 计划列表 */}
            <div className="mt-2 space-y-0.5">
              {plans.map(plan => {
                const count = getPlanOutputCount(plan.id);
                const isExpanded = expandedPlans.has(plan.id);
                const isSelected = selectedPlanId === plan.id;

                return (
                  <div key={plan.id}>
                    <button
                      onClick={() => {
                        togglePlanExpand(plan.id);
                        handleSelectPlan(plan.id);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: getPlanColor(plan.id) }}
                      />
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0" />
                      )}
                      <Folder className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left truncate">{plan.title}</span>
                      {count > 0 && (
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      )}
                    </button>

                    {/* 展开显示产出列表（紧凑模式） */}
                    {isExpanded && count > 0 && !isSelected && (
                      <div className="ml-8 space-y-0.5 mt-0.5">
                        {(outputsByPlan.map[plan.id] || []).slice(0, 5).map(o => (
                          <button
                            key={o.id}
                            onClick={() => handleEdit(o)}
                            className="w-full text-left px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded truncate block"
                          >
                            {o.title}
                          </button>
                        ))}
                        {count > 5 && (
                          <button
                            onClick={() => handleSelectPlan(plan.id)}
                            className="text-xs text-primary px-2 py-1 hover:underline"
                          >
                            查看全部 {count} 项...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 未归类 */}
            {outputsByPlan.uncategorized.length > 0 && (
              <>
                <div className="my-2 border-t" />
                <button
                  onClick={() => handleSelectPlan('__uncategorized__')}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedPlanId === '__uncategorized__'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">未归类</span>
                  <Badge variant="outline" className="text-xs">
                    {outputsByPlan.uncategorized.length}
                  </Badge>
                </button>
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧：产出列表 + 编辑 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold">
              {selectedPlanId === null
                ? '全部笔记'
                : selectedPlanId === '__uncategorized__'
                ? '未归类笔记'
                : getPlanName(selectedPlanId)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredOutputs.length} 条笔记
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              新建笔记
            </Button>
          </div>
        </div>

        {/* 产出列表 */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {filteredOutputs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center py-16">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? '没有找到匹配的笔记' : '还没有任何笔记'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? '试试其他关键词' : '创建你的第一篇学习笔记'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleNew} className="gap-2">
                      <Plus className="h-4 w-4" />
                      新建笔记
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOutputs.map(output => (
                  <Card key={output.id} className="hover:shadow-md transition-shadow group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base truncate">{output.title}</CardTitle>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(output)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(output.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs flex items-center gap-2">
                        <span>{new Date(output.updatedAt).toLocaleString('zh-CN')}</span>
                        {output.planId && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getPlanColor(output.planId) }}
                            />
                            {getPlanName(output.planId)}
                          </Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground line-clamp-3 prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {output.content.slice(0, 300) + (output.content.length > 300 ? '...' : '')}
                        </ReactMarkdown>
                      </div>
                      {output.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {output.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
