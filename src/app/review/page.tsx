'use client';

import { useEffect, useState } from 'react';
import { usePlanStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress'; // Note: we'll create this
import { ScrollArea } from '@/components/ui/scroll-area';
import { sm2Calculate } from '@/lib/review-engine';
import { formatDate, todayStr } from '@/lib/db';
import type { ReviewScore, ReviewRecord } from '@/lib/types';
import { Brain, Star, CalendarDays, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const SCORE_LABELS: Record<ReviewScore, string> = {
  0: '完全忘记',
  1: '印象模糊',
  2: '稍有印象',
  3: '基本记得',
  4: '记得清楚',
  5: '完美回忆',
};

const SCORE_COLORS: Record<ReviewScore, string> = {
  0: 'bg-red-500',
  1: 'bg-orange-500',
  2: 'bg-yellow-500',
  3: 'bg-lime-500',
  4: 'bg-green-500',
  5: 'bg-emerald-500',
};

export default function ReviewPage() {
  const {
    dueReviews,
    upcomingReviews,
    planItems,
    plans,
    loadDueReviews,
    loadUpcomingReviews,
    loadPlanItems,
    loadPlans,
    editReviewCard,
    addReviewCard,
  } = usePlanStore();

  const [loading, setLoading] = useState(true);
  const [currentReview, setCurrentReview] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    async function init() {
      await Promise.all([
        loadDueReviews(),
        loadUpcomingReviews(),
        loadPlans(),
      ]);
      // Load plan items for all plans
      for (const plan of usePlanStore.getState().plans) {
        await loadPlanItems(plan.id);
      }
      setLoading(false);
    }
    init();
  }, [loadDueReviews, loadUpcomingReviews, loadPlanItems, loadPlans]);

  const handleRate = async (score: ReviewScore) => {
    if (currentReview >= dueReviews.length) return;

    const card = dueReviews[currentReview];
    const result = sm2Calculate(score, card.interval, card.easeFactor, card.reps);

    const reviewRecord: ReviewRecord = {
      date: todayStr(),
      score,
    };

    await editReviewCard(card.id, {
      interval: result.interval,
      easeFactor: result.easeFactor,
      reps: result.reps,
      nextReviewDate: result.nextReviewDate,
      status: 'completed',
      reviewHistory: [...card.reviewHistory, reviewRecord],
    });

    setShowAnswer(false);
    setCurrentReview(prev => prev + 1);

    if (currentReview + 1 >= dueReviews.length) {
      await loadDueReviews();
      await loadUpcomingReviews();
    }
  };

  const getPlanItemTitle = (planItemId: string) => {
    const item = planItems.find(i => i.id === planItemId);
    return item?.title || '未知项目';
  };

  const getPlanName = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    return plan?.title || '未知计划';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Review Mode
  if (dueReviews.length > 0 && currentReview < dueReviews.length) {
    const card = dueReviews[currentReview];

    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            复习中
          </h1>
          <p className="text-muted-foreground">
            第 {currentReview + 1} / {dueReviews.length} 项
          </p>
        </div>

        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentReview) / dueReviews.length) * 100}%` }}
            />
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{getPlanName(card.planId)}</Badge>
              <Badge variant="outline">第 {card.reps + 1} 次复习</Badge>
            </div>
            <CardTitle className="text-xl mt-2">{getPlanItemTitle(card.planItemId)}</CardTitle>
            <CardDescription>
              间隔 {card.interval} 天 · 上次复习: {card.reviewHistory.length > 0 ? card.reviewHistory[card.reviewHistory.length - 1].date : '首次'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showAnswer ? (
              <Button
                onClick={() => setShowAnswer(true)}
                className="w-full"
                size="lg"
              >
                回忆完成，查看评分
              </Button>
            ) : (
              <div>
                <p className="text-center text-muted-foreground mb-4">请评价你的回忆程度</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {([0, 1, 2, 3, 4, 5] as ReviewScore[]).map(score => (
                    <Button
                      key={score}
                      variant="outline"
                      className={`flex flex-col items-center p-3 h-auto w-20 hover:${SCORE_COLORS[score]} hover:text-white`}
                      onClick={() => handleRate(score)}
                    >
                      <Star className={`h-5 w-5 mb-1 ${score >= 4 ? 'text-yellow-400' : ''}`} />
                      <span className="text-xs">{score}</span>
                      <span className="text-[10px] text-muted-foreground">{SCORE_LABELS[score]}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overview Mode
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">复习中心</h1>
        <p className="text-muted-foreground mt-1">间隔复习，让知识更牢固</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-red-500" />
              今日待复习
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueReviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-500" />
              即将到来
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingReviews.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              总复习项
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[...dueReviews, ...upcomingReviews].length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="due">
        <TabsList>
          <TabsTrigger value="due">待复习 ({dueReviews.length})</TabsTrigger>
          <TabsTrigger value="upcoming">即将到来 ({upcomingReviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="mt-4">
          {dueReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                <p className="text-lg font-medium">没有待复习的内容</p>
                <p className="text-sm">干得漂亮!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dueReviews.map(card => (
                <Card key={card.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-red-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getPlanItemTitle(card.planItemId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getPlanName(card.planId)} · 第 {card.reps + 1} 次复习 · 间隔 {card.interval} 天
                        </p>
                      </div>
                      <Badge variant="destructive">待复习</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingReviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mb-2 opacity-50" />
                <p>暂无即将到来的复习</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {upcomingReviews.map(card => (
                <Card key={card.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getPlanItemTitle(card.planItemId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {getPlanName(card.planId)} · 下次复习: {card.nextReviewDate} · 间隔 {card.interval} 天
                        </p>
                      </div>
                      <Badge variant="secondary">{card.nextReviewDate}</Badge>
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
