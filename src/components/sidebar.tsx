'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Brain,
  FileText,
  Settings,
  Database,
  ChevronLeft,
  Plus,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/plans', label: '计划列表', icon: BookOpen },
  { href: '/calendar', label: '日历视图', icon: CalendarDays },
  { href: '/review', label: '复习中心', icon: Brain },
  { href: '/outputs', label: '产出库', icon: FileText },
  { href: '/knowledge', label: '知识库', icon: Database },
  { href: '/settings', label: '设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-3 border-b">
          {sidebarOpen && (
            <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>一键计划</span>
            </Link>
          )}
          {!sidebarOpen && (
            <Link href="/" className="mx-auto">
              <Sparkles className="h-5 w-5 text-primary" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn('h-8 w-8', !sidebarOpen && 'mx-auto')}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
          </Button>
        </div>

        {/* New Plan Button */}
        <div className="p-3">
          <Link href="/plans/new">
            <Button
              className={cn('w-full gap-2', !sidebarOpen && 'px-0')}
              size={sidebarOpen ? 'default' : 'icon'}
            >
              <Plus className="h-4 w-4" />
              {sidebarOpen && 'AI 创建计划'}
            </Button>
          </Link>
        </div>

        <Separator />

        {/* Nav Items */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3',
                      !sidebarOpen && 'justify-center px-0'
                    )}
                    size={sidebarOpen ? 'default' : 'icon'}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t">
          {sidebarOpen && (
            <p className="text-xs text-muted-foreground text-center">
              一键计划 v1.0
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
