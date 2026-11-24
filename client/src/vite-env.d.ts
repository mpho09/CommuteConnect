/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false" switches to the real API client (not built yet, see #34). Defaults to mocks. */
  readonly VITE_USE_MOCKS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
