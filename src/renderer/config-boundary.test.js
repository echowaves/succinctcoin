// CAP-10 static boundary: the renderer reads no app config (only the preload
// bridge crosses the layer), hardcodes no localhost port, and the port IPC
// channel is the same literal on both surfaces. Loading src/config.js under
// jest requires mocking electron-is-dev (the real package is untransformed
// ESM under the CJS transform).
jest.mock('electron-is-dev', () => false)

import fs from 'fs'
import path from 'path'

import appConfig from '../config'
import coreConfig from '../main/config'

const ROOT = path.resolve(__dirname, '..', '..')
const RENDERER_DIR = path.join(ROOT, 'src', 'renderer')
const APP_CONFIG_FILE = path.join(ROOT, 'src', 'config.js')

// Every non-test .js/.jsx source file under src/renderer/ (the preload is in
// scope — it imports nothing).
const listSourceFiles = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return listSourceFiles(full)
    if (!/\.(js|jsx)$/.test(entry.name)) return []
    if (/\.test\.(js|jsx)$/.test(entry.name)) return []
    return [full]
  })

// Import specifiers that could reach a local module: static `from '...'`,
// bare side-effect `import '...'`, require('...') (one- and two-arg), and
// dynamic import('...').
const SPECIFIER_PATTERNS = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\brequire\(\s*['"]([^'"]+)['"]/g,
  /\bimport\(\s*['"]([^'"]+)['"]/g,
]

// A relative specifier resolves to src/config.js (module, file, or index).
const resolvesToAppConfig = (specifier, fileDir) => {
  if (!/^\.\.?\//.test(specifier)) return false
  const resolved = path.resolve(fileDir, specifier)
  return [resolved, `${resolved}.js`, path.join(resolved, 'index.js')].includes(APP_CONFIG_FILE)
}

describe('CAP-10 renderer config boundary', () => {
  it('RENDERER_NO_CONFIG_IMPORT: no non-test renderer file imports src/config.js', () => {
    const violations = []
    for (const file of listSourceFiles(RENDERER_DIR)) {
      const source = fs.readFileSync(file, 'utf8')
      const specifiers = new Set()
      for (const pattern of SPECIFIER_PATTERNS) {
        for (const match of source.matchAll(pattern)) specifiers.add(match[1])
      }
      for (const specifier of specifiers) {
        if (resolvesToAppConfig(specifier, path.dirname(file))) {
          violations.push(`${path.relative(ROOT, file)} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('HARDCODED_API_PORT: no non-test renderer file hardcodes a localhost port', () => {
    const violations = []
    for (const file of listSourceFiles(RENDERER_DIR)) {
      if (/https?:\/\/localhost:\d+/.test(fs.readFileSync(file, 'utf8'))) {
        violations.push(path.relative(ROOT, file))
      }
    }
    expect(violations).toEqual([])
  })

  it('PORT_CHANNEL_JOIN: the channel the bridge pulls is registered by the main process', () => {
    const preloadSource = fs.readFileSync(path.join(RENDERER_DIR, 'preload.js'), 'utf8')
    const channelMatch = preloadSource.match(/getApiPort[\s\S]*?sendSync\(\s*['"]([^'"]+)['"]/)
    expect(channelMatch).not.toBeNull()

    const apiSource = fs.readFileSync(path.join(ROOT, 'src', 'main', 'api.js'), 'utf8')
    const registeredChannels = [...apiSource.matchAll(/ipcMain\.on\(\s*['"]([^'"]+)['"]/g)].map(m => m[1])

    expect(registeredChannels).toContain(channelMatch[1])
  })

  it('INTERVAL_OWNERSHIP: MINING_RECHECK_INTERVAL and VALIDATION_RATE are each owned by one config module', () => {
    expect(typeof appConfig.MINING_RECHECK_INTERVAL).toBe('number')
    expect(typeof coreConfig.VALIDATION_RATE).toBe('number')
    expect(appConfig.VALIDATION_RATE).toBeUndefined()
    expect(coreConfig.MINING_RECHECK_INTERVAL).toBeUndefined()
  })

  // Positive half of COMPONENTS_USE_BRIDGE: the two negative scans above
  // cannot see a component whose base comes from neither a config import
  // nor a localhost literal (e.g. a bare relative '/api/...' URL). Pin the
  // form the intent requires directly: every fetch base starts from
  // getApiBase().
  it('COMPONENTS_USE_BRIDGE: every rewired component fetch base is built from getApiBase()', () => {
    const components = ['Blocks.js', 'TransactionPool.js', 'ConductTransaction.js']
    const violations = []
    for (const name of components) {
      const source = fs.readFileSync(path.join(RENDERER_DIR, 'components', name), 'utf8')
      const fetchBases = [...source.matchAll(/fetch\(\s*`([^`]*)`/g)].map(m => m[1])
      if (fetchBases.length === 0) {
        violations.push(`${name}: no fetch sites found`)
        continue
      }
      for (const base of fetchBases) {
        if (!base.startsWith('${getApiBase()}/api/')) {
          violations.push(`${name}: ${base}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})

// Meta-test: the scanner above is the story's central guard; a regex or
// resolution typo would let it pass vacuously. Each import form must be
// caught on its own, and resolution must map the expected specifiers.
describe('boundary scanner self-test', () => {
  const IMPORT_FORMS = {
    'static from': "import config from '../../config'",
    'bare side-effect': "import '../../config'",
    'require one-arg': "const config = require('../../config')",
    'require two-arg': "const { a } = require('../../config', {})",
    'dynamic import': "void import('../../config')",
  }

  it.each(Object.entries(IMPORT_FORMS))(
    'catches the %s form of a config import',
    (_label, line) => {
      const found = new Set()
      for (const pattern of SPECIFIER_PATTERNS) {
        for (const match of line.matchAll(pattern)) found.add(match[1])
      }
      expect(found.has('../../config')).toBe(true)
    },
  )

  it('maps renderer specifiers to src/config.js and nothing else', () => {
    const componentsDir = path.join(RENDERER_DIR, 'components')

    expect(resolvesToAppConfig('../../config', componentsDir)).toBe(true)
    expect(resolvesToAppConfig('../../config.js', componentsDir)).toBe(true)
    expect(resolvesToAppConfig('../config', RENDERER_DIR)).toBe(true)
    expect(resolvesToAppConfig('../../main/config', componentsDir)).toBe(false)
    expect(resolvesToAppConfig('react', componentsDir)).toBe(false)
  })
})
