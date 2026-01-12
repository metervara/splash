declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}

