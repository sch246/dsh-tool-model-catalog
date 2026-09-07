/** Inspect or transact this plugin's profile membership through the selected Host CLI. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

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
  const lock = fs.existsSync(lockFile) ? fs.readFileSync(lockFile, 'utf8') : ''
  let resolved
  try { resolved = fs.realpathSync(path.join(directory, 'node_modules', manifest.name)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  const result = {
    package: manifest.name, expected: packageDir, profile: directory,
    specifier: specifier ?? null, resolved: resolved ?? null,
    bundleCount: bundles.filter(name => name === manifest.name).length,
    lockMatches: typeof specifier === 'string' && lock.includes(manifest.name) && lock.includes(specifier),
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
  if (!state.specifier || state.resolved !== fs.realpathSync(packageDir) || state.bundleCount !== 1 || !state.lockMatches) {
    throw new Error('Profile dependency, lockfile, resolution and Bundle do not agree with the selected package')
  }
} else if (mutate && (state.specifier !== null || state.bundleCount !== 0 || state.resolved !== null)) {
  throw new Error('Removed plugin still has a profile dependency, resolution or Bundle; inspect remaining consumers')
}
