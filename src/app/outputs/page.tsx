'use client';

import { useEffect, useState } from 'react';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import type { PlanOutput } from '@/lib/types';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  ArrowRight,
  BookOpen,
  CalendarDays,
} from 'lucide-react';

export default function OutputsPage() {
  const {
    outputs,
    loadAllOutputs,
    addOutput,
    editOutput,
    removeOutput,
    searchInOutputs,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingOutput, setEditingOutput] = useState<PlanOutput | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadAllOutputs().then(() => setLoading(false));
  }, [loadAllOutputs]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await loadAllOutputs();
      return;
    }
    const results = await searchInOutputs(searchQuery);
    // Update display - we'll use the search results
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    if (editingOutput) {
      await editOutput(editingOutput.id, { title: editTitle, content: editContent });
    } else {
      const output: PlanOutput = {
        id: uuidv4(),
        planId: '',
        planItemId: null,
        title: editTitle,
        content: editContent,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await addOutput(output);
    }

    setShowEditor(false);
    setEditingOutput(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleEdit = (output: PlanOutput) => {
    setEditingOutput(output);
    setEditTitle(output.title);
    setEditContent(output.content);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingOutput(null);
    setEditTitle('');
    setEditContent('');
    setShowEditor(true);
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
          <h1 className="text-3xl font-bold tracking-tight">产出库</h1>
          <p className="text-muted-foreground mt-1">管理你的学习笔记和产出</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          新建笔记
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>搜索</Button>
      </div>

      {/* Notes Grid */}
      {outputs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">还没有任何笔记</h3>
            <p className="text-muted-foreground mb-6">创建你的第一篇学习笔记</p>
            <Button onClick={handleNew} className="gap-2">
              <Plus className="h-4 w-4" />
              新建笔记
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {outputs.map(output => (
            <Card key={output.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base truncate">{output.title}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(output)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeOutput(output.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {new Date(output.updatedAt).toLocaleString('zh-CN')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                  {output.content.slice(0, 150)}
                  {output.content.length > 150 ? '...' : ''}
                </p>
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

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingOutput ? '编辑笔记' : '新建笔记'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-auto">
            <Input
              placeholder="笔记标题"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
            <textarea
              placeholder="使用 Markdown 编写笔记内容..."
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[300px] p-3 rounded-lg border bg-background resize-y font-mono text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!editTitle.trim()}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
