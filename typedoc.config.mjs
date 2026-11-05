import url from 'node:url'
import pkg from './package.json' with { type: 'json' }

let repoUrl
if (typeof pkg.repository === 'object') {
  if (!Object.hasOwn(pkg.repository, 'url'))
    throw new Error('URL does not exist in repository section')

  repoUrl = pkg.repository.url
}
else {
  repoUrl = pkg.repository
}

const parsedUrl = new url.URL(repoUrl)
const repository = `https://${parsedUrl.host || ''}${parsedUrl.path || ''}`
const author = pkg.author?.url

/** @type {import('typedoc').TypeDocOptions} */
const config = {
  entryPoints: ['./src/index.ts', './src/types.ts', './src/errors.ts'],
  out: 'docs',
  
  navigationLinks: {
    'Source code': repository,
  },
  includeVersion: true,
  plugin: [
    '@shipgirl/typedoc-plugin-versions',
    'typedoc-rhineai-theme',
  ],
  externalPattern: ['**/node_modules/**'],
  excludeExternals: true,
  excludeInternal: true,
  versions: {
    makeRelativeLinks: true,
  },
}

if (author)
  config.navigationLinks.Author = author

export default config
