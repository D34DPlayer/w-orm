import { resolve } from 'node:path'
import process from 'node:process'
import { checker } from 'vite-plugin-checker'

import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

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
            tsConfigFilePath: 'tsconfig.build.json',
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
      provider: 'istanbul', // or 'c8'
    },
  },
})
