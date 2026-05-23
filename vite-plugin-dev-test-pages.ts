import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

/** Serves gitignored dev/pages at /dev/ — dev server only, never in production build. */
export function devTestPagesPlugin(rootDir: string): Plugin {
  const pagesDir = path.join(rootDir, 'dev', 'pages')

  return {
    name: 'dev-test-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/dev', (req, res, next) => {
        if (!fs.existsSync(pagesDir)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('dev/pages missing — run: node scripts/setup-dev-pages.mjs')
          return
        }

        let urlPath = req.url ?? '/'
        if (urlPath.includes('?')) urlPath = urlPath.split('?')[0]!
        if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
        if (urlPath.endsWith('/')) urlPath += 'index.html'

        const filePath = path.normalize(path.join(pagesDir, urlPath))
        if (!filePath.startsWith(pagesDir)) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          next()
          return
        }

        res.setHeader('Content-Type', MIME[path.extname(filePath)] ?? 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
  }
}
