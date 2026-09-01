import fs from 'node:fs'
import path from 'node:path'
import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function contentTypeFor (filePath) {
  if (filePath.endsWith('.css')) {
    return 'text/css; charset=utf-8'
  }
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8'
  }
  return 'application/octet-stream'
}

function copyDirectoryRecursive (sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true })

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath)
      continue
    }

    fs.copyFileSync(sourcePath, targetPath)
  }
}

export function supplementalThemesPlugin (options = {}) {
  const supplementalThemesDir = options.dir
    || path.resolve(__dirname, 'node_modules/picocrank/supplemental-themes')
  const publicSupplementalDir = path.resolve(__dirname, 'public/supplemental-themes')

  function syncPublicThemeAssets () {
    if (!fs.existsSync(supplementalThemesDir)) {
      return
    }

    copyDirectoryRecursive(supplementalThemesDir, publicSupplementalDir)
  }

  return {
    name: 'uar-supplemental-themes',
    buildStart () {
      syncPublicThemeAssets()
    },
    configureServer (server) {
      syncPublicThemeAssets()

      if (!fs.existsSync(supplementalThemesDir)) {
        return
      }

      server.middlewares.use('/supplemental-themes', (req, res, next) => {
        const requestPath = decodeURIComponent((req.url || '/').split('?')[0])
        const relativePath = requestPath.replace(/^\/+/, '')
        const filePath = path.resolve(supplementalThemesDir, relativePath)
        const resolvedRoot = path.resolve(supplementalThemesDir)

        if (!filePath.startsWith(resolvedRoot)) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        if (!existsSync(filePath)) {
          next()
          return
        }

        stat(filePath).then((fileStat) => {
          if (!fileStat.isFile()) {
            next()
            return
          }

          res.setHeader('Content-Type', contentTypeFor(filePath))
          createReadStream(filePath).pipe(res)
        }).catch(() => {
          next()
        })
      })
    },
    closeBundle () {
      if (!fs.existsSync(supplementalThemesDir)) {
        return
      }

      const outDir = path.resolve(__dirname, 'dist/supplemental-themes')
      copyDirectoryRecursive(supplementalThemesDir, outDir)
    }
  }
}
