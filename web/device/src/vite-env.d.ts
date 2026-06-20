/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: "public" | "device";
  readonly VITE_AIRTABLE_FORM_URL?: string;
  readonly VITE_CALENDLY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
