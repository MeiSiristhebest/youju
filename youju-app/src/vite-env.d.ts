/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_CHAT?: boolean
  readonly VITE_LANGFUSE_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
