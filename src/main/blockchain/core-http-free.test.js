import fs from 'fs'
import path from 'path'

// AD-9: the core throws, the app maps. No non-test file under
// src/main/blockchain/ may contain HTTP status logic. The tokens are
// composed at runtime so this test file itself introduces no literal
// token under src/.
const tokens = [
  ['res', 'status'].join('.'),
  ['ex', 'press'].join(''),
  ['http', 'Status'].join(''),
]

const listCoreFiles = dirPath => fs
  .readdirSync(dirPath, { withFileTypes: true })
  .flatMap(entry => {
    const full = path.join(dirPath, entry.name)

    if (entry.isDirectory()) return listCoreFiles(full)
    if (!entry.name.endsWith('.js')) return []
    if (entry.name.endsWith('.test.js')) return []
    return [full]
  })

describe('core is HTTP-free (AD-9)', () => {
  it('contains no HTTP status logic in any non-test file', () => {
    const files = listCoreFiles(__dirname)

    expect(files.length).toBeGreaterThan(0)

    const offenders = files.filter(file => {
      const content = fs.readFileSync(file, 'utf8')

      return tokens.some(token => content.includes(token))
    })

    expect(offenders).toEqual([])
  })
})
