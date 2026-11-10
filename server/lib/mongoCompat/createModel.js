/**
 * Mongoose-compatible model factory backed by Prisma + PostgreSQL
 */
const { prisma } = require('../prisma');
const {
  generateObjectId,
  toMongoDoc,
  fromMongoData,
  toIdString,
  normalizeMongoFilter,
  isPlainObject,
} = require('./serialize');
const { runAggregate } = require('./aggregate');

const MODEL_REGISTRY = {};

function registerModel(name, model) {
  MODEL_REGISTRY[name] = model;
}

function getModel(name) {
  return MODEL_REGISTRY[name];
}

function toMongoResult(modelDef, data) {
  if (!data) return null;
  if (data.__isMongoCompatDoc) return data;

  // Strip any leftover method props if a plain object was previously wrapped
  const cleanData = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'function') continue;
    if (key === '__isMongoCompatDoc') continue;
    cleanData[key] = value;
  }

  const doc = new MongoDocument(modelDef, cleanData, false);

  const proxy = new Proxy(doc, {
    get(target, prop, receiver) {
      if (prop === '__isMongoCompatDoc') return true;
      if (prop === 'toObject') {
        return () => {
          const obj = { ...target._data };
          delete obj.__v;
          return obj;
        };
      }
      if (prop === 'toJSON') {
        return () => {
          const obj = { ...target._data };
          delete obj.password;
          delete obj.__v;
          return obj;
        };
      }
      if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
      if (prop in target && (typeof target[prop] === 'function' || prop.startsWith('_'))) {
        const val = Reflect.get(target, prop, receiver);
        return typeof val === 'function' ? val.bind(target) : val;
      }
      if (Object.prototype.hasOwnProperty.call(target._data, prop)) {
        return target._data[prop];
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value) {
      if (prop.startsWith('_') || prop === 'save' || prop === 'populate') {
        target[prop] = value;
        return true;
      }
      target._data[prop] = value;
      target._modified.add(prop);
      return true;
    },
    has(target, prop) {
      return prop in target || Object.prototype.hasOwnProperty.call(target._data, prop);
    },
    ownKeys(target) {
      // Only expose document data fields — never internals (_modelDef, etc.)
      return Object.keys(target._data);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (Object.prototype.hasOwnProperty.call(target._data, prop)) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: target._data[prop],
        };
      }
      return undefined;
    },
  });

  return proxy;
}

function sanitizeDocData(data = {}) {
  const clean = {};
  const source =
    data && typeof data.toObject === 'function' ? data.toObject() : data;

  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value === 'function') continue;
    if (key === '__isMongoCompatDoc' || key === '__v') continue;
    if (key.startsWith('_') && key !== '_id') continue;
    clean[key] = value;
  }
  return clean;
}

class MongoDocument {
  constructor(modelDef, data = {}, isNew = true) {
    this._modelDef = modelDef;
    this._isNew = isNew;
    this._modified = new Set();
    this._data = sanitizeDocData(data);

    if (!this._data._id && !this._data.id) {
      this._data._id = generateObjectId();
    } else if (this._data.id && !this._data._id) {
      this._data._id = this._data.id;
    }

    this._applyVirtuals();
    this._bindMethods();
  }

  _bindMethods() {
    if (this._modelDef.methods) {
      for (const [name, fn] of Object.entries(this._modelDef.methods)) {
        this[name] = fn.bind(this);
      }
    }
  }

  _applyVirtuals() {
    if (this._modelDef.virtuals) {
      for (const [name, getter] of Object.entries(this._modelDef.virtuals)) {
        Object.defineProperty(this, name, {
          get: () => getter(this._data),
          enumerable: true,
          configurable: true,
        });
      }
    }
  }

  get _id() {
    return this._data._id;
  }

  set _id(val) {
    this._data._id = val;
    this._modified.add('id');
  }

  isModified(field) {
    if (!field) return this._modified.size > 0;
    return this._modified.has(field) || this._modified.has(field.replace('.', ''));
  }

  markModified(field) {
    this._modified.add(field);
  }

  toObject() {
    return { ...this._data };
  }

