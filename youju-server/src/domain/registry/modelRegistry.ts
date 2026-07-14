import type { ModelProvider } from '../types.js'

/**
 * 模型注册表 —— 单一数据源
 *
 * 所有模型列表、厂商预设均在此文件集中维护。
 * 前端通过 /api/v1/models/presets 和 /api/v1/models/options 动态拉取。
 * 新增模型只需修改此文件。
 */

export interface ProviderPreset {
  provider: ModelProvider
  label: string
  name: string
  baseURL: string
  defaultModel: string
}

export interface ModelOption {
  value: string
  label: string
  provider?: ModelProvider
}

/** 厂商预设（含 baseURL 和默认模型），用于前端模型设置面板自动填充 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    provider: 'openai',
    label: 'OpenAI',
    name: 'OpenAI GPT-5.5',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.5',
  },
  {
    provider: 'anthropic',
    label: 'Anthropic',
    name: 'Anthropic Claude',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-5',
  },
  {
    provider: 'gemini',
    label: 'Google Gemini',
    name: 'Gemini 3.5 Flash',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-3.5-flash',
  },
  {
    provider: 'deepseek',
    label: 'DeepSeek',
    name: 'DeepSeek V4',
    baseURL: 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
  },
  {
    provider: 'zhipu',
    label: '智谱 AI',
    name: '智谱 GLM-5.2',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-5.2',
  },
  {
    provider: 'moonshot',
    label: 'Moonshot (Kimi)',
    name: 'Kimi K2.5',
    baseURL: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
  },
  {
    provider: 'qwen',
    label: '通义千问',
    name: '通义千问 Qwen3.6',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen3.6-max-preview',
  },
  {
    provider: 'volcengine',
    label: '火山引擎 (豆包)',
    name: '豆包 Seed 1.6',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    defaultModel: 'doubao-seed-1-6-251015',
  },
  {
    provider: 'qianfan',
    label: '百度千帆 (文心)',
    name: '文心 ERNIE 4.5',
    baseURL: 'https://qianfan.baidubce.com/v2',
    defaultModel: 'ernie-4.5-turbo-128k',
  },
  {
    provider: 'yi',
    label: '零一万物 (Yi)',
    name: '零一万物 Yi-Light',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    defaultModel: 'yi-light',
  },
  {
    provider: 'spark',
    label: '讯飞星火',
    name: '讯飞星火 4.0 Ultra',
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    defaultModel: '4.0Ultra',
  },
  {
    provider: 'openrouter',
    label: 'OpenRouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-5',
  },
  {
    provider: 'agnes',
    label: 'Agnes AI',
    name: 'Agnes 2.0 Flash',
    baseURL: 'https://apihub.agnes-ai.com/v1',
    defaultModel: 'agnes-2.0-flash',
  },
  { provider: 'custom', label: '自定义', name: '', baseURL: '', defaultModel: '' },
]

/** 分析模型下拉选项，用于前端偏好设置的分析模型选择 */
export const ANALYSIS_MODEL_OPTIONS: ModelOption[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5 (推荐，旗舰)', provider: 'openai' },
  { value: 'gpt-5.4', label: 'GPT-5.4', provider: 'openai' },
  { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'claude-fable-5', label: 'Claude Fable 5 (最强)', provider: 'anthropic' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8', provider: 'anthropic' },
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 (推荐)', provider: 'anthropic' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (最快)', provider: 'anthropic' },
  { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash (推荐，最新)', provider: 'gemini' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (预览版)', provider: 'gemini' },
  { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite', provider: 'gemini' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (预览版)', provider: 'gemini' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },
  { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', provider: 'deepseek' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', provider: 'deepseek' },
  { value: 'doubao-seed-1-6-251015', label: '豆包 Seed 1.6 (最新版)', provider: 'volcengine' },
  { value: 'doubao-seed-1-6-250615', label: '豆包 Seed 1.6 (250615)', provider: 'volcengine' },
  { value: 'doubao-seed-1-6-flash-250828', label: '豆包 Seed 1.6 Flash', provider: 'volcengine' },
  { value: 'doubao-seed-1-6-vision-250815', label: '豆包 Seed 1.6 Vision', provider: 'volcengine' },
  { value: 'ernie-4.5-turbo-128k', label: '文心 ERNIE 4.5 Turbo 128K (推荐)', provider: 'qianfan' },
  { value: 'ernie-4.5-turbo-32k', label: '文心 ERNIE 4.5 Turbo 32K', provider: 'qianfan' },
  { value: 'ernie-4.5-8k', label: '文心 ERNIE 4.5 8K', provider: 'qianfan' },
  { value: 'glm-5.2', label: '智谱 GLM-5.2 (最新开源)', provider: 'zhipu' },
  { value: 'kimi-k2.5', label: 'Kimi K2.5 (推荐)', provider: 'moonshot' },
  { value: 'kimi-k2-turbo-preview', label: 'Kimi K2 Turbo', provider: 'moonshot' },
  { value: 'kimi-k2-thinking-preview', label: 'Kimi K2 Thinking', provider: 'moonshot' },
  { value: 'qwen3.6-max-preview', label: '通义千问 Qwen3.6-Max', provider: 'qwen' },
  { value: 'qwen3.6-plus', label: '通义千问 Qwen3.6-Plus', provider: 'qwen' },
  { value: 'qwen3.6-flash', label: '通义千问 Qwen3.6-Flash', provider: 'qwen' },
  { value: 'yi-light', label: '零一万物 Yi-Light', provider: 'yi' },
  { value: 'yi-large', label: '零一万物 Yi-Large', provider: 'yi' },
  { value: '4.0Ultra', label: '讯飞星火 4.0 Ultra (推荐)', provider: 'spark' },
  { value: 'generalv3.5', label: '讯飞星火 Max', provider: 'spark' },
  { value: 'lite', label: '讯飞星火 Lite (免费)', provider: 'spark' },
]

/** Anthropic 模型兜底列表（listModels 接口对 Anthropic 厂商使用静态列表） */
export const ANTHROPIC_FALLBACK_MODELS: Array<{ id: string; name?: string }> = [
  { id: 'claude-fable-5', name: 'Claude Fable 5' },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
]

/** Gemini 模型兜底列表 */
export const GEMINI_FALLBACK_MODELS: Array<{ id: string; name?: string }> = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
]
