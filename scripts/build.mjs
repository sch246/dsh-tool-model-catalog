/** Build this repository's plugin with local tools and explicit Host declarations. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const packageDir = path.join(root, 'packages', 'dsh-tool-model-catalog')
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'))
const check = process.argv[2] === '--check'
if (process.argv.length > 3 || (process.argv[2] !== undefined && !check)) throw new Error('Usage: node scripts/build.mjs [--check]')
const checkout = process.env.DSH_CHECKOUT
if (!checkout || !path.isAbsolute(checkout) || !fs.existsSync(path.join(checkout, 'packages'))) {
  throw new Error('Set DSH_CHECKOUT to an absolute Harness checkout with prepared Host declarations')
}
for (const file of manifest.files) {
  if (!file.startsWith('lib') && !fs.existsSync(path.join(packageDir, file))) throw new Error(`Missing package input: ${file}`)
}
if (!fs.existsSync(path.join(packageDir, 'tsconfig.json'))) {
  console.log(`${manifest.name}: Bundle and patch inputs verified; no compiled runtime`)
  process.exit(0)
}

function link(name, target, parent = path.join(root, 'node_modules')) {
  if (!fs.existsSync(target)) throw new Error(`Missing build dependency: ${target}`)
  const destination = path.join(parent, name)
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  let current
  try { current = fs.lstatSync(destination) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (current) {
    if (!current.isSymbolicLink()) throw new Error(`Refusing to replace non-symlink dependency: ${destination}`)
    if (fs.existsSync(destination) && fs.realpathSync(destination) === fs.realpathSync(target)) return
    fs.unlinkSync(destination)
  }
  fs.symlinkSync(target, destination, process.platform === 'win32' ? 'junction' : 'dir')
}
function linkPackage(directory) {
  const file = path.join(directory, 'package.json')
  if (!fs.existsSync(file)) return
  const { name } = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (name?.startsWith('@deepseek-ai/')) link(name, directory)
}
for (const group of fs.readdirSync(path.join(checkout, 'packages'), { withFileTypes: true })) {
  if (!group.isDirectory()) continue
  const directory = path.join(checkout, 'packages', group.name)
  for (const child of fs.readdirSync(directory, { withFileTypes: true })) {
    if (child.isDirectory()) linkPackage(path.join(directory, child.name))
  }
}
for (const child of fs.readdirSync(path.join(checkout, 'vendor'), { withFileTypes: true })) {
  if (child.isDirectory()) linkPackage(path.join(checkout, 'vendor', child.name))
}
if (fs.readFileSync(path.join(packageDir, 'tsconfig.json'), 'utf8').includes('./harness/')) link('harness', checkout, packageDir)
const dependencies = path.join(root, 'node_modules')
const compiler = path.join(dependencies, 'typescript/bin/tsc')
if (!fs.existsSync(compiler)) throw new Error('Install this workspace development dependencies before building')
function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: packageDir, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
if (!check) fs.rmSync(path.join(packageDir, 'lib'), { recursive: true, force: true })
run(compiler, ['-p', 'tsconfig.json', ...(check ? ['--noEmit'] : [])])
if (fs.existsSync(path.join(packageDir, 'tsdown.host.config.ts')) && !check) {
  run(path.join(dependencies, 'tsdown/dist/run.mjs'), ['--config', 'tsdown.host.config.ts'])
}
if (fs.existsSync(path.join(packageDir, 'tsconfig.client.json'))) {
  run(compiler, ['-p', 'tsconfig.client.json', ...(check ? ['--noEmit'] : manifest.name.endsWith('/dsh-agent-games') ? [] : ['--emitDeclarationOnly'])])
  if (!check) run(path.join(dependencies, 'tsdown/dist/run.mjs'), ['--config', fs.existsSync(path.join(packageDir, 'tsdown.client.config.ts')) ? 'tsdown.client.config.ts' : 'tsdown.config.ts'])
}
console.log(`${manifest.name}: ${check ? 'typecheck' : 'build'} complete`)
