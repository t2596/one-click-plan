'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import type { PlanOutput, PlanItem, ScheduleEntry, ReviewCard } from '@/lib/types';
import {
  ArrowLeft,
  Clock,
  FileText,
  Plus,
  Edit3,
  Trash2,
  Brain,
  CalendarDays,
  CheckCircle2,
  Circle,
  BookOpen,
  ExternalLink,
  Tag,
  X,
} from 'lucide-react';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planItemId = params.planItemId as string;

  const {
    plans,
    planItems,
    outputs,
    loadPlans,
    loadAllPlanItems,
    loadAllOutputs,
    addOutput,
    editOutput,
    removeOutput,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');
  const [editingTags, setEditingTags] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    async function init() {
      await loadPlans();
      await loadAllPlanItems();
      await loadAllOutputs();
      setLoading(false);
    }
    init();
  }, [loadPlans, loadAllPlanItems, loadAllOutputs]);

  const item = planItems.find(i => i.id === planItemId);
  const plan = item ? plans.find(p => p.id === item.planId) : null;

  // Find associated schedule entries and review cards from DB via store
  // We need to load schedule for this planId to find entries for this item
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [reviewCard, setReviewCard] = useState<ReviewCard | null>(null);

  useEffect(() => {
    if (!item || !plan) return;
    // Load schedule
    import('@/lib/db').then(({ getScheduleByPlan, getReviewCardsByPlanItem }) => {
      getScheduleByPlan(item.planId).then(entries => {
        setScheduleEntries(entries.filter(e => e.planItemId === item.id));
      });
      getReviewCardsByPlanItem(item.id).then(card => {
        setReviewCard(card || null);
      });
    });
  }, [item, plan]);

  // Notes for this plan item
  const relatedNotes = outputs.filter(o => o.planItemId === planItemId);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;
    const tags = newNoteTags
      .split(/[,，\s]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const output: PlanOutput = {
      id: uuidv4(),
      planId: item?.planId || '',
      planItemId,
      title: newNoteTitle.trim(),
      content: newNoteContent,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await addOutput(output);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteTags('');
    setShowNewNote(false);
    await loadAllOutputs();
  };

  const handleUpdateTags = async (outputId: string, tags: string[]) => {
    await editOutput(outputId, { tags });
    setEditingTags(null);
    await loadAllOutputs();
  };

  const handleDeleteNote = async (outputId: string) => {
    if (confirm('删除这条笔记？')) {
      await removeOutput(outputId);
      await loadAllOutputs();
    }
  };

  const getPlanColor = () => plan?.color || '#6366f1';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">任务不存在</p>
        <Button onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const typeLabel: Record<string, string> = {
    study: '学习',
    practice: '练习',
    review: '复习',
    output: '产出',
    other: '其他',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 返回 */}
      <Button variant="ghost" size="icon" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* 任务头部 */}
      <Card className="mb-6" style={{ borderLeftColor: getPlanColor(), borderLeftWidth: '4px' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" style={{ backgroundColor: getPlanColor() + '20', color: getPlanColor() }}>
                {typeLabel[item.type] || item.type}
              </Badge>
              <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80" onClick={() => plan && router.push(`/plans/${plan.id}`)}>
                <BookOpen className="h-3 w-3" />
                {plan?.title || '未知计划'}
              </Badge>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {item.estimatedMinutes} 分钟
            </Badge>
          </div>
          <CardTitle className="text-2xl mt-2">{item.title}</CardTitle>
          <CardDescription className="text-base">{item.description}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左侧：关联信息和笔记列表 */}
        <div className="lg:col-span-3 space-y-6">
          {/* 日程记录 */}
          {scheduleEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  日程安排
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {scheduleEntries.map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    {entry.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${entry.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {entry.date}
                      </p>
                    </div>
                    <Badge variant={entry.isCompleted ? 'default' : 'outline'} className="text-xs">
                      {entry.isCompleted ? '已完成' : '待完成'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 复习卡片 */}
          {reviewCard && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  间隔复习
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">下次复习</p>
                    <p className="font-medium text-sm">{reviewCard.nextReviewDate}</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">间隔</p>
                    <p className="font-medium text-sm">{reviewCard.interval} 天</p>
                  </div>
                  <div className="p-2 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground">已复习</p>
                    <p className="font-medium text-sm">{reviewCard.reps} 次</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 产出笔记 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  产出笔记 ({relatedNotes.length})
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowNewNote(true)}>
                  <Plus className="h-3 w-3" />
                  新建笔记
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 新建笔记表单 */}
              {showNewNote && (
                <div className="mb-4 p-3 border rounded-lg bg-muted/30 space-y-3">
                  <Input
                    placeholder="笔记标题"
                    value={newNoteTitle}
                    onChange={e => setNewNoteTitle(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder="Markdown 内容..."
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <Input
                      placeholder="标签（逗号分隔）"
                      value={newNoteTags}
                      onChange={e => setNewNoteTags(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowNewNote(false)}>取消</Button>
                    <Button size="sm" onClick={handleCreateNote} disabled={!newNoteTitle.trim()}>创建</Button>
                  </div>
                </div>
              )}

              {relatedNotes.length === 0 && !showNewNote ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>暂无关联笔记</p>
                  <p className="text-xs mt-1">创建笔记记录学习产出</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {relatedNotes.map(note => (
                    <div key={note.id} className="p-3 border rounded-lg hover:border-primary/30 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="font-medium text-sm cursor-pointer hover:text-primary"
                          onClick={() => router.push(`/outputs/${note.id}`)}
                        >
                          {note.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/outputs/${note.id}`)}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteNote(note.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {note.content.slice(0, 150)}
                      </p>
                      {/* Tags */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {note.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                        {editingTags === note.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={tagInput}
                              onChange={e => setTagInput(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleUpdateTags(
                                    note.id,
                                    tagInput.split(/[,，\s]+/).map(t => t.trim()).filter(Boolean)
                                  );
                                }
                                if (e.key === 'Escape') setEditingTags(null);
                              }}
                              className="h-6 w-28 text-xs"
                              placeholder="标签..."
                            />
                          </div>
                        ) : (
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground px-1"
                            onClick={() => { setEditingTags(note.id); setTagInput(note.tags.join(', ')); }}
                          >
                            + 标签
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：计划信息 */}
        <div className="lg:col-span-2 space-y-4">
          {plan && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">所属计划</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/plans/${plan.id}`)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getPlanColor() }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{plan.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">快速操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setShowNewNote(true)}
              >
                <Plus className="h-4 w-4" />
                为此任务添加笔记
              </Button>
              {plan && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => router.push(`/plans/${plan.id}`)}
                >
                  <BookOpen className="h-4 w-4" />
                  查看完整计划
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
