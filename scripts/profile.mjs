/** Inspect or transact this plugin's profile membership through the selected Host CLI. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const root = fileURLToPath(new URL('../', import.meta.url))
const packageDir = path.join(root, 'packages', 'dsh-tool-model-catalog')
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
const [operation, flag] = process.argv.slice(2)
if (!['setup', 'inspect', 'remove'].includes(operation) || process.argv.length > 4
  || (flag !== undefined && flag !== '--check' && flag !== (operation === 'setup' ? '--install' : operation === 'remove' ? '--remove' : '--check'))) {
  throw new Error('Usage: node scripts/profile.mjs setup [--install] | inspect | remove [--remove]')
}
for (const key of ['DSH_CHECKOUT', 'DSH_HOME']) {
  if (!process.env[key] || !path.isAbsolute(process.env[key])) throw new Error(`Set ${key} to an absolute path`)
}
const profile = process.env.DSH_PROFILE
if (!profile || profile === '.' || profile === '..' || /[/\\]/.test(profile)) throw new Error('Set DSH_PROFILE to one profile name')
const checkout = process.env.DSH_CHECKOUT
if (!fs.existsSync(path.join(checkout, 'packages'))) throw new Error('DSH_CHECKOUT is not a Harness checkout')
const directory = path.join(process.env.DSH_HOME, 'profiles', profile)
const packageFile = path.join(directory, 'package.json')
function inspect() {
  const current = fs.existsSync(packageFile) ? JSON.parse(fs.readFileSync(packageFile, 'utf8')) : {}
  const specifier = current.dependencies?.[manifest.name]
  const bundles = current.dsh?.profile?.bundles ?? []
  const lockFile = path.join(directory, 'pnpm-lock.yaml')
  let lockEntry
  let lockError
  if (fs.existsSync(lockFile)) {
    try {
      const { load } = createRequire(path.join(checkout, 'apps/cli/package.json'))('js-yaml')
      lockEntry = load(fs.readFileSync(lockFile, 'utf8'))?.importers?.['.']?.dependencies?.[manifest.name]
    } catch (error) { lockError = error.message }
  }
  let lockedResolution
  if (typeof lockEntry?.version === 'string' && lockEntry.version.startsWith('link:')) {
    try { lockedResolution = fs.realpathSync(path.resolve(directory, lockEntry.version.slice(5))) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  let resolved
  try { resolved = fs.realpathSync(path.join(directory, 'node_modules', manifest.name)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const bundleCount = bundles.filter(name => name === manifest.name).length
  const lockMatches = typeof specifier === 'string' && lockEntry?.specifier === specifier
    && lockedResolution !== undefined && lockedResolution === resolved
  const status = specifier === undefined && lockEntry === undefined && lockError === undefined
    && resolved === undefined && bundleCount === 0 ? 'absent'
    : lockMatches && resolved === fs.realpathSync(packageDir) && bundleCount === 1 ? 'installed'
      : 'inconsistent'
  const result = {
    status,
    package: manifest.name, expected: packageDir, profile: directory,
    specifier: specifier ?? null, resolved: resolved ?? null,
    bundleCount,
    lockSpecifier: lockEntry?.specifier ?? null, lockVersion: lockEntry?.version ?? null,
    lockMatches, lockError: lockError ?? null,
  }
  console.log(JSON.stringify(result, null, 2))
  return result
}
const mutate = flag === '--install' || flag === '--remove'
if (mutate) {
  const cli = path.join(checkout, 'apps/cli/lib/bin.js')
  if (!fs.existsSync(cli)) throw new Error('Build the selected Host CLI before profile transactions')
  if (operation === 'setup' && manifest.main && !fs.existsSync(path.join(packageDir, manifest.main))) throw new Error('Run the plugin build before setup --install')
  const result = spawnSync(process.execPath, [cli, 'plugin', '--profile', profile,
    operation === 'setup' ? 'add' : 'remove', operation === 'setup' ? packageDir : manifest.name], {
    cwd: checkout, stdio: 'inherit', env: process.env,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const state = inspect()
if (mutate && operation === 'setup') {
  if (state.status !== 'installed') {
    throw new Error('Profile dependency, lockfile, resolution and Bundle do not agree with the selected package')
  }
} else if (mutate && state.status !== 'absent') {
  throw new Error('Removed plugin has inconsistent dependency, lockfile, resolution or Bundle state; inspect remaining consumers')
}
