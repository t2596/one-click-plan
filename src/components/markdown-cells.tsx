'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Code2,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';

export interface Cell {
  id: string;
  content: string;
  mode: 'edit' | 'preview';
}

interface MarkdownCellsProps {
  cells: Cell[];
  onChange: (cells: Cell[]) => void;
  onImagePaste?: (callback: (markdown: string) => void) => void;
}

// 存储分隔符（不暴露给用户）
const CELL_DELIMITER = '\n\n---\n\n';

/** 将原始 markdown 内容按分隔符拆成 cells */
export function contentToCells(content: string): Cell[] {
  if (!content.trim()) {
    return [{ id: crypto.randomUUID(), content: '', mode: 'edit' }];
  }
  const parts = content.split(CELL_DELIMITER);
  return parts.map(part => ({
    id: crypto.randomUUID(),
    content: part.trim(),
    mode: 'preview' as const,
  }));
}

/** 将 cells 合并为存储用的 markdown 字符串 */
export function cellsToContent(cells: Cell[]): string {
  return cells
    .map(c => c.content.trim())
    .filter(c => c.length > 0)
    .join(CELL_DELIMITER);
}

export default function MarkdownCells({ cells, onChange, onImagePaste }: MarkdownCellsProps) {
  const editRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // 自动聚焦到新创建的编辑 cell
  useEffect(() => {
    const editCells = cells.filter(c => c.mode === 'edit');
    if (editCells.length > 0) {
      const lastEdit = editCells[editCells.length - 1];
      const ta = editRefs.current.get(lastEdit.id);
      if (ta) {
        ta.focus();
        // 光标移到末尾
        ta.selectionStart = ta.value.length;
        ta.selectionEnd = ta.value.length;
      }
    }
  }, [cells]);

  const updateCell = useCallback((id: string, updates: Partial<Cell>) => {
    onChange(cells.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [cells, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, cell: Cell, idx: number) => {
    // Ctrl+Enter / Shift+Enter: 渲染当前 cell 并在下方插入新空 cell
    if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.key === 'Enter') {
      e.preventDefault();
      const updated = [...cells];
      updated[idx] = { ...cell, mode: 'preview' };
      // 如果是最后一个 cell 或者下面已经有 cell 了，追加一个空编辑 cell
      const nextIsEmpty = idx + 1 < cells.length && cells[idx + 1].content.trim() === '';
      if (!nextIsEmpty) {
        updated.splice(idx + 1, 0, {
          id: crypto.randomUUID(),
          content: '',
          mode: 'edit',
        });
      } else {
        // 跳到下一个空 cell 继续编辑
        updated[idx + 1] = { ...updated[idx + 1], mode: 'edit' };
      }
      onChange(updated);
      return;
    }

    // Escape: 切换回预览（取消编辑）
    if (e.key === 'Escape' && cell.mode === 'edit') {
      e.preventDefault();
      // 如果内容为空且不是唯一 cell，删除
      if (cell.content.trim() === '' && cells.length > 1) {
        onChange(cells.filter(c => c.id !== cell.id));
      } else {
        updateCell(cell.id, { mode: 'preview' });
      }
      return;
    }

    // Backspace on empty: 删除空 cell
    if (e.key === 'Backspace' && cell.content === '' && cell.mode === 'edit' && cells.length > 1) {
      e.preventDefault();
      onChange(cells.filter(c => c.id !== cell.id));
    }
  }, [cells, onChange, updateCell]);

  const handlePaste = useCallback((e: React.ClipboardEvent, cellId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const imgMd = `![粘贴图片](${dataUrl})`;
          updateCell(cellId, {
            content: cells.find(c => c.id === cellId)?.content + '\n' + imgMd,
          });
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, [cells, updateCell]);

  const addCellAfter = (idx: number) => {
    const updated = [...cells];
    updated.splice(idx + 1, 0, {
      id: crypto.randomUUID(),
      content: '',
      mode: 'edit' as const,
    });
    onChange(updated);
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return;
    onChange(cells.filter(c => c.id !== id));
  };

  const moveCell = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= cells.length) return;
    const updated = [...cells];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };

  const insertImage = (cellId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const imgMd = `![${file.name}](${dataUrl})`;
        updateCell(cellId, {
          content: cells.find(c => c.id === cellId)?.content + '\n' + imgMd,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // 只有编辑态 cell & 空 cell 才显示空状态提示
  const allInPreview = cells.every(c => c.mode === 'preview') && cells.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {cells.map((cell, idx) => (
        <div
          key={cell.id}
          className={`group relative rounded-lg border transition-colors ${
            cell.mode === 'edit'
              ? 'border-primary/50 ring-1 ring-primary/20 shadow-sm'
              : 'border-transparent hover:border-border'
          }`}
        >
          {/* 左侧操作栏 */}
          <div className="absolute -left-10 top-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => moveCell(idx, idx - 1)}
              disabled={idx === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => moveCell(idx, idx + 1)}
              disabled={idx === cells.length - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => addCellAfter(idx)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            {cells.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => deleteCell(cell.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 编辑模式 */}
          {cell.mode === 'edit' && (
            <div className="p-3">
              <Textarea
                ref={el => {
                  if (el) editRefs.current.set(cell.id, el);
                  else editRefs.current.delete(cell.id);
                }}
                value={cell.content}
                onChange={e => updateCell(cell.id, { content: e.target.value })}
                onKeyDown={e => handleKeyDown(e, cell, idx)}
                onPaste={e => handlePaste(e, cell.id)}
                placeholder="输入 Markdown 内容…（Ctrl+Enter 渲染）"
                className="min-h-[80px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm"
                rows={Math.max(3, cell.content.split('\n').length)}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Markdown 单元格 · Ctrl+Enter 渲染 · Esc 取消
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => insertImage(cell.id)}
                  >
                    <ImageIcon className="h-3 w-3" />
                    插入图片
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      updateCell(cell.id, { mode: 'preview' });
                    }}
                    disabled={cell.content.trim() === '' && cells.length === 1}
                  >
                    <Eye className="h-3 w-3" />
                    渲染
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 预览模式 */}
          {cell.mode === 'preview' && (
            <div
              className="p-4 cursor-text min-h-[40px]"
              onClick={() => updateCell(cell.id, { mode: 'edit' })}
              title="点击编辑"
            >
              {cell.content.trim() ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cell.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">空单元格，点击编辑</p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* 底部添加按钮 */}
      <button
        onClick={() => {
          onChange([...cells, { id: crypto.randomUUID(), content: '', mode: 'edit' }]);
        }}
        className="flex items-center justify-center gap-1 w-full py-3 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        添加单元格
      </button>
    </div>
  );
}
