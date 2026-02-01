/// <reference types="vite/client" />

declare module 'virtual:grid-manifest' {
  import type { ManifestItem } from '@metervara/grid-listing/vite-plugin';
  export type ManifestItemWithShort = ManifestItem & { short?: string };
  const manifest: { items: ManifestItemWithShort[] };
  export default manifest;
}
