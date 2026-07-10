'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlanStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';
import MarkdownCells, { contentToCells, cellsToContent } from '@/components/markdown-cells';
import type { Cell } from '@/components/markdown-cells';
import type { PlanOutput } from '@/lib/types';
import {
  ArrowLeft,
  Trash2,
  Save,
} from 'lucide-react';

export default function OutputEditorPage() {
  const params = useParams();
  const router = useRouter();
  const outputId = params.id as string;
  const isNew = outputId === 'new';

  const {
    outputs,
    plans,
    loadAllOutputs,
    loadPlans,
    addOutput,
    editOutput,
    removeOutput,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [cells, setCells] = useState<Cell[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>(isNew ? 'unsaved' : 'saved');
  const initializedRef = useRef(false);

  useEffect(() => {
    async function init() {
      await loadPlans();
      await loadAllOutputs();
      setLoading(false);
    }
    init();
  }, [loadPlans, loadAllOutputs]);

  // 加载已有笔记内容
  useEffect(() => {
    if (loading || isNew || initializedRef.current) return;
    const output = usePlanStore.getState().outputs.find(o => o.id === outputId);
    if (output) {
      setTitle(output.title);
      setCells(contentToCells(output.content));
      setSaveStatus('saved');
      initializedRef.current = true;
    }
  }, [loading, outputId, isNew]);

  // Ctrl+S 快捷保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, cells, isNew, outputId]);

  const handleCellsChange = (newCells: Cell[]) => {
    setCells(newCells);
    if (saveStatus === 'saved') setSaveStatus('unsaved');
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setSaveStatus('saving');

    const content = cellsToContent(cells);

    try {
      if (isNew) {
        const output: PlanOutput = {
          id: uuidv4(),
          planId: '',
          planItemId: null,
          title: title.trim(),
          content,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await addOutput(output);
        initializedRef.current = true;
        router.replace(`/outputs/${output.id}`);
      } else {
        await editOutput(outputId, { title: title.trim(), content });
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isNew && confirm('确定要删除这条笔记吗？此操作不可恢复。')) {
      await removeOutput(outputId);
      router.push('/outputs');
    }
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.title;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentOutput = !isNew ? outputs.find(o => o.id === outputId) : null;
  const content = cellsToContent(cells);

  return (
    <div className="flex flex-col h-screen">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between px-4 py-2 border-b shrink-0 bg-background">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.push('/outputs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <Input
              placeholder="笔记标题"
              value={title}
              onChange={e => { setTitle(e.target.value); setSaveStatus('unsaved'); }}
              className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0 shadow-none"
            />
            {currentOutput?.planId && getPlanName(currentOutput.planId) && (
              <p className="text-xs text-muted-foreground -mt-0.5">
                归属：
                <Badge variant="outline" className="text-xs ml-1">
                  {getPlanName(currentOutput.planId)}
                </Badge>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isNew && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">删除</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? '已保存' : '保存'}
          </Button>
        </div>
      </header>

      {/* 编辑器主体：单元格列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {cells.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg mb-4">开始编写笔记</p>
              <Button
                variant="outline"
                onClick={() => setCells([{ id: crypto.randomUUID(), content: '', mode: 'edit' }])}
              >
                添加第一个单元格
              </Button>
            </div>
          ) : (
            <MarkdownCells cells={cells} onChange={handleCellsChange} />
          )}
        </div>
      </div>

      {/* 底部状态栏 */}
      <footer className="flex items-center justify-between px-4 py-1.5 border-t text-xs text-muted-foreground shrink-0 bg-muted/20">
        <span>
          {isNew
            ? '新建笔记'
            : currentOutput
            ? `更新于 ${new Date(currentOutput.updatedAt).toLocaleString('zh-CN')}`
            : ''}
          {saveStatus === 'unsaved' && (
            <span className="text-amber-500 ml-2">● 未保存</span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-blue-500 ml-2">● 保存中...</span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span>Ctrl+S 保存 · Ctrl+Enter 渲染单元格</span>
          <span>{content.length} 字符 · {cells.length} 个单元格</span>
        </span>
      </footer>
    </div>
  );
}
