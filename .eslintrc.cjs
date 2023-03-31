process.env.ESLINT_TSCONFIG = 'tsconfig.extended.json'

module.exports = {
  extends: '@antfu',
  ignorePatterns: ['dist', 'node_modules', 'docs', '*.md'],
  rules: {
    'no-console': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    'unused-imports/no-unused-vars': 'off',
  },
}
