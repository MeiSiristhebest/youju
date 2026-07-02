# EdgeOne Pages 部署指南

本文档说明如何将 youju-app 前端项目部署到腾讯云 EdgeOne Pages。

## 目录

- [项目配置](#项目配置)
- [部署方式](#部署方式)
  - [方式一：通过 EdgeOne 控制台部署](#方式一通过-edgeone-控制台部署)
  - [方式二：通过 EdgeOne CLI 部署（可选）](#方式二通过-edgeone-cli-部署可选)
- [环境变量配置](#环境变量配置)
- [SPA 路由配置](#spa-路由配置)
- [缓存策略](#缓存策略)
- [自定义域名绑定](#自定义域名绑定)
- [常见问题排查](#常见问题排查)

## 项目配置

### 构建配置

| 配置项 | 值 | 说明 |
|-------|-----|------|
| 构建命令 | `pnpm build` | 先执行 TypeScript 类型检查，再执行 Vite 构建 |
| 输出目录 | `dist` | Vite 默认输出目录 |
| 框架 | Vite + React 19 | 前端技术栈 |
| 包管理器 | pnpm | 推荐使用 pnpm |

### 配置文件

- `edgeone/pages.config.json` - EdgeOne Pages 部署配置参考
- `public/_redirects` - SPA 路由重定向规则（兼容格式）
- `public/_headers` - HTTP 响应头配置（兼容格式）
- `.env.example` - 环境变量示例

## 部署方式

### 方式一：通过 EdgeOne 控制台部署

#### 前置条件

1. 已注册腾讯云账号并开通 EdgeOne 服务
2. 已将代码推送到 Git 仓库（GitHub / GitLab / Gitee 等）

#### 部署步骤

1. **登录 EdgeOne 控制台**
   - 访问 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone)

2. **创建 Pages 项目**
   - 进入「Pages」页面
   - 点击「新建项目」
   - 选择「Git 仓库」方式
   - 授权并选择 youju-app 所在仓库

3. **配置构建参数**
   - **项目名称**：`youju-app`（自定义）
   - **生产分支**：`main` 或 `master`
   - **构建命令**：`pnpm build`
   - **输出目录**：`dist`
   - **根目录**：`youju-app`（如果是 monorepo，填写子目录路径）

4. **配置环境变量**
   在「环境变量」设置中添加：

   | 变量名 | 值 | 说明 |
   |-------|-----|------|
   | `VITE_API_BASE_URL` | `/api` | 后端 API 基础路径，同域部署保持 `/api` |

   > 如果后端部署在其他域名，将值改为完整 URL，如 `https://api.example.com`

5. **配置 SPA 路由（重要）**

   为了支持 React Router 的 history 模式，需要配置回退路由：

   **方式 A：使用 _redirects 文件（推荐）**

   项目的 `public/_redirects` 文件已包含以下规则，构建后会自动复制到 `dist` 目录：

   ```
   /*    /index.html   200
   ```

   EdgeOne Pages 会自动识别此文件并生效。

   **方式 B：在控制台配置**

   如果 _redirects 不生效，可在控制台手动配置：
   - 进入「 Pages 规则」或「路由」设置
   - 添加规则：路径 `/*`，目标 `/index.html`，状态码 200

6. **开始部署**
   - 点击「部署」按钮
   - 等待构建完成，查看部署日志

7. **访问验证**
   - 部署成功后，使用 EdgeOne 提供的默认域名访问
   - 测试各个路由页面是否正常访问

### 方式二：通过 EdgeOne CLI 部署（可选）

#### 安装 CLI

```bash
# 全局安装 EdgeOne CLI（如果可用）
npm install -g @edgeone/cli
```

#### 登录

```bash
eo login
```

#### 部署

```bash
# 在 youju-app 目录下执行
cd youju-app
eo deploy
```

> 注意：EdgeOne CLI 工具可能更新较快，请以[官方文档](https://cloud.tencent.com/document/product/1552)为准。

## 环境变量配置

### 必需变量

| 变量名 | 生产环境值 | 说明 |
|-------|-----------|------|
| `VITE_API_BASE_URL` | `/api` 或完整 URL | API 基础路径 |

### 同域部署（推荐）

如果后端也部署在 EdgeOne Functions 或同一域名下，保持默认值 `/api` 即可：

```
VITE_API_BASE_URL=/api
```

此时需要在 EdgeOne 中配置 API 路径代理，将 `/api/*` 转发到后端服务。

### 独立部署

如果后端部署在独立域名：

```
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 设置环境变量

**在 EdgeOne 控制台设置：**
1. 进入 Pages 项目 →「设置」→「环境变量」
2. 添加变量并保存
3. 重新触发部署生效

## SPA 路由配置

本项目使用 React Router 的 history 模式，需要配置服务器端回退路由。

### 已配置内容

项目已通过 `public/_redirects` 文件配置了 SPA 回退：

```
/*    /index.html   200
```

此规则确保所有路径（包括 `/share/:token` 等动态路由）都会返回 `index.html`，然后由前端路由处理。

### 验证 SPA 路由

部署完成后，测试以下路径：
- `/` - 首页
- `/workspace` - 工作台
- `/share/abc123` - 分享页面（动态路由）
- `/nonexistent` - 不存在的路径（应返回 404 页面或首页）

如果出现 404 错误，说明回退路由未生效，请检查配置。

## 缓存策略

项目已配置以下缓存策略（`public/_headers`）：

| 资源类型 | 缓存策略 | 说明 |
|---------|---------|------|
| `/assets/*` | `max-age=31536000, immutable` | 静态资源（JS/CSS/图片），文件名带 hash，永久缓存 |
| HTML 文件 | `max-age=0, must-revalidate` | HTML 文件每次重新验证 |
| `/favicon.svg` | `max-age=86400` | 网站图标，缓存 1 天 |
| `/icons.svg` | `max-age=86400` | 图标精灵图，缓存 1 天 |

这样的配置可以：
- 保证新版本发布后用户能立即获取到最新的 HTML
- 静态资源利用浏览器长期缓存，提升访问速度
- 文件名中的 hash 确保资源更新时缓存自动失效

## 自定义域名绑定

### 操作步骤

1. **添加域名**
   - 进入 Pages 项目 →「设置」→「域名」
   - 点击「添加自定义域名」
   - 输入你的域名，如 `app.yourdomain.com`

2. **配置 DNS**
   - 根据控制台提示，在你的 DNS 服务商添加 CNAME 记录
   - 将自定义域名指向 EdgeOne 提供的 Pages 域名

3. **HTTPS 证书**
   - EdgeOne 会自动申请免费 SSL 证书
   - 等待证书签发完成（通常几分钟）

4. **验证访问**
   - 使用自定义域名访问，确认页面正常加载

### 注意事项

- 确保域名已在 EdgeOne 接入（如果是主域名需要先接入 EdgeOne 加速）
- 子域名可以直接绑定到 Pages 项目

## 常见问题排查

### 1. 构建失败

**可能原因：**
- 环境变量缺失
- 依赖安装失败
- TypeScript 类型错误

**排查方法：**
1. 查看构建日志，定位具体错误
2. 确认环境变量是否正确配置
3. 本地执行 `pnpm build` 验证是否能正常构建

### 2. 页面白屏

**可能原因：**
- 静态资源路径错误
- JavaScript 执行报错
- API 请求失败

**排查方法：**
1. 打开浏览器开发者工具，查看 Console 报错
2. 检查 Network 面板，确认资源是否加载成功
3. 确认 `VITE_API_BASE_URL` 配置正确

### 3. SPA 路由刷新 404

**问题描述：** 直接访问子页面（如 `/workspace`）返回 404

**原因：** SPA 回退路由未配置

**解决方法：**
1. 确认 `public/_redirects` 文件存在且内容正确
2. 在 EdgeOne 控制台检查「路由规则」配置
3. 重新部署项目

### 4. API 请求失败

**可能原因：**
- API 地址配置错误
- 跨域问题
- 后端服务未正常运行

**排查方法：**
1. 检查 `VITE_API_BASE_URL` 环境变量
2. 查看 Network 面板中的 API 请求状态
3. 如果是跨域问题，确认后端 CORS 配置

### 5. 缓存导致不更新

**问题描述：** 发布新版本后，用户看到的还是旧版本

**解决方法：**
1. 确认 HTML 文件的缓存策略为 `must-revalidate`
2. 硬刷新浏览器（Ctrl+F5 / Cmd+Shift+R）
3. 在 EdgeOne 控制台手动刷新缓存

## 相关文档

- [EdgeOne Pages 官方文档](https://cloud.tencent.com/document/product/1552/80700)
- [EdgeOne Functions 文档](https://cloud.tencent.com/document/product/1552/80701)
- [Vite 官方文档](https://vitejs.dev/)
- [React Router 文档](https://reactrouter.com/)
