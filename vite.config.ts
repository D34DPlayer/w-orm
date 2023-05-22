import { resolve } from 'node:path'
import { defineConfig } from 'vite'

import dts from 'vite-plugin-dts'
import { checker } from 'vite-plugin-checker'

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
  },
  plugins:
    process.env.VITEST
      ? []
      : [
          dts({
            outputDir: 'dist/types',
          }),
          checker({
            // e.g. use TypeScript check
            typescript: true,
            eslint: {
              lintCommand: 'eslint .',
            },
          }),
        ],
})
