# EdgeOne Pages 部署指南

## 概述

本项目支持部署到 EdgeOne Pages Serverless 环境。由于 Serverless 函数执行完即结束的特性，传统的 `setInterval` 定时任务不可靠，需要使用 EdgeOne Pages 的 Cron Triggers 机制通过 HTTP 端点触发定时任务。

## 架构说明

### 传统部署 vs Serverless 部署

| 模式 | 定时任务实现 | 适用场景 |
|------|-------------|---------|
| 传统部署 | `setInterval` 进程内定时器 | 本地开发、传统服务器、容器长期运行 |
| Serverless 部署 | Cron Triggers + HTTP 端点 | EdgeOne Pages、云函数等 Serverless 环境 |

### 关键文件

- **任务处理器**: `src/infrastructure/cronHandlers.ts` - 可独立调用的任务处理函数
- **HTTP 端点**: `src/presentation/routes/cron.ts` - 受密钥保护的 Cron 触发端点
- **Cron 配置**: `edgeone/cron/jobs.json` - Cron 任务定义
- **传统定时器**: `src/infrastructure/backgroundJobs.ts` - 本地开发用的 setInterval 实现

## Cron 任务配置

### 任务列表

| 任务名称 | 调度时间 (Cron) | 端点 | 说明 |
|---------|----------------|------|------|
| time-decay | `0 0 * * *` (每天 00:00) | `POST /api/cron/time-decay` | 场景知识权重时间衰减 |
| daily-backup | `0 1 * * *` (每天 01:00) | `POST /api/cron/backup/daily` | 每日数据库备份 + 轮转 |
| backup-rotate | `0 2 * * *` (每天 02:00) | `POST /api/cron/backup/rotate` | 备份文件轮转清理 |
| weekly-cleanup | `0 3 * * 0` (每周日 03:00) | `POST /api/cron/cleanup` | 低质量知识清理 + 频率重算 |
| weekly-backup | `0 4 * * 0` (每周日 04:00) | `POST /api/cron/backup/weekly` | 每周数据库备份 + 轮转 |

### Cron 表达式格式

标准 5 字段 Cron 表达式：
```
┌───────────── 分钟 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日期 (1 - 31)
│ │ │ ┌───────────── 月份 (1 - 12)
│ │ │ │ ┌───────────── 星期 (0 - 6，周日=0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

## 环境变量配置

### 必须配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `CRON_SECRET` | Cron 任务访问密钥，用于验证请求合法性 | `your-secret-key-here` |

### 建议配置

| 变量名 | 说明 | 推荐值 |
|--------|------|--------|
| `ENABLE_BACKGROUND_JOBS` | 禁用传统 setInterval 定时任务 | `false` |

### 配置方式

在 EdgeOne Pages 控制台的「环境变量」中添加上述变量。

## 安全机制

所有 Cron HTTP 端点都通过 `x-cron-secret` 请求头进行身份验证：

1. 服务器端读取 `CRON_SECRET` 环境变量
2. Cron 触发器在请求头中携带 `x-cron-secret: <CRON_SECRET>`
3. 端点验证密钥是否匹配，不匹配则返回 401

**注意**：请使用足够复杂的随机字符串作为密钥，避免被猜测。

## 手动触发测试

### 使用 curl 测试

```bash
# 测试时间衰减
curl -X POST https://your-domain.com/api/cron/time-decay \
  -H "x-cron-secret: your-cron-secret"

# 测试数据清理
curl -X POST https://your-domain.com/api/cron/cleanup \
  -H "x-cron-secret: your-cron-secret"

# 测试每日备份
curl -X POST https://your-domain.com/api/cron/backup/daily \
  -H "x-cron-secret: your-cron-secret"

# 测试每周备份
curl -X POST https://your-domain.com/api/cron/backup/weekly \
  -H "x-cron-secret: your-cron-secret"

# 测试备份轮转
curl -X POST https://your-domain.com/api/cron/backup/rotate \
  -H "x-cron-secret: your-cron-secret"
```

### 本地开发测试

本地开发时可以继续使用传统的 `setInterval` 方式（默认启用），也可以通过 HTTP 端点测试：

```bash
# 启动开发服务器
pnpm dev

# 设置 CRON_SECRET 环境变量（在 .env 文件中）
CRON_SECRET=test-secret-123

# 本地测试
curl -X POST http://localhost:3001/api/cron/time-decay \
  -H "x-cron-secret: test-secret-123"
```

## 部署步骤

1. **配置环境变量**
   - 在 EdgeOne Pages 控制台添加 `CRON_SECRET`
   - 添加 `ENABLE_BACKGROUND_JOBS=false`（推荐）

2. **配置 Cron 触发器**
   - 参考 `edgeone/cron/jobs.json` 中的任务定义
   - 在 EdgeOne Pages 控制台的「Cron 触发器」中逐一配置
   - 确保每个任务都设置正确的 `x-cron-secret` 请求头

3. **部署应用**
   - 提交代码到仓库
   - 触发 EdgeOne Pages 部署

4. **验证部署**
   - 使用 curl 手动触发每个 Cron 任务
   - 检查返回结果是否为 `success: true`
   - 查看应用日志确认任务执行成功

## 监控与排错

### 查看执行结果

每个 Cron 端点返回统一格式的响应：

```json
{
  "code": 200,
  "data": {
    "success": true,
    "message": "时间衰减执行成功",
    "details": {
      "durationMs": 123
    }
  }
}
```

### 常见问题

**1. 端点返回 401 Unauthorized**
- 检查 `CRON_SECRET` 环境变量是否正确配置
- 确认请求头 `x-cron-secret` 的值与环境变量一致

**2. 端点返回 500 Internal Server Error**
- 查看应用日志获取详细错误信息
- 检查数据库连接是否正常
- 检查磁盘空间是否充足（备份相关任务）

**3. Cron 任务未执行**
- 确认 Cron 触发器配置正确
- 检查 Cron 表达式格式
- 确认部署的域名和路径正确

## 任务处理器 API

### handleTimeDecay()

执行场景知识权重时间衰减。

### handleCleanup()

执行低质量知识清理和加权频率重算。

### handleDailyBackup()

执行每日数据库备份并轮转。

### handleWeeklyBackup()

执行每周数据库备份并轮转。

### handleRotateBackups()

执行备份文件轮转清理。

所有处理器都返回 `Promise<{ success: boolean; message: string; details?: unknown }>`，内部捕获所有异常，不会抛出错误。
