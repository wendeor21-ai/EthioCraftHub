/**
 * Lightweight mongoose shim for ObjectId compatibility
 * Replaces mongoose.Types.ObjectId without the MongoDB driver
 */
const { generateObjectId, toIdString } = require('./mongoCompat/serialize');

class ObjectId {
  constructor(id) {
    if (id == null || id === '') {
      this._id = generateObjectId();
    } else if (typeof id === 'object' && id._id) {
      this._id = toIdString(id._id);
    } else {
      this._id = toIdString(id);
    }
  }

  toString() {
    return String(this._id);
  }

  valueOf() {
    return this._id;
  }

  equals(other) {
    return toIdString(other) === String(this._id);
  }

  static isValid(id) {
    if (id == null) return false;
    const str = toIdString(id);
    return typeof str === 'string' && /^[a-fA-F0-9]{24}$/.test(str);
  }
}

module.exports = {
  Types: { ObjectId },
  Schema: { Types: { ObjectId } },
};
