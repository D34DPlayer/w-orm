import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

import dts from 'vite-plugin-dts'
import { checker } from 'vite-plugin-checker'
import terser from '@rollup/plugin-terser'

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  build: {
    lib: {
      formats: ['es', 'umd'],
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WORM',
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
      plugins: [terser()],
    },
  },
  plugins:
    process.env.VITEST
      ? []
      : [
          dts({
            outDir: 'dist/types',
          }),
          checker({
            // e.g. use TypeScript check
            typescript: true,
            eslint: {
              lintCommand: 'eslint .',
            },
          }),
        ],
  test: {
    setupFiles: ['./test/setup.ts'],
    // browser: {
    //   enabled: true,
    //   name: 'chrome', // browser name is required
    // },
    coverage: {
      provider: 'v8',
      include: 'src/**/*',
      all: false,
    },
  },
})
