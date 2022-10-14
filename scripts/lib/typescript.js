import { join as joinPaths, relative as relativizePath } from 'path'
import { lstat, mkdir, readFile, writeFile } from 'fs/promises'
import { queryPkgDirMap, queryPkgJson, writePkgJson } from './monorepo-struct.js'

export async function ensureTsMeta(monorepoDir, subdir = '') {
  const pkgDirMap = await queryPkgDirMap(monorepoDir)
  const promiseMap = {}
  const allRefDirs = []

  if (subdir) {
    await traversePkg(joinPaths(monorepoDir, subdir), pkgDirMap, promiseMap, allRefDirs)
  } else {
    await Promise.all(
      Object.keys(pkgDirMap).map((pkgName) => {
        const pkgDir = pkgDirMap[pkgName]
        return traversePkg(pkgDir, pkgDirMap, promiseMap, allRefDirs)
      }),
    )

    await writeTsConfig(monorepoDir, {
      files: [],
      references: formatReferences(monorepoDir, allRefDirs),
    })
  }
}

async function traversePkg(pkgDir, pkgDirMap, promiseMap, allRefDirs) {
  return promiseMap[pkgDir] || (promiseMap[pkgDir] = async () => {
    const pkgJsonObj = await queryPkgJson(pkgDir)

    if (pkgJsonObj.tsConfig) {
      const depPkgNames = extractPkgDepNames(pkgJsonObj)
      const refDirs = []

      await Promise.all(
        depPkgNames.map(async (depPkgName) => {
          const depPkgDir = pkgDirMap[depPkgName]

          if (depPkgDir && (await traversePkg(depPkgDir, pkgDirMap, promiseMap, allRefDirs))) {
            refDirs.push(depPkgDir)
          }
        }),
      )

      await ensureTsPkgMeta(pkgDir, pkgJsonObj, refDirs)
      allRefDirs.push(pkgDir)
      return true
    }

    return false
  })()
}

async function ensureTsPkgMeta(pkgDir, pkgJsonObj, refDirs) {
  const { tsConfig } = pkgJsonObj

  if (tsConfig) {
    const tsConfigFinal = {
      include: ['./src/**/*'],
      ...tsConfig,
      compilerOptions: {
        composite: true,
        declaration: true,
        declarationMap: true,
        rootDir: './src',
        outDir: './.tsout',
        tsBuildInfoFile: './.tsbuildinfo',
        ...tsConfig.compilerOptions,
      },
      references: formatReferences(pkgDir, refDirs),
    }

    await Promise.all([
      writeTsConfig(pkgDir, tsConfigFinal),
      ensureLinkedPublishJson(pkgDir, pkgJsonObj),
    ])
  }
}

function extractPkgDepNames(pkgJsonObj) {
  return Object.keys(pkgJsonObj.dependencies || {})
    .concat(Object.keys(pkgJsonObj.devDependencies || {}))
}

function formatReferences(pkgDir, refDirs) {
  refDirs = refDirs.slice().sort() // deterministic order

  return refDirs.map((absDir) => ({
    path: relativizePath(pkgDir, absDir),
  }))
}

async function writeTsConfig(pkgDir, tsConfigFinal) {
  const tsconfigPath = joinPaths(pkgDir, 'tsconfig.json')
  const tsconfigJson = JSON.stringify(tsConfigFinal, undefined, 2)

  const needsWrite = await readFile(tsconfigPath, 'utf8').then(
    (json) => json !== tsconfigJson, // different?
    () => true, // doesn't exist?
  )

  if (needsWrite) {
    await writeFile(tsconfigPath, tsconfigJson)
  }
}

async function ensureLinkedPublishJson(pkgDir, pkgJsonObj) {
  const publishConfig = pkgJsonObj.publishConfig || {}

  if (
    publishConfig.directory &&
    publishConfig.linkDirectory
  ) {
    const publishDir = joinPaths(pkgDir, publishConfig.directory)
    const jsonPath = joinPaths(publishDir, 'package.json')
    const exists = await lstat(jsonPath).then(
      () => true,
      () => false,
    )

    if (!exists) {
      await mkdir(publishDir, { recursive: true })
      await writePkgJson(publishDir, {
        name: pkgJsonObj.name,
        exports: {
          './package.json': './package.json',
          '.': { types: './.tsout/index.d.ts' }, // TODO: use config'd dir
          './*': { types: './.tsout/*.d.ts' }, // "
        },
      })
    }
  }
}