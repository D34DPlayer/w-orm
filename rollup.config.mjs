import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import cleanup from 'rollup-plugin-cleanup'
import terser from '@rollup/plugin-terser'

import pkg from './package.json' assert { type: 'json' }

/**
 * @param {boolean} minify
 * @returns {import('rollup').RollupOptions}
 */
function getConfig(minify) {
  let umdFile = pkg.main
  let esFile = pkg.module
  if (minify) {
    umdFile = umdFile.replace(/\.js$/, '.min.js')
    esFile = esFile.replace(/\.js$/, '.min.js')
  }

  return {
    input: 'src/index.ts',
    output: [
      { file: umdFile, name: pkg.name, format: 'umd', sourcemap: true },
      { file: esFile, format: 'es', sourcemap: true },
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
      minify ? terser() : cleanup({ extensions: ['js', 'ts'] }),
    ],
  }
}

export default [
  getConfig(false),
  getConfig(true),
]
