import Crypto from './crypto'

describe('Crypto', () => {
  describe('Crypto.hash()', () => {
    it('generates a SHA-256 hashed output', () => {
      expect(Crypto.hash('foo'))
        .toEqual('b2213295d564916f89a6a42455567c87c3f480fcd7a1c15e220f17d7169a790b')
    })

    it('produces the same hash with the same input arguments in any order', () => {
      expect(Crypto.hash('one', 'two', 'three'))
        .toEqual(Crypto.hash('three', 'one', 'two'))
    })

    it('produces a unique hash when the properties have changed on an input', () => {
      const foo = {}
      const originalHash = Crypto.hash(foo)
      foo.a = 'a'

      expect(Crypto.hash(foo)).not.toEqual(originalHash)
    })
  })
})
