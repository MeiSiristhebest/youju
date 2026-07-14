param(
    [string]$Token = $env:EDGEONE_PAGES_API_TOKEN,
    [string]$FrontendProject = "youju-app",
    [string]$BackendProject = "youju-server",
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $RootDir "youju-app"
$BackendDir = Join-Path $RootDir "youju-server"

function Step {
    param([string]$Msg)
    Write-Host "`n==> $Msg" -ForegroundColor Cyan
}

function Success {
    param([string]$Msg)
    Write-Host "  ✅ $Msg" -ForegroundColor Green
}

function Fail {
    param([string]$Msg)
    Write-Host "  ❌ $Msg" -ForegroundColor Red
    exit 1
}

if (-not $Token) {
    Fail "请设置 EDGEONE_PAGES_API_TOKEN 环境变量，或使用 -Token 参数"
}

Step "检查依赖"
$null = Get-Command pnpm -ErrorAction SilentlyContinue
$null = Get-Command edgeone -ErrorAction SilentlyContinue
Success "pnpm 和 edgeone CLI 已就绪"

if (-not $SkipFrontend) {
    Step "构建前端"
    Set-Location $FrontendDir
    pnpm install --frozen-lockfile
    $env:VITE_API_BASE_URL = "/api"
    pnpm build
    Success "前端构建完成"

    Step "部署前端到 EdgeOne Pages"
    edgeone pages deploy dist -n $FrontendProject -t $Token
    Success "前端部署完成"
}

if (-not $SkipBackend) {
    Step "构建后端"
    Set-Location $BackendDir
    pnpm install --frozen-lockfile
    pnpm exec tsc -p tsconfig.edgeone.json

    $BuildDir = Join-Path $BackendDir "dist-edgeone"
    $NodeFunctionsDir = Join-Path $BuildDir "node-functions"
    $BundledDir = Join-Path $BuildDir "_bundled"
    $SrcNodeFunctionsDir = Join-Path $BuildDir "edgeone\node-functions"

    if (Test-Path $NodeFunctionsDir) { Remove-Item -Recurse -Force $NodeFunctionsDir }
    if (Test-Path $BundledDir) { Remove-Item -Recurse -Force $BundledDir }
    New-Item -ItemType Directory -Force $NodeFunctionsDir | Out-Null
    New-Item -ItemType Directory -Force $BundledDir | Out-Null

    $apiSource = Join-Path $SrcNodeFunctionsDir "api.js"
    $apiTmp = Join-Path $NodeFunctionsDir "api.tmp.js"
    Copy-Item $apiSource $apiTmp

    (Get-Content $apiTmp -Raw) -replace '\.\./\.\./src/', '../src/' | Set-Content $apiTmp -NoNewline

    pnpm exec esbuild $apiTmp --bundle --format=esm --platform=node --outfile="$BundledDir\api.bundled.js" `
        --external:express --external:cors --external:multer --external:jose --external:pino `
        --external:zod --external:ai --external:cheerio --external:officeparser --external:unpdf `
        --external:express-rate-limit --external:rate-limit-redis `
        --external:@ai-sdk/* --external:@neondatabase/serverless --external:better-sqlite3 --external:supertest

    Remove-Item $apiTmp -Force

    $betterSqlite3Shim = Join-Path (Join-Path $BuildDir "node_modules") "better-sqlite3"
    if (-not (Test-Path $betterSqlite3Shim)) {
        New-Item -ItemType Directory -Force $betterSqlite3Shim | Out-Null
    }
    Set-Content (Join-Path $betterSqlite3Shim "package.json") '{"name":"better-sqlite3","version":"0.0.0","main":"index.js","type":"module"}'
    Set-Content (Join-Path $betterSqlite3Shim "index.js") @'
class Database {
  constructor() { throw new Error("better-sqlite3 not available in EdgeOne") }
  prepare() { return { all: () => [], get: () => undefined, run: () => {}, } }
  exec() {}
  close() {}
}
export default Database;
'@

    $entryContent = @'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MODULE_PATH = path.resolve(__dirname, '../_bundled/api.bundled.js')

export async function onRequest(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequest(context)
}

export async function onRequestGet(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestGet(context)
}

export async function onRequestPost(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestPost(context)
}

export async function onRequestPut(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestPut(context)
}

export async function onRequestDelete(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestDelete(context)
}

export async function onRequestPatch(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestPatch(context)
}

export async function onRequestOptions(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestOptions(context)
}

export async function onRequestHead(context) {
  const mod = await import(MODULE_PATH)
  return mod.onRequestHead(context)
}
'@
    Set-Content (Join-Path $NodeFunctionsDir "api.js") $entryContent -NoNewline

    $configContent = @'
export default {
    name: 'youju-server',
    nodeFunctions: {
        runtime: 'nodejs18',
        timeout: 30,
        memory: 512,
    },
    routes: [
        {
            pattern: '/api/*',
            function: 'api',
        },
    ],
    env: [
        'DATABASE_URL',
        'AI_API_KEY',
        'AI_BASE_URL',
        'AI_MODEL',
        'AI_MAX_CONCURRENCY',
        'JWT_SECRET',
        'ANALYSIS_CACHE_TTL_MS',
        'ANALYSIS_CACHE_MAX_ENTRIES',
        'ENABLE_SCENARIO_PREHEAT',
        'ENABLE_BACKGROUND_JOBS',
        'EMBEDDING_API_KEY',
        'EMBEDDING_BASE_URL',
        'EMBEDDING_MODEL',
        'RERANKER_API_KEY',
        'RERANKER_BASE_URL',
        'RERANKER_MODEL',
        'VECTOR_SIMILARITY_THRESHOLD',
        'CHAT_MAX_TOKENS',
        'LANGFUSE_SECRET',
        'LANGFUSE_PUBLIC_KEY',
        'LANGFUSE_HOST',
        'DB_DRIVER',
        'CRON_SECRET',
        'URL_FETCH_ALLOWLIST',
        'URL_FETCH_DENYLIST',
    ],
};
'@
    Set-Content (Join-Path $BuildDir "edgeone.config.js") $configContent -NoNewline

    if (Test-Path (Join-Path $BuildDir "edgeone")) {
        Remove-Item -Recurse -Force (Join-Path $BuildDir "edgeone")
    }
    if (Test-Path (Join-Path $BuildDir "src")) {
        Remove-Item -Recurse -Force (Join-Path $BuildDir "src")
    }

    $pkgJson = Join-Path $BuildDir "package.json"
    if (-not (Test-Path $pkgJson)) {
        Set-Content $pkgJson '{"name":"youju-server","version":"1.0.0","type":"module","private":true}'
    }

    Success "后端构建完成"

    Step "部署后端到 EdgeOne"
    edgeone pages deploy $BuildDir -n $BackendProject -t $Token
    Success "后端部署完成"
}

Step "部署完成"
Write-Host "`n🎉 所有项目已部署到 EdgeOne！" -ForegroundColor Green
Write-Host "   请在 EdgeOne 控制台配置环境变量后访问应用。`n" -ForegroundColor Yellow
