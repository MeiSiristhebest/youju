# 有据 - 使用说明

## 项目结构

```
youju/
├── youju-app/      # 前端 (React + Vite)
├── youju-server/   # 后端 (Express + TypeScript)
├── PRD.md          # 产品需求文档
└── CONTEXT.md      # 领域术语表
```

## 快速开始

### 1. 启动后端服务

```bash
cd youju-server
npm install
npm run dev
```

后端默认运行在 http://localhost:3001

### 2. 启动前端

```bash
cd youju-app
npm install
npm run dev
```

前端默认运行在 http://localhost:5173

### 3. 配置真实 AI（可选）

编辑 `youju-server/.env`：

```env
AI_API_KEY=你的API密钥
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-3.5-turbo
```

配置后，分析和话术生成将使用真实 AI。未配置时使用内置规则模拟。

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sources/text | 添加文本材料 |
| POST | /api/sources/upload | 上传文件材料 |
| POST | /api/sources/url | 抓取网页内容 |
| GET | /api/sources | 获取材料列表 |
| DELETE | /api/sources/:id | 删除材料 |
| POST | /api/analyze | AI 分析材料 |
| POST | /api/draft | 生成确认话术 |
| GET | /api/health | 健康检查 |

## 支持的材料类型

- 💬 **聊天记录** - 粘贴聊天文字
- 📄 **文档** - 上传 TXT/PDF 文件
- 🌐 **网页** - 输入 URL 自动抓取
- 🖼 **截图** - OCR 识别（待实现）
- 📝 **合同** - 合同文本

## 风险类型

- 🔴 **直接矛盾** - 不同材料信息冲突
- 🟡 **承诺未落文字** - 口头承诺但正式文件没写
- 🔵 **信息提示** - 分析说明
