<p align="center">
  <img src="public/icon-512.svg" width="120" alt="一键计划 Logo" />
</p>

<h1 align="center">一键计划</h1>

<p align="center">
  <strong>用 AI 一键生成学习计划，自动编排日程，智能间隔复习</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/shadcn%2Fui-latest-black?logo=shadcnui" alt="shadcn/ui" />
  <img src="https://img.shields.io/badge/Dexie.js-4-00BCD4" alt="Dexie.js" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

---

## 简介

**一键计划** 是一款面向学习者的智能计划管理工具。你只需告诉 AI 你的学习目标，它就会自动生成一个结构化的学习计划，并将任务按天填入日历。支持自定义每周学习日、AI 自主规划学习周期。内置 SM-2 间隔复习系统、Jupyter Notebook 风格 Markdown 笔记编辑器、统一任务详情页（计划-日程-笔记三位一体联动）、AI 学习记忆系统（支持上传文件自动提炼知识），以及计划删除级联清理功能。

所有数据存储在浏览器本地（IndexedDB），无需注册、无需服务器。支持 PWA 安装到桌面，离线可用。

## 核心功能

| 功能 | 说明 |
|------|------|
| **AI 一键生成计划** | 输入学习目标，可选自定义学习日（周几学）、AI 自主判断周期或手动指定时间 |
| **AI 迭代修改** | 对已生成的计划手动编辑或告诉 AI 修改要求，保留其他内容不动 |
| **每周学习日选择** | 创建计划时自由勾选周一～周日，AI 和本地降级均严格只在勾选日排任务 |
| **日历日程编排** | 周视图展示所有任务，点击直达任务详情页 |
| **间隔复习系统** | SM-2 算法驱动，复习评分自动调整下次间隔、浏览器通知提醒 |
| **Jupyter 风格笔记** | 单元格模式编辑器，Ctrl+Enter 渲染、点击编辑、支持图片粘贴/拖拽/上传 |
| **任务详情统一页** | 计划项目/日历/仪表盘三入口合一，关联笔记+日程+复习，笔记支持 tag 标签 |
| **计划删除级联** | 删除计划时自动清理关联的任务、日程、复习卡片、笔记和知识库条目 |
| **AI 学习记忆系统** | 计划自动纳入记忆；上传任意文件（.txt/.md/.docx/.xlsx）由 AI 分析提炼知识 |
| **多 AI 模型支持** | 兼容 OpenAI / 通义千问 / DeepSeek / 自定义接口，未配置 API Key 自动降级 |
| **数据导入导出** | JSON 格式完整备份（含知识库），一键导出/恢复 |
| **PWA 离线使用** | 可安装到桌面（独立窗口），静态资源 SW 缓存，数据存本地 IndexedDB，部署后无需本地终端 |

## 技术栈

- **框架**: React 19 + Next.js 16 (App Router)
- **样式**: Tailwind CSS v4 + shadcn/ui (Base UI)
- **状态管理**: Zustand
- **本地数据库**: Dexie.js (IndexedDB)
- **复习算法**: SM-2 (SuperMemo 2)
- **Markdown**: react-markdown + remark-gfm + 自研单元格编辑器
- **文件解析**: mammoth (Word) + xlsx (Excel)
- **通知**: Web Notification API

## 快速开始

```bash
# 克隆项目
git clone https://github.com/t2596/one-click-plan.git
cd one-click-plan

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 项目结构

```
src/
├── app/                      # Next.js App Router 页面
│   ├── layout.tsx            # 根布局（侧边栏 + 通知服务）
│   ├── page.tsx              # 仪表盘首页（今日日程点击到任务详情）
│   ├── plans/
│   │   ├── page.tsx          # 计划列表（支持删除）
│   │   ├── new/page.tsx      # AI 创建计划（学习日选择 + AI 自主规划）
│   │   └── [id]/page.tsx     # 计划详情（项目点击到任务详情）
│   ├── tasks/
│   │   └── [planItemId]/page.tsx  # 任务统一详情（日程+复习+笔记 tag 联动）
│   ├── calendar/page.tsx     # 日历视图（点击日程到任务详情）
│   ├── review/page.tsx       # 复习中心
│   ├── outputs/
│   │   ├── page.tsx          # 产出库列表（Markdown 预览卡片）
│   │   └── [id]/page.tsx     # Jupyter 风格全屏编辑器
│   ├── knowledge/page.tsx    # 知识库（记忆管理 + 文件上传 AI 分析）
│   └── settings/page.tsx     # 设置（AI/通知/复习/数据）
├── components/
│   ├── sidebar.tsx           # 侧边栏导航
│   ├── postpone-dialog.tsx   # 推迟计划对话框
│   ├── markdown-cells.tsx    # Jupyter Notebook 风格 MD 单元格编辑器
│   ├── notification-service.tsx  # 复习提醒通知
│   ├── pwa-register.tsx      # PWA Service Worker 注册（仅生产环境启用）
│   └── ui/                   # shadcn/ui 组件
└── lib/
    ├── types.ts              # TypeScript 类型定义
    ├── db.ts                 # Dexie.js 数据库 + CRUD（含知识库表）
    ├── store.ts              # Zustand 状态管理
    ├── review-engine.ts      # SM-2 间隔复习算法
    ├── ai-service.ts         # AI API 对接 + refinePlan + fileAnalysis
    └── file-parser.ts        # 文件解析（Word/Excel/文本）