  toJSON() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
  }

  async populate(populateArg) {
    const populated = await populateDocuments(
      [this._data],
      populateArg,
      this._modelDef
    );
    this._data = populated[0];
    this._applyVirtuals();
    return this;
  }

  async save(options = {}) {
    const { validateBeforeSave = true } = options;

    if (this._modelDef.preSave) {
      await this._modelDef.preSave(this, validateBeforeSave);
    }

    const prismaData = this._modelDef.toPrisma(this._data, { isNew: this._isNew });

    // Preserve any populated relation objects so they survive the round-trip
    // (Prisma update/create responses only return scalar fields)
    const populatedRelations = {};
    for (const [key, val] of Object.entries(this._data)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date) && val._id) {
        populatedRelations[key] = val;
      }
    }

    let record;
    if (this._isNew) {
      record = await this._modelDef.delegate.create({ data: prismaData });
      this._isNew = false;
    } else {
      const { id, ...updateData } = prismaData;
      record = await this._modelDef.delegate.update({
        where: { id: id || this._data._id },
        data: updateData,
      });
    }

    this._data = toMongoDoc(record, { refMap: this._modelDef.refMap });

    // Restore populated relations that were lost in the Prisma response
    for (const [key, val] of Object.entries(populatedRelations)) {
      if (!this._data[key] || typeof this._data[key] !== 'object') {
        this._data[key] = val;
      }
    }

    this._modified.clear();
    this._applyVirtuals();
    return this;
  }

  async updateOne(updates) {
    const before = { ...this._data };
    const mongoUpdates = applyMongoUpdateOps(this._data, updates);
    Object.assign(this._data, mongoUpdates);

    // Only mark fields that actually changed (avoid re-hashing password on $set lastLogin)
    if (updates.$set && typeof updates.$set === 'object') {
      for (const key of Object.keys(updates.$set)) {
        this._modified.add(key);
      }
    } else if (updates.$inc && typeof updates.$inc === 'object') {
      for (const key of Object.keys(updates.$inc)) {
        this._modified.add(key);
      }
    } else if (updates.$unset && typeof updates.$unset === 'object') {
      for (const key of Object.keys(updates.$unset)) {
        this._modified.add(key);
      }
    } else if (updates.$push && typeof updates.$push === 'object') {
      for (const key of Object.keys(updates.$push)) {
        this._modified.add(key);
      }
    } else {
      for (const key of Object.keys(updates)) {
        if (!key.startsWith('$') && before[key] !== this._data[key]) {
          this._modified.add(key);
        }
      }
    }

    return this.save();
  }

  async deleteOne() {
    await this._modelDef.delegate.delete({ where: { id: this._data._id } });
    return { acknowledged: true, deletedCount: 1 };
  }

  // Subdocument array helper (items.id, cart.id, etc.)
  id(subId) {
    const arrays = ['items', 'cart', 'shippingAddresses', 'reviews', 'communication', 'statusHistory', 'variations'];
    for (const arrName of arrays) {
      const arr = this._data[arrName];
      if (Array.isArray(arr)) {
        const found = arr.find(
          (item) => item && (item._id === subId || item.id === subId || String(item._id) === String(subId))
        );
        if (found) return found;
      }
    }
    return null;
  }
}

