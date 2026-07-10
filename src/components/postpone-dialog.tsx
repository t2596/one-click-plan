'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CalendarDays, ChevronRight } from 'lucide-react';
import { usePlanStore } from '@/lib/store';
import { formatDate, todayStr, shiftDate } from '@/lib/db';
import { toast } from 'sonner';

interface PostponeDialogProps {
  planId: string;
  planTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PostponeDialog({ planId, planTitle, open, onOpenChange }: PostponeDialogProps) {
  const [days, setDays] = useState(1);
  const [fromDate, setFromDate] = useState(todayStr());
  const { postponePlan, loadTodaySchedule, loadWeekSchedule } = usePlanStore();

  const handlePostpone = async () => {
    if (days <= 0) {
      toast.error('推迟天数必须大于0');
      return;
    }

    try {
      await postponePlan(planId, fromDate, days);
      await loadTodaySchedule();
      await loadWeekSchedule();
      toast.success(`「${planTitle}」已整体推迟 ${days} 天`);
      onOpenChange(false);
    } catch {
      toast.error('推迟失败，请重试');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            推迟计划
          </DialogTitle>
          <DialogDescription>
            将「{planTitle}」及后续未完成的任务统一向后推迟
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>从哪一天开始推迟</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>推迟天数</Label>
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDays(Math.max(1, days - 1))}
              >
                -
              </Button>
              <Input
                type="number"
                value={days}
                onChange={e => setDays(Math.max(1, Number(e.target.value)))}
                min={1}
                max={90}
                className="w-20 text-center"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDays(Math.min(90, days + 1))}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground ml-1">天</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
            <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
            <p className="text-muted-foreground">
              从 {fromDate} 起，该计划所有未完成的任务将向后推迟 {days} 天
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handlePostpone} className="gap-2">
            <ChevronRight className="h-4 w-4" />
            确认推迟
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
