import antfu from '@antfu/eslint-config'

// process.env.ESLINT_TSCONFIG = 'tsconfig.extended.json'

export default antfu({
  type: 'lib',
  ignores: [
    'dist',
    'node_modules',
    'docs',
    '*.md',
    'gh-pages',
  ],
}, {
  files: ['src/**/*.ts', 'test/**/*.ts'],
  rules: {
    'no-console': 'warn',
    // 'ts/no-inferrable-types': 'off',
    // 'unused-imports/no-unused-vars': 'off',
    // 'ts/require-await': 'off',
    'ts/consistent-type-definitions': ['error', 'type'],
    'ts/explicit-function-return-type': 'warn',
  },
}, {
  files: ['test/**/*.ts'],
  rules: {
    'ts/explicit-function-return-type': 'off',
    'unused-imports/no-unused-vars': 'off',
  },

})
