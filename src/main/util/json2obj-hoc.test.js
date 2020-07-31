import ObjectInTest from './object-in-test'

describe('Json2ObjHOC', () => {
  let objectInTest
  beforeEach(() => {
    objectInTest = new ObjectInTest()
  })

  describe('objectInTest.stringify()', () => {
    it('should generate valid JSON string representing the `ObjectInTest` instance', () => {
      const jsonObjectInTest = objectInTest.stringify()
      expect(typeof jsonObjectInTest).toBe('string')
      expect('{"prop1":"","prop2":2,"prop3":"three"}')
        .toEqual(jsonObjectInTest)
    })
  })

  describe('ObjectInTest.parse()', () => {
    it('should generate an `ObjectInTest` instance from JSON', () => {
      const jsonObjectInTest = objectInTest.stringify()
      const generatedObjectInTest = ObjectInTest.parse(jsonObjectInTest)
      expect(generatedObjectInTest).toMatchObject(objectInTest)
      // check if the loaded object responds to methods calls after re-construction from JSON
      generatedObjectInTest.incProp2()
      expect(generatedObjectInTest.prop2).toEqual(3)
    })
    it('should fail to generate an `ObjectInTest` object from wrong JSON', () => {
      expect(() => {
        ObjectInTest.parse('{ some: json }')
      }).toThrowError('Unexpected token s in JSON at position 2')
    })
  })
})
