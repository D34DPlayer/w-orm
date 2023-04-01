const url = require('node:url')
const pkg = require('./package.json')

let repoUrl
if (typeof pkg.repository === 'object') {
  if (!Object.prototype.hasOwnProperty.call(pkg.repository, 'url'))
    throw new Error('URL does not exist in repository section')

  repoUrl = pkg.repository.url
}
else {
  repoUrl = pkg.repository
}

const parsedUrl = url.parse(repoUrl)
const repository = `https://${parsedUrl.host || ''}${parsedUrl.path || ''}`
const author = pkg.author?.url

/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  entryPoints: ['./src/index.ts', './src/types.ts'],
  out: 'docs',
  navigationLinks: {
    'Source code': repository,
  },
  includeVersion: true,
  plugin: ['typedoc-theme-yaf'],
  theme: 'yaf',
  externalPattern: ['**/node_modules/**'],
  excludeExternals: true,
  excludeInternal: true,
}

if (author)
  module.exports.navigationLinks.Author = author
