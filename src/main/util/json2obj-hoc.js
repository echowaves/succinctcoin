const Json2ObjHOC = WrappedObject => class extends WrappedObject {
  /* returns JSON String represenation of the object */
  stringify() {
    return JSON.stringify(this)
  }

  /* returns Object instance of a current class */
  static parse(jsonObj) {
    const obj = JSON.parse(jsonObj)
    return Object.assign(new WrappedObject(), obj)
  }
}
export default Json2ObjHOC