class MongoQuery {
  constructor(modelDef, filter = {}) {
    this._modelDef = modelDef;
    this._filter = filter;
    this._select = null;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._populate = null;
    this._lean = false;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  sort(sort) {
    this._sort = sort;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  populate(arg) {
    this._populate = arg;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async _executeFindMany() {
    const { where, ops } = normalizeMongoFilter(this._filter);
    const prismaSelect = buildPrismaSelect(this._select, this._modelDef);

    const take =
      this._limit == null || Number.isNaN(Number(this._limit))
        ? undefined
        : Number(this._limit);
    const skip =
      this._skip == null || Number.isNaN(Number(this._skip))
        ? undefined
        : Number(this._skip);

    const orderBy = this._sort ? translateSort(this._sort) : undefined;

    const findArgs = {
      where: await this._modelDef.translateWhere(where, ops, this._filter),
      ...(orderBy ? { orderBy } : {}),
      ...(take !== undefined ? { take } : {}),
      ...(skip !== undefined ? { skip } : {}),
      ...(prismaSelect.include ? { include: prismaSelect.include } : {}),
      ...(prismaSelect.select ? { select: prismaSelect.select } : {}),
    };

    let records = await this._modelDef.delegate.findMany(findArgs);

    let docs = records.map((r) => toMongoDoc(r, { refMap: this._modelDef.refMap }));

    if (this._populate) {
      docs = await populateDocuments(docs, this._populate, this._modelDef);
    }

    docs = applySelect(docs, this._select);

    if (this._lean) return docs;

    return docs.map((d) => toMongoResult(this._modelDef, d));
  }

  async exec() {
    return this._executeFindMany();
  }

  then(resolve, reject) {
    return this._executeFindMany().then(resolve, reject);
  }

  catch(reject) {
    return this._executeFindMany().catch(reject);
  }
}

function applySelect(docs, select) {
  if (!select) return docs;

  const fields = select.split(' ').filter(Boolean);
  const includes = fields.filter((f) => f.startsWith('+')).map((f) => f.slice(1));
  const excludes = fields.filter((f) => f.startsWith('-')).map((f) => f.slice(1));
  const only = fields.filter((f) => !f.startsWith('+') && !f.startsWith('-'));

  return docs.map((doc) => {
    const copy = { ...doc };

    for (const field of excludes) {
      delete copy[field];
    }

    if (only.length > 0) {
      const allowed = new Set(['_id', ...only, ...includes]);
      for (const key of Object.keys(copy)) {
        if (!allowed.has(key)) delete copy[key];
      }
    }

    return copy;
  });
}

function buildPrismaSelect(selectString, modelDef) {
  if (!selectString) {
    return { include: modelDef.defaultInclude || undefined, select: undefined };
  }

  const fields = selectString.split(' ').filter(Boolean);
  const includes = fields.filter((f) => f.startsWith('+')).map((f) => f.slice(1));
  const excludes = fields.filter((f) => f.startsWith('-')).map((f) => f.slice(1));

  if (includes.includes('password')) {
  // Fetch all fields when password is explicitly requested
    return { include: undefined, select: undefined };
  }

  if (excludes.length > 0 && !selectString.startsWith('-')) {
    return { include: modelDef.defaultInclude || undefined, select: undefined };
  }

  return { include: modelDef.defaultInclude || undefined, select: undefined };
}

function translateSort(sort) {
  if (typeof sort === 'string') {
    const field = sort.startsWith('-') ? sort.slice(1) : sort;
    const direction = sort.startsWith('-') ? 'desc' : 'asc';
    // Prisma cannot order by dotted JSON paths — fall back to createdAt
    if (field.includes('.')) return { createdAt: direction };
    return { [field]: direction };
  }
  const result = {};
  for (const [key, val] of Object.entries(sort)) {
    if (key.includes('.')) continue; // skip unsupported JSON path sorts
    result[key] = val === -1 || val === 'desc' ? 'desc' : 'asc';
  }
  if (Object.keys(result).length === 0) {
    return { createdAt: 'desc' };
  }
  return result;
}

async function populateDocuments(docs, populateArg, modelDef) {
  if (!docs.length) return docs;

  const populateList = Array.isArray(populateArg)
    ? populateArg
    : typeof populateArg === 'string'
      ? [{ path: populateArg }]
      : [populateArg];

  let result = [...docs];

  for (const pop of populateList) {
    const path = pop.path || pop;
    const select = pop.select;
    const nested = pop.populate;

    result = await populatePath(result, path, select, nested, modelDef);
  }

  return result;
}

async function populatePath(docs, path, select, nested, modelDef) {
  const parts = path.split('.');
  const topPath = parts[0];

  const refConfig = modelDef.populateMap?.[path] || modelDef.populateMap?.[topPath];
  if (!refConfig) {
    // Generic ref resolution
    return await genericPopulate(docs, path, select, nested);
  }

  const ids = new Set();
  for (const doc of docs) {
    collectIds(doc, path, ids);
  }

  if (ids.size === 0) return docs;

  let refModel = getModel(refConfig.model);
  if (!refModel) {
    try {
      refModel = require(`../../models/${refConfig.model}`);
    } catch (_) {}
  }
  if (!refModel || typeof refModel.find !== "function") return docs;
  const refRecords = await refModel.find({ _id: { $in: [...ids] } })
    .select(select || '')
    .lean();

  const refMap = new Map(refRecords.map((r) => [String(r._id), r]));

  return docs.map((doc) => {
    const copy = JSON.parse(JSON.stringify(doc));
    assignPopulated(copy, path, refMap);
    return copy;
  });
}

function collectIds(obj, path, ids, prefix = '') {
  const parts = path.split('.');
  const [head, ...rest] = parts;

  if (Array.isArray(obj[head])) {
    for (const item of obj[head]) {
      if (rest.length) {
        collectIds(item, rest.join('.'), ids);
      } else if (item) {
        const id = toIdString(item);
        if (id) ids.add(id);
      }
    }
  } else if (obj[head]) {
    if (rest.length) {
      collectIds(obj[head], rest.join('.'), ids);
    } else {
      const id = toIdString(obj[head]);
      if (id) ids.add(id);
    }
  }
}

function assignPopulated(obj, path, refMap) {
  const parts = path.split('.');
  const [head, ...rest] = parts;

  if (Array.isArray(obj[head])) {
    obj[head] = obj[head].map((item) => {
      if (!item) return item;
      if (rest.length) {
        const sub = { ...item };
        assignPopulated(sub, rest.join('.'), refMap);
        return sub;
      }
      const id = toIdString(item);
      return refMap.get(String(id)) || item;
    });
  } else if (obj[head]) {
    if (rest.length) {
      assignPopulated(obj[head], rest.join('.'), refMap);
    } else {
      const id = toIdString(obj[head]);
      obj[head] = refMap.get(String(id)) || obj[head];
    }
  }
}

async function genericPopulate(docs, path, select, nested) {
  const parts = path.split('.');
  const topField = parts[0];

  const modelGuess =
    topField === 'customer' || topField === 'artisan' || topField === 'sender' ||
    topField === 'recipient' || topField === 'user' || topField === 'userId' ||
    topField === 'processedBy' || topField === 'reviewedBy' || topField === 'performedBy'
      ? 'User'
      : topField === 'product' || topField === 'productId'
        ? 'Product'
        : topField === 'orderId'
          ? 'Order'
          : topField === 'promotionId'
            ? 'Promotion'
            : topField === 'earningId'
              ? 'Earning'
              : null;

  if (!modelGuess || !getModel(modelGuess)) return docs;

  const ids = new Set();
  for (const doc of docs) {
    collectIds(doc, path, ids);
  }

  const refModel = getModel(modelGuess);
  const refs = await refModel.find({ _id: { $in: [...ids] } }).select(select || '').lean();
  const refMap = new Map(refs.map((r) => [String(r._id), r]));

  return docs.map((doc) => {
    const copy = JSON.parse(JSON.stringify(doc));
    assignPopulated(copy, path, refMap);
    return copy;
  });
}

// Set a value at a dotted path on an object, e.g. setNestedPath(obj, "inventory.quantity", 5)
function setNestedPath(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === null || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

// Get a value at a dotted path
function getNestedPath(obj, path) {
  return path.split('.').reduce((cur, k) => (cur != null ? cur[k] : undefined), obj);
}

function applyMongoUpdateOps(doc, updates) {
  const result = { ...doc };

  for (const [key, value] of Object.entries(updates)) {
    if (key === '$inc') {
      for (const [field, amount] of Object.entries(value)) {
        if (field.includes('.')) {
          // Clone nested object before mutating
          const topKey = field.split('.')[0];
          if (result[topKey] && typeof result[topKey] === 'object') {
            result[topKey] = { ...result[topKey] };
          }
          const current = getNestedPath(result, field) || 0;
          setNestedPath(result, field, current + amount);
        } else {
          result[field] = (result[field] || 0) + amount;
        }
      }
    } else if (key === '$set') {
      for (const [field, val] of Object.entries(value)) {
        if (field.includes('.')) {
          const topKey = field.split('.')[0];
          if (result[topKey] && typeof result[topKey] === 'object') {
            result[topKey] = { ...result[topKey] };
          }
          setNestedPath(result, field, val);
        } else {
          result[field] = val;
        }
      }
    } else if (key === '$unset') {
      for (const field of Object.keys(value)) {
        if (field.includes('.')) {
          const topKey = field.split('.')[0];
          if (result[topKey] && typeof result[topKey] === 'object') {
            result[topKey] = { ...result[topKey] };
          }
          setNestedPath(result, field, undefined);
        } else {
          delete result[field];
        }
      }
    } else if (key === '$push') {
      for (const [field, val] of Object.entries(value)) {
        if (!Array.isArray(result[field])) result[field] = [];
        result[field] = [...result[field], val];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function createModel(name, modelDef) {
  const model = {
    modelName: name,
    _def: modelDef,

    delegate: modelDef.delegate,

    find(filter = {}) {
      return new MongoQuery(modelDef, filter);
    },

    findOne(filter = {}) {
      const query = new MongoQuery(modelDef, filter);
      query._limit = 1;
      const run = () => query._executeFindMany().then((docs) => docs[0] || null);
      const chainable = {
        select: (f) => {
          query._select = f;
          return chainable;
        },
        populate: (p) => {
          if (!query._populate) query._populate = [];
          if (Array.isArray(query._populate)) {
            query._populate.push(p);
          } else {
            query._populate = [query._populate, p];
          }
          return chainable;
        },
        lean: () => {
          query._lean = true;
          return chainable;
        },
        then: (res, rej) => run().then(res, rej),
        catch: (rej) => run().catch(rej),
      };
      return chainable;
    },

    findById(id) {
      if (!id) {
        return Promise.resolve(null);
      }
      const query = new MongoQuery(modelDef, { _id: id });
      query._limit = 1;
      const run = () => query._executeFindMany().then((docs) => docs[0] || null);
      const chainable = {
        select: (f) => {
          query._select = f;
          return chainable;
        },
        populate: (p) => {
          if (!query._populate) query._populate = [];
          if (Array.isArray(query._populate)) {
            query._populate.push(p);
          } else {
            query._populate = [query._populate, p];
          }
          return chainable;
        },
        lean: () => {
          query._lean = true;
          return chainable;
        },
        then: (res, rej) => run().then(res, rej),
        catch: (rej) => run().catch(rej),
      };
      return chainable;
    },

    async findByIdAndUpdate(id, update, options = {}) {
      const existing = await model.findById(id);
      if (!existing) return null;

      const plain = typeof existing.toObject === 'function' ? existing.toObject() : existing;
      const doc = new MongoDocument(modelDef, plain, false);
      const ops = update.$set || update.$inc || update.$unset || update.$push ? update : { $set: update };
      const updated = applyMongoUpdateOps(doc._data, ops);
      Object.assign(doc._data, updated);

      if (ops.$set) {
        for (const key of Object.keys(ops.$set)) doc._modified.add(key);
      } else if (ops.$inc) {
        for (const key of Object.keys(ops.$inc)) doc._modified.add(key);
      } else if (typeof update === 'object') {
        for (const key of Object.keys(update)) {
          if (!key.startsWith('$')) doc._modified.add(key);
        }
      }

      await doc.save();
      if (options.new) return toMongoResult(modelDef, doc._data);
      return existing;
    },

    async findByIdAndDelete(id) {
      const existing = await model.findById(id);
      if (!existing) return null;
      await modelDef.delegate.delete({ where: { id: toIdString(id) } });
      return existing;
    },

    async findOneAndUpdate(filter, update, options = {}) {
      const existing = await model.findOne(filter);
      if (!existing) {
        if (options.upsert) {
          const newDoc = new MongoDocument(modelDef, { ...filter, ...update }, true);
          await newDoc.save();
          return toMongoResult(modelDef, newDoc._data);
        }
        return null;
      }

      const plain = typeof existing.toObject === 'function' ? existing.toObject() : existing;
      const doc = new MongoDocument(modelDef, plain, false);
      const ops = update.$set || update.$inc || update.$unset || update.$push ? update : { $set: update };
      const updated = applyMongoUpdateOps(doc._data, ops);
      Object.assign(doc._data, updated);

      if (ops.$set) {
        for (const key of Object.keys(ops.$set)) doc._modified.add(key);
      } else if (ops.$inc) {
        for (const key of Object.keys(ops.$inc)) doc._modified.add(key);
      }

      await doc.save();
      return options.new ? toMongoResult(modelDef, doc._data) : existing;
    },

    async create(data) {
      const doc = new MongoDocument(modelDef, data, true);
      await doc.save();
      return doc;
    },

    async countDocuments(filter = {}) {
      const { where, ops } = normalizeMongoFilter(filter);
      return modelDef.delegate.count({
        where: await modelDef.translateWhere(where, ops, filter),
      });
    },

    async deleteOne(filter) {
      const doc = await model.findOne(filter);
      if (!doc) return { acknowledged: true, deletedCount: 0 };
      await modelDef.delegate.delete({ where: { id: doc._id } });
      return { acknowledged: true, deletedCount: 1 };
    },

    async updateOne(filter, update) {
      const doc = await model.findOne(filter);
      if (!doc) return { acknowledged: true, modifiedCount: 0 };
      const mongoDoc = new MongoDocument(modelDef, doc, false);
      const updated = applyMongoUpdateOps(mongoDoc._data, update);
      Object.assign(mongoDoc._data, updated);
      await mongoDoc.save();
      return { acknowledged: true, modifiedCount: 1 };
    },

    aggregate(pipeline) {
      const promise = runAggregate(name, pipeline, modelDef);
      // Mongoose Aggregate is thenable and supports .allowDiskUse()
      const chainable = {
        allowDiskUse() {
          return chainable;
        },
        option() {
          return chainable;
        },
        then(resolve, reject) {
          return promise.then(resolve, reject);
        },
        catch(reject) {
          return promise.catch(reject);
        },
      };
      return chainable;
    },

    // Constructor for `new User(data)`
    bind(data) {
      return new MongoDocument(modelDef, data, true);
    },
  };

  // Allow `new User()` pattern
  function ModelConstructor(data) {
    return new MongoDocument(modelDef, data, true);
  }
  Object.assign(ModelConstructor, model);
  ModelConstructor.modelName = name;

  registerModel(name, ModelConstructor);
  return ModelConstructor;
}

module.exports = { createModel, MongoDocument, MongoQuery, registerModel, getModel };
