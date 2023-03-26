process.env.ESLINT_TSCONFIG = 'tsconfig.json'

module.exports = {
  extends: '@antfu',
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-console': 'warn',
  },
}
