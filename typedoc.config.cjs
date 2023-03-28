const pkg = require('./package.json')
const url = require('url')

let repoUrl
if (typeof pkg.repository === "object") {
  if (!pkg.repository.hasOwnProperty("url")) {
    throw new Error("URL does not exist in repository section")
  }
  repoUrl = pkg.repository.url
} else {
  repoUrl = pkg.repository
}

let parsedUrl = url.parse(repoUrl)
let repository = "https://" + (parsedUrl.host || "") + (parsedUrl.path || "")
let author = pkg.author?.url

/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
    entryPoints: ["./src/index.ts"],
    out: "docs",
    navigationLinks: {
        "Source code": repository,
    },
    includeVersion: true,
    plugin: ["typedoc-theme-yaf"],
	theme: "yaf",
    externalPattern: ["**/node_modules/**"],
	excludeExternals: true,
}

if (author) {
    module.exports.navigationLinks["Author"] = author
}