```

## 使用指南

### 1. 创建计划

进入「AI 创建计划」页面，填写：

- **学习目标**：你想学什么（如"系统学习 React 前端开发"）
- **每周学习日**：勾选周几学习（如周一～周五），AI 只在勾选日安排任务
- **AI 自主规划**：开启后 AI 自动判断学习周期和每日时长，无需手动填写
- **手动模式**：关闭自主规划后可指定每天可用时间、起止日期
- **额外偏好**：可选，如"偏好早上学习，需要大量实践"

点击「生成学习计划」，AI 会按阶段拆分任务并安排到每一天。确认后任务自动填入日历。

### 2. 管理日程

在「日历视图」中查看每周的任务安排。点击任务卡片跳转到**任务详情页**，可查看关联笔记、复习状态。点击状态图标可快速切换完成/未完成。如需整体推迟，进入计划详情页点击「推迟计划」。

### 3. 间隔复习

学习内容完成后，系统会根据 SM-2 算法自动生成复习卡片。进入「复习中心」进行复习评分（0-5 分），算法会根据评分智能调整下次复习间隔。

### 4. 记录笔记

在「产出库」中使用 **Jupyter Notebook 风格编辑器**：
- **单元格模式**：每个段落是一个独立单元格，默认渲染预览
- **点击编辑**：点击任意单元格进入编辑，Ctrl+Enter 渲染并自动新建下一个单元格
- **图片支持**：支持 Ctrl+V 粘贴剪贴板图片、拖拽图片到编辑器、按钮选择本地文件
- **Tag 标签**：每个笔记支持添加标签，在任务详情页中可按任务查看关联笔记

笔记与计划项目（planItemId）自动绑定，在任务详情页可查看和管理该任务的所有产出。

### 5. 管理知识库

在「知识库」中管理系统记忆：

- **自动记忆**：每次创建计划，系统自动将计划内容纳入知识库
- **手动添加**：输入标题、内容、分类和熟练度
- **文件上传 AI 分析**：拖拽或上传学习文件（.txt/.md/.docx/.xlsx），AI 自动提炼知识要点
- **筛选浏览**：按分类、来源筛选，熟练度 1-5 星标记

AI 生成计划时会自动读取知识库，根据你已掌握的内容避免重复，从进阶内容开始制定计划。

## AI 模型配置

在「设置 > AI 设置」中配置 AI 模型：

| 提供商 | 模型示例 | 说明 |
|--------|----------|------|
| OpenAI | `gpt-4o` / `gpt-4o-mini` | 需要 OpenAI API Key |
| 通义千问 | `qwen-plus` | 阿里云 DashScope API Key |
| DeepSeek | `deepseek-chat` | DeepSeek API Key |
| 自定义 | 任意 | 兼容 OpenAI 接口格式即可 |

> **支持多模型**：已内置 OpenAI / 通义千问 / DeepSeek 的 API 对接，也支持自定义兼容 OpenAI 接口的服务。未配置 API Key 时会自动降级为本地模拟生成，不影响使用。

## 部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器（本地测试 PWA）
npm run start
```

推荐部署到 [Vercel](https://vercel.com)（零配置，Next.js 官方平台）：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/t2596/one-click-plan)

> **安全性说明**：Vercel 仅托管前端静态文件（HTML/JS/CSS），你的所有数据（计划、笔记、日程、复习卡片、AI Key）均存储在浏览器本地 IndexedDB，不会上传到任何服务器。
>
> 部署后访问 `xxx.vercel.app` 安装 PWA 到桌面即可日常使用，无需本地终端。

## License

MIT
