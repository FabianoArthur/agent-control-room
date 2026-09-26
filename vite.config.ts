import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // React sets inline `style` attributes (progress bars), which needs 'unsafe-inline' for styles only.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

/** Adds the CSP to the production build only: the dev server relies on inline HMR scripts. */
const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
});

// `base: './'` keeps asset URLs relative, so the build works on GitHub Pages under
// /<repo>/ whatever the repository ends up being called.
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
