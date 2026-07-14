/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_CHAT?: boolean
  readonly VITE_LANGFUSE_HOST?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_STREAM_TIMEOUT?: string
  readonly VITE_API_RETRIES?: string
  readonly VITE_API_RETRY_DELAY?: string
  readonly VITE_TOKEN_REFRESH_THRESHOLD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
