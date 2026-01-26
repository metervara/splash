/// <reference types="vite/client" />

declare module 'virtual:grid-manifest' {
  import type { ManifestItem } from '@metervara/grid-listing/vite-plugin';
  const manifest: { items: ManifestItem[] };
  export default manifest;
}
