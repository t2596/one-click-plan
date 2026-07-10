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

**一键计划** 是一款面向学习者的智能计划管理工具。你只需告诉 AI 你的学习目标，它就会自动生成一个结构化的学习计划，并将任务按天填入日历。同时内置了基于 SM-2 算法的间隔复习系统、Markdown 笔记产出库，以及计划推迟级联联动功能。

所有数据存储在浏览器本地（IndexedDB），无需注册、无需服务器。支持 PWA 安装到桌面，离线可用。

## 核心功能

| 功能 | 说明 |
|------|------|
| **AI 一键生成计划** | 输入学习目标和可用时间，自动拆分阶段、按天安排任务 |
| **日历日程编排** | 周视图展示所有任务，支持点击切换完成状态 |
| **间隔复习系统** | SM-2 算法驱动，复习评分自动调整下次间隔 |
| **产出笔记库** | 每个计划可关联 Markdown 笔记，全局搜索 |
| **计划推迟联动** | 推迟一个任务，后续未完成的任务自动级联后移 |
| **多 AI 模型支持** | 兼容 OpenAI / 通义千问 / DeepSeek / 自定义接口 |
| **数据导入导出** | JSON 格式完整备份，一键导出/恢复 |
| **PWA 离线使用** | 可安装到桌面，支持浏览器通知提醒复习 |

## 技术栈

- **框架**: React 19 + Next.js 16 (App Router)
- **样式**: Tailwind CSS v4 + shadcn/ui (Base UI)
- **状态管理**: Zustand
- **本地数据库**: Dexie.js (IndexedDB)
- **复习算法**: SM-2 (SuperMemo 2)
- **Markdown**: react-markdown + remark-gfm
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
│   ├── page.tsx              # 仪表盘首页
│   ├── plans/
│   │   ├── page.tsx          # 计划列表
│   │   ├── new/page.tsx      # AI 创建计划
│   │   └── [id]/page.tsx     # 计划详情 + 推迟功能
│   ├── calendar/page.tsx     # 日历视图
│   ├── review/page.tsx       # 复习中心
│   ├── outputs/page.tsx      # 产出笔记库
│   └── settings/page.tsx     # 设置（AI/通知/复习/数据）
├── components/
│   ├── sidebar.tsx           # 侧边栏导航
│   ├── postpone-dialog.tsx   # 推迟计划对话框
│   ├── notification-service.tsx  # 复习提醒通知
│   └── ui/                   # shadcn/ui 组件
└── lib/
    ├── types.ts              # TypeScript 类型定义
    ├── db.ts                 # Dexie.js 数据库 + CRUD 操作
    ├── store.ts              # Zustand 状态管理
    └── review-engine.ts      # SM-2 间隔复习算法
```

## 使用指南

### 1. 创建计划

进入「AI 创建计划」页面，填写：

- **学习目标**：你想学什么（如"系统学习 React 前端开发"）
- **每天可用时间**：每天能投入多少小时
- **起止日期**：计划的开始和结束时间
- **额外偏好**：可选，如"偏好早上学习，需要大量实践"

点击「生成学习计划」，AI 会按阶段拆分任务并安排到每一天。确认后任务自动填入日历。

### 2. 管理日程

在「日历视图」中查看每周的任务安排。点击任务可切换完成/未完成状态。如需整体推迟，进入计划详情页点击「推迟计划」。

### 3. 间隔复习

学习内容完成后，系统会根据 SM-2 算法自动生成复习卡片。进入「复习中心」进行复习评分（0-5 分），算法会根据评分智能调整下次复习间隔。

### 4. 记录笔记

在「产出库」中创建和编辑 Markdown 笔记，支持全文搜索。也可以在每个计划的详情页查看关联的产出。

## AI 模型配置

在「设置 > AI 设置」中配置 AI 模型：

| 提供商 | 模型示例 | 说明 |
|--------|----------|------|
| OpenAI | `gpt-4o` / `gpt-4o-mini` | 需要 OpenAI API Key |
| 通义千问 | `qwen-plus` | 阿里云 DashScope API Key |
| DeepSeek | `deepseek-chat` | DeepSeek API Key |
| 自定义 | 任意 | 兼容 OpenAI 接口格式即可 |

> **当前状态**：AI 生成功能目前使用模板化模拟。接入真实 LLM API 只需将 `src/app/plans/new/page.tsx` 中 `handleGenerate` 的模拟逻辑替换为对 AI API 的调用。接口格式兼容 OpenAI Chat Completions。

## 部署

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

推荐部署到 [Vercel](https://vercel.com)（零配置）：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/t2596/one-click-plan)

## License

MIT
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
