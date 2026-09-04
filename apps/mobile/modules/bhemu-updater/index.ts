// Re-export the native module. On web, it will be resolved to BhemuUpdaterModule.web.ts
// and on native platforms to BhemuUpdaterModule.ts
export { default } from './src/BhemuUpdaterModule';
export * from './src/BhemuUpdater.types';
