import { ScriptContext } from './utils/script-runner.js'
import { MonorepoStruct, PkgStruct, traverseMonorepoNoOrder  } from './utils/monorepo-struct.js'
import { writeDistPkgJson } from './pkg/json.js'

export default async function(this: ScriptContext, ...args: string[]) {
  const isDev = args.includes('--dev')

  await writeDistPkgJsons(this.monorepoStruct, isDev)
}

export function writeDistPkgJsons(monorepoStruct: MonorepoStruct, isDev = false) {
  return traverseMonorepoNoOrder(monorepoStruct, (pkgStruct: PkgStruct) => {
    return writeDistPkgJson(pkgStruct.pkgDir, pkgStruct.pkgJson, isDev)
  })
}
