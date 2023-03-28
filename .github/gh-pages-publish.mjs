import shell from "shelljs"
import url from "url"
import pkg from '../package.json' assert { type: 'json' }

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
let repository = (parsedUrl.host || "") + ":" + (parsedUrl.path?.slice(1) || "")

shell.echo("---Deploying docs---")
shell.cd("docs")
shell.exec("git init")
shell.exec("git add .")
shell.exec('git commit -m "(docs) update gh-pages"')
shell.exec(
  `git push --force --quiet "git@${repository}" master:gh-pages`
)
shell.echo("---Docs deployed---")