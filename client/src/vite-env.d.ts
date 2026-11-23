/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only: sign in as this role until real auth exists (commuter | operator | admin). */
  readonly VITE_DEV_ROLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
