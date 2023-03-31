import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'

import pkg from './package.json' assert { type: 'json' }

/* @type {import('rollup').RollupOptions} */
export default {
  input: 'src/index.ts',
  output: [
    { file: pkg.main, name: pkg.name, format: 'umd', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    json(),
    typescript({ declaration: true, declarationDir: 'types', module: 'ESNext' }),
    commonjs(),
    resolve(),
  ],
}
