'use client';

import { useEffect, useState, useRef } from 'react';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';
import { analyzeFileContent } from '@/lib/ai-service';
import { parseFileContent } from '@/lib/file-parser';
import type { KnowledgeEntry, AIFileAnalysisResponse } from '@/lib/types';
import {
  Brain,
  Plus,
  Trash2,
  Edit3,
  Upload,
  FileText,
  Star,
  AlertCircle,
  Loader2,
  Sparkles,
  Download,
  Search,
} from 'lucide-react';

const CATEGORIES = ['编程语言', '数学', '英语', '设计', '计算机科学', '数据科学', '其他'];
const SOURCE_LABELS: Record<KnowledgeEntry['source'], string> = {
  manual: '手动添加',
  auto_plan: '计划自动',
  imported_output: '笔记导入',
  ai_file_analysis: 'AI 文件分析',
};

const PROFICIENCY_STARS = [1, 2, 3, 4, 5];

export default function KnowledgePage() {
  const {
    knowledgeEntries,
    loadKnowledgeEntries,
    addKnowledgeEntry,
    editKnowledgeEntry,
    removeKnowledgeEntry,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('编程语言');
  const [editProficiency, setEditProficiency] = useState(3);

  // File upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filesToAnalyze, setFilesToAnalyze] = useState<{ file: File; text: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResults, setAnalyzeResults] = useState<AIFileAnalysisResponse[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadKnowledgeEntries().then(() => setLoading(false));
  }, [loadKnowledgeEntries]);

  const filteredEntries = knowledgeEntries
    .filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.content.toLowerCase().includes(q)) return false;
      }
      if (filterCategory && e.category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const handleSave = async () => {
    if (!editTitle.trim()) return;

    const now = new Date();
    if (editingEntry) {
      await editKnowledgeEntry(editingEntry.id, {
        title: editTitle,
        content: editContent,
        category: editCategory,
        proficiency: editProficiency,
        updatedAt: now,
      });
    } else {
      const entry: KnowledgeEntry = {
        id: uuidv4(),
        title: editTitle,
        content: editContent,
        category: editCategory,
        proficiency: editProficiency,
        source: 'manual',
        sourceId: null,
        sourceFileName: null,
        createdAt: now,
        updatedAt: now,
      };
      await addKnowledgeEntry(entry);
    }

    setShowEditor(false);
    setEditingEntry(null);
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditContent(entry.content);
    setEditCategory(entry.category);
    setEditProficiency(entry.proficiency);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingEntry(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('编程语言');
    setEditProficiency(3);
    setShowEditor(true);
  };

  // File upload handling
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadError('');
    const parsed: { file: File; text: string }[] = [];

    for (const file of files) {
      const result = await parseFileContent(file);
      if (result.error) {
        setUploadError(`${file.name}: ${result.error}`);
      } else if (result.text.trim()) {
        parsed.push({ file, text: result.text });
      }
    }

    setFilesToAnalyze(prev => [...prev, ...parsed]);
    setUploading(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyzeFiles = async () => {
    if (filesToAnalyze.length === 0) return;

    setAnalyzing(true);
    setUploadError('');
    const results: AIFileAnalysisResponse[] = [];

    for (const item of filesToAnalyze) {
      try {
        const result = await analyzeFileContent(item.text, item.file.name);
        results.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : '分析失败';
        if (message.includes('API Key')) {
          setUploadError('请先在设置中配置 AI API Key');
          break;
        } else {
          setUploadError(`${item.file.name}: ${message}`);
        }
      }
    }

    setAnalyzeResults(results);
    setAnalyzing(false);
  };

  const handleConfirmAnalysis = async () => {
    const now = new Date();
    for (const result of analyzeResults) {
      const entry: KnowledgeEntry = {
        id: uuidv4(),
        title: result.title,
        content: result.content,
        category: result.category,
        proficiency: result.proficiency,
        source: 'ai_file_analysis',
        sourceId: null,
        sourceFileName: filesToAnalyze[0]?.file.name || null,
        createdAt: now,
        updatedAt: now,
      };
      await addKnowledgeEntry(entry);
    }

    setFilesToAnalyze([]);
    setAnalyzeResults([]);
  };

  const handleClearFiles = () => {
    setFilesToAnalyze([]);
    setAnalyzeResults([]);
  };

  // JSON export
  const handleExport = () => {
    const data = JSON.stringify(knowledgeEntries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `知识库_备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            知识库
          </h1>
          <p className="text-muted-foreground mt-1">管理你的学习记忆，让 AI 更了解你的学习背景</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            导出
          </Button>
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            添加记忆
          </Button>
        </div>
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="mb-6">
          <TabsTrigger value="browse" className="gap-2">
            <Brain className="h-4 w-4" /> 浏览记忆
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-2">
            <Upload className="h-4 w-4" /> 文件上传
          </TabsTrigger>
        </TabsList>

        {/* 浏览记忆 Tab */}
        <TabsContent value="browse">
          {/* 搜索和筛选 */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索知识条目..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">全部分类</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {filteredEntries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-16">
                <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || filterCategory ? '没有找到匹配的记忆' : '知识库为空'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery || filterCategory ? '试试调整筛选条件' : '添加你的第一条学习记忆'}
                </p>
                {!searchQuery && !filterCategory && (
                  <div className="flex gap-2">
                    <Button onClick={handleNew} className="gap-2">
                      <Plus className="h-4 w-4" />
                      手动添加
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntries.map(entry => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {entry.title}
                          {entry.sourceFileName && (
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{entry.category}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {SOURCE_LABELS[entry.source]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeKnowledgeEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-0.5">
                        {PROFICIENCY_STARS.map(s => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= entry.proficiency
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 文件上传 Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                上传文件让 AI 分析
              </CardTitle>
              <CardDescription>
                支持 .txt、.md、.json、.docx、.xlsx 文件。AI 会自动提炼知识要点并生成记忆条目。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 上传区域 */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={e => {
                  e.preventDefault();
                  const dt = e.dataTransfer;
                  if (dt.files.length) {
                    const input = fileInputRef.current;
                    if (input) {
                      const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
                      handleFileSelect(fakeEvent);
                    }
                  }
                }}
              >
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 .txt .md .json .docx .xlsx
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.docx,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在读取文件...
                </div>
              )}

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              {/* 待分析的文件列表 */}
              {filesToAnalyze.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2">
                    待分析文件 ({filesToAnalyze.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filesToAnalyze.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{item.file.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.text.length} 字符
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setFilesToAnalyze(filesToAnalyze.filter((_, j) => j !== i));
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 分析结果 */}
              {analyzeResults.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-green-600">
                    AI 分析结果 ({analyzeResults.length})
                  </h4>
                  <div className="space-y-3">
                    {analyzeResults.map((result, i) => (
                      <Card key={i}>
                        <CardContent className="py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="font-medium">{result.title}</span>
                            <Badge variant="outline" className="text-xs">{result.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{result.content}</p>
                          <div className="flex gap-0.5 mt-2">
                            {PROFICIENCY_STARS.map(s => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= result.proficiency
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              {filesToAnalyze.length > 0 && analyzeResults.length === 0 && (
                <Button
                  onClick={handleAnalyzeFiles}
                  disabled={analyzing}
                  className="w-full gap-2"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI 正在分析...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI 分析这些文件
                    </>
                  )}
                </Button>
              )}

              {analyzeResults.length > 0 && (
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClearFiles}>
                    放弃
                  </Button>
                  <Button onClick={handleConfirmAnalysis} className="flex-1 gap-2">
                    <Plus className="h-4 w-4" />
                    确认并添加到知识库
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 编辑对话框 */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? '编辑记忆' : '添加记忆'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>标题</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>内容</Label>
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>分类</Label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-2 mt-1"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>熟练度</Label>
                <div className="flex items-center gap-2 mt-2">
                  {PROFICIENCY_STARS.map(s => (
                    <button
                      key={s}
                      onClick={() => setEditProficiency(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          s <= editProficiency
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEditor(false)}>取消</Button>
            <Button onClick={handleSave} disabled={!editTitle.trim()}>保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
