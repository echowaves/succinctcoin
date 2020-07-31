import Json2ObjHOC from './json2obj-hoc'

class ObjectInTest {
  // have to make publicKey optional for json2Obj HOC to work
  constructor({ prop1 } = { prop1: '' }) {
    this.prop1 = prop1
    this.prop2 = 2
    this.prop3 = 'three'
  }

  incProp2() {
    this.prop2 += 1
  }
}

export default Json2ObjHOC(ObjectInTest)
