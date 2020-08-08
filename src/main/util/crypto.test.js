import Crypto from './crypto'

describe('Crypto', () => {
  describe('Crypto.hash()', () => {
    it('generates a SHA-256 hashed output', () => {
      expect(Crypto.hash('foo'))
        .toEqual('7822850fecc31ad84d42bc4dfad785dc1ba286202e19271979763f9c39aba48156a3374d8f483b0a7f0dd5d1b044d4452fba5d8495501f7bcf526db1ad1691f3')
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
