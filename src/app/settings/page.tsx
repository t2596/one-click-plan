'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getSettings, updateSettings, db } from '@/lib/db';
import { toast } from 'sonner';
import type { AppSettings } from '@/lib/types';
import {
  Settings,
  Key,
  Bot,
  Bell,
  Brain,
  Database,
  Download,
  Upload,
  Trash2,
} from 'lucide-react';

const AI_PROVIDERS = [
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'tongyi', label: '通义千问' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'custom', label: '自定义' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const handleSave = async (updates: Partial<AppSettings>) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    await updateSettings(updates);
    setSettings(newSettings);
    toast.success('设置已保存');
  };

  const handleExport = async () => {
    try {
      const data = {
        plans: await db.plans.toArray(),
        planItems: await db.planItems.toArray(),
        scheduleEntries: await db.scheduleEntries.toArray(),
        reviewCards: await db.reviewCards.toArray(),
        planOutputs: await db.planOutputs.toArray(),
        knowledgeEntries: await db.knowledgeEntries.toArray(),
        settings: await getSettings(),
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `一键计划_备份_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('数据导出成功');
    } catch {
      toast.error('导出失败');
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.plans) await db.plans.bulkPut(data.plans);
        if (data.planItems) await db.planItems.bulkPut(data.planItems);
        if (data.scheduleEntries) await db.scheduleEntries.bulkPut(data.scheduleEntries);
        if (data.reviewCards) await db.reviewCards.bulkPut(data.reviewCards);
        if (data.planOutputs) await db.planOutputs.bulkPut(data.planOutputs);
        if (data.knowledgeEntries) await db.knowledgeEntries.bulkPut(data.knowledgeEntries);

        toast.success('数据导入成功，请刷新页面');
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast.error('导入失败：文件格式不正确');
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (!confirm('确定要清除所有数据吗？此操作不可撤销！')) return;
    await db.delete();
    toast.success('数据已清除，请刷新页面');
    setTimeout(() => window.location.reload(), 1500);
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">设置</h1>
        <p className="text-muted-foreground mt-1">配置 AI 模型、通知偏好和数据管理</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="mb-6">
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-4 w-4" /> AI 设置
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> 通知
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <Brain className="h-4 w-4" /> 复习
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" /> 数据
          </TabsTrigger>
        </TabsList>

        {/* AI Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI 模型配置
              </CardTitle>
              <CardDescription>配置用于生成学习计划的 AI 模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>AI 提供商</Label>
                <Select
                  value={settings.aiProvider}
                  onValueChange={v => handleSave({ aiProvider: v as AppSettings['aiProvider'] })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="输入你的 API Key"
                  value={settings.aiApiKey}
                  onChange={e => handleSave({ aiApiKey: e.target.value })}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>模型名称</Label>
                <Input
                  placeholder="如 gpt-4o, qwen-plus"
                  value={settings.aiModel}
                  onChange={e => handleSave({ aiModel: e.target.value })}
                  className="mt-2"
                />
              </div>

              {settings.aiProvider === 'custom' && (
                <div>
                  <Label>自定义 API Base URL</Label>
                  <Input
                    placeholder="https://api.example.com/v1"
                    value={settings.aiBaseUrl}
                    onChange={e => handleSave({ aiBaseUrl: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知偏好
              </CardTitle>
              <CardDescription>配置任务和复习提醒通知</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>启用通知</Label>
                  <p className="text-sm text-muted-foreground">开启浏览器通知提醒</p>
                </div>
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={v => handleSave({ notificationsEnabled: v })}
                />
              </div>

              <div>
                <Label>提前提醒时间 (分钟)</Label>
                <Input
                  type="number"
                  value={settings.notificationAdvanceMinutes}
                  onChange={e => handleSave({ notificationAdvanceMinutes: Number(e.target.value) })}
                  min={0}
                  max={120}
                  className="mt-2 w-32"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review */}
        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                复习默认设置
              </CardTitle>
              <CardDescription>新计划的默认复习策略</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>默认复习策略</Label>
                <Select
                  value={settings.defaultReviewStrategy}
                  onValueChange={v => handleSave({ defaultReviewStrategy: v as 'sm2' | 'fixed' })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm2">SM-2 算法 (智能间隔)</SelectItem>
                    <SelectItem value="fixed">固定间隔</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.defaultReviewStrategy === 'fixed' && (
                <div>
                  <Label>默认复习间隔 (天，逗号分隔)</Label>
                  <Input
                    value={settings.defaultReviewIntervals.join(', ')}
                    onChange={e => {
                      const intervals = e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
                      handleSave({ defaultReviewIntervals: intervals });
                    }}
                    className="mt-2"
                    placeholder="1, 3, 7, 15, 30"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data */}
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                数据管理
              </CardTitle>
              <CardDescription>导出、导入或清除应用数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">导出数据</p>
                  <p className="text-sm text-muted-foreground">将所有数据导出为 JSON 文件</p>
                </div>
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" /> 导出
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">导入数据</p>
                  <p className="text-sm text-muted-foreground">从 JSON 文件导入数据</p>
                </div>
                <Button variant="outline" onClick={handleImport} className="gap-2">
                  <Upload className="h-4 w-4" /> 导入
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border border-destructive/30 rounded-lg">
                <div>
                  <p className="font-medium text-destructive">清除所有数据</p>
                  <p className="text-sm text-muted-foreground">永久删除所有计划、日程和笔记</p>
                </div>
                <Button variant="destructive" onClick={handleClearData} className="gap-2">
                  <Trash2 className="h-4 w-4" /> 清除
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
