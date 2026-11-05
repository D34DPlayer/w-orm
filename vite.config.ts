/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import process from 'node:process'
import dts from 'unplugin-dts/vite'

import { checker } from 'vite-plugin-checker'
import { defineConfig } from 'vitest/config'

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es', 'umd'],
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
            outDirs: [
              'dist',
              { dir: 'dist', moduleFormat: 'esm' },
              { dir: 'dist', moduleFormat: 'cjs' },
            ],
            bundleTypes: true,
            tsconfigPath: 'tsconfig.build.json',
          }),
          checker({
            typescript: { tsconfigPath: 'tsconfig.build.json' },
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
    },
  },
})
