'use client';

import { useEffect, useState } from 'react';
import { usePlanStore, useUIStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { todayStr, formatDate } from '@/lib/db';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function CalendarPage() {
  const { calendarView, selectedDate, setCalendarView, setSelectedDate } = useUIStore();
  const { weekSchedule, todaySchedule, loadWeekSchedule, loadTodaySchedule, editScheduleEntry, plans } = usePlanStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekSchedule(selectedDate);
    loadTodaySchedule();
    setLoading(false);
  }, [selectedDate, loadWeekSchedule, loadTodaySchedule]);

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

  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(formatDate(d));
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(formatDate(d));
  };

  const handleToday = () => {
    setSelectedDate(todayStr());
  };

  const getWeekDates = () => {
    const start = new Date(selectedDate);
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + mondayOffset);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return formatDate(d);
    });
  };

  const weekDates = getWeekDates();
  const today = todayStr();

  const handleToggleTask = async (entryId: string, isCompleted: boolean) => {
    await editScheduleEntry(entryId, {
      isCompleted: !isCompleted,
      status: !isCompleted ? 'completed' : 'pending',
      completedAt: !isCompleted ? new Date() : null,
    });
  };

  const getColorForPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.color || '#6366f1';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">日历视图</h1>
          <p className="text-muted-foreground mt-1">管理你的日程安排</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleToday}>今天</Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week View */}
      <Card>
        <CardContent className="pt-6">
          {/* Week Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDates.map((date, i) => {
              const d = new Date(date);
              const isToday = date === today;
              return (
                <div
                  key={date}
                  className={`text-center p-2 rounded-lg ${isToday ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  <div className="text-xs">{WEEKDAYS[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? '' : ''}`}>
                    {d.getDate()}
                  </div>
                  <div className="text-xs">{d.getMonth() + 1}月</div>
                </div>
              );
            })}
          </div>

          {/* Schedule Grid */}
          <div className="grid grid-cols-7 gap-1 min-h-[400px]">
            {weekDates.map(date => {
              const dayEntries = weekSchedule.filter(e => e.date === date);
              return (
                <div
                  key={date}
                  className={`border rounded-lg p-2 min-h-[100px] ${
                    date === today ? 'border-primary' : ''
                  }`}
                >
                  {dayEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="mb-1 p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: getColorForPlan(entry.planId) + '20',
                        borderLeft: `3px solid ${getColorForPlan(entry.planId)}`,
                      }}
                      onClick={() => handleToggleTask(entry.id, entry.isCompleted)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        {statusIcon(entry.status)}
                        <span className="text-muted-foreground">{entry.startTime}</span>
                      </div>
                      <p className={`font-medium truncate ${entry.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {entry.notes || '未命名任务'}
                      </p>
                    </div>
                  ))}
                  {dayEntries.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      空
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Detail */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            今日任务详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>今天没有安排任务</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {todaySchedule.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => handleToggleTask(task.id, task.isCompleted)}
                  >
                    {statusIcon(task.status)}
                    <div className="flex-1">
                      <p className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {task.notes || '未命名任务'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {task.startTime} - {task.endTime}
                      </p>
                    </div>
                    <Badge variant={task.isCompleted ? 'default' : 'outline'}>
                      {task.isCompleted ? '已完成' : task.status === 'in_progress' ? '进行中' : '待开始'}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
