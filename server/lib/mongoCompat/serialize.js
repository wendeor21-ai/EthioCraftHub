/**
 * MongoDB document serialization for API compatibility
 * Converts Prisma records to Mongoose-shaped objects with _id
 */
const { randomBytes } = require('crypto');

function generateObjectId() {
  return randomBytes(12).toString('hex');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function toIdString(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value;
  if (value._id) return toIdString(value._id);
  if (value.id) return String(value.id);
  return String(value);
}

/**
 * Convert Prisma row to Mongo-style document
 */
function toMongoDoc(record, options = {}) {
  if (!record) return null;
  if (Array.isArray(record)) {
    return record.map((item) => toMongoDoc(item, options));
  }

  const { refMap = {}, skipRelations = false } = options;
  const doc = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'id') {
      doc._id = value;
      continue;
    }

    // Prisma relation objects
    if (
      !skipRelations &&
      isPlainObject(value) &&
      ('id' in value || '_id' in value) &&
      !['profile', 'verification', 'preferences', 'totals', 'payment', 'shippingAddress', 'shipping', 'inventory', 'metrics', 'culturalStory', 'specifications', 'seo', 'analytics', 'metadata', 'measurements', 'photos', 'withdrawalAccountDetails', 'enabledAlerts', 'details'].includes(key)
    ) {
      const refKey = refMap[key] || key;
      doc[refKey] = toMongoDoc(value, options);
      continue;
    }

    // *Id fields -> mongo ref field names without Id
    // Exclude scalar ID fields that are not relation FKs
    const NON_RELATION_ID_FIELDS = ['cartId', 'googleId', 'sessionId', 'ipAddressId'];
    if (key.endsWith('Id') && !NON_RELATION_ID_FIELDS.includes(key)) {
      const refName = key.slice(0, -2);
      if (record[refName] && isPlainObject(record[refName])) {
        doc[refName] = toMongoDoc(record[refName], options);
      } else if (value != null) {
        doc[refName] = value;
      }
      continue;
    }

    if (value instanceof Date) {
      doc[key] = value;
    } else if (Array.isArray(value)) {
      doc[key] = value.map((item) => {
        if (isPlainObject(item) && item.id && !item._id) {
          return { ...item, _id: item.id };
        }
        return item;
      });
    } else if (isPlainObject(value)) {
      doc[key] = { ...value };
    } else {
      doc[key] = value;
    }
  }

  if (!doc._id && record.id) {
    doc._id = record.id;
  }
  // Always expose both `id` and `_id` so legacy code using either field works
  if (doc._id && !doc.id) {
    doc.id = doc._id;
  }

  return doc;
}

/**
 * Convert mongo-style data to Prisma create/update input
 */
function fromMongoData(data, fieldMap = {}) {
  const result = { ...data };

  if (result._id) {
    result.id = result._id;
    delete result._id;
  }

  for (const [mongoField, prismaField] of Object.entries(fieldMap)) {
    if (result[mongoField] !== undefined) {
      const val = result[mongoField];
      result[prismaField] =
        val && typeof val === 'object' && val._id ? val._id : toIdString(val);
      if (mongoField !== prismaField) delete result[mongoField];
    }
  }

  delete result.__v;
  return result;
}

function normalizeIdFilterValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(toIdString).filter(Boolean);
  if (typeof value === 'object' && !(value instanceof Date)) {
    if (value.$in) {
      return { in: value.$in.map(toIdString).filter(Boolean) };
    }
    if (value.$ne !== undefined) {
      return { not: toIdString(value.$ne) };
    }
    if (value.$nin) {
      return { notIn: value.$nin.map(toIdString).filter(Boolean) };
    }
  }
  return toIdString(value);
}

function normalizeComparisonValue(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return value;
  }

  if (value.$in !== undefined) {
    const list = (value.$in || []).filter((v) => v !== undefined && v !== null);
    return { in: list.map((v) => (typeof v === 'object' ? toIdString(v) : v)) };
  }
  if (value.$ne !== undefined) {
    return { not: typeof value.$ne === 'object' ? toIdString(value.$ne) : value.$ne };
  }
  if (value.$nin !== undefined) {
    return {
      notIn: (value.$nin || []).map((v) => (typeof v === 'object' ? toIdString(v) : v)),
    };
  }
  if (
    value.$gt !== undefined ||
    value.$gte !== undefined ||
    value.$lt !== undefined ||
    value.$lte !== undefined
  ) {
    const cmp = {};
    if (value.$gt !== undefined) cmp.gt = value.$gt;
    if (value.$gte !== undefined) cmp.gte = value.$gte;
    if (value.$lt !== undefined) cmp.lt = value.$lt;
    if (value.$lte !== undefined) cmp.lte = value.$lte;
    return cmp;
  }
  if (value.$exists !== undefined) {
    return value.$exists ? { not: null } : null;
  }
  if (value.$regex !== undefined) {
    return null; // handled via ops
  }
  return value;
}

function normalizeMongoFilter(filter = {}) {
  const where = {};
  const ops = {};

  if (!filter || typeof filter !== 'object') {
    return { where, ops };
  }

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined) continue;

    if (key === '_id') {
      where.id = normalizeIdFilterValue(value);
      continue;
    }

    if (key === '$or') {
      where.OR = (value || [])
        .map((clause) => normalizeMongoFilter(clause).where)
        .filter((clause) => clause && Object.keys(clause).length > 0);
      continue;
    }
    if (key === '$and') {
      where.AND = (value || [])
        .map((clause) => normalizeMongoFilter(clause).where)
        .filter((clause) => clause && Object.keys(clause).length > 0);
      continue;
    }

    // Dot-notation JSON paths (inventory.quantity) — leave for translateWhere
    if (key.includes('.')) {
      ops[key] = value;
      continue;
    }

    const prismaKey = translateFieldKey(key);

    if (value instanceof RegExp) {
      ops[key] = { $regex: value.source, $options: value.flags.includes('i') ? 'i' : '' };
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if (value.$regex !== undefined) {
        ops[key] = value;
        continue;
      }

      const normalized = normalizeComparisonValue(value);
      if (normalized !== null) {
        where[prismaKey] = normalized;
      } else if (value.$regex !== undefined) {
        ops[key] = value;
      }
    } else {
      where[prismaKey] = value;
    }
  }

  return { where, ops };
}

function translateFieldKey(key) {
  const map = {
    customer: 'customerId',
    artisan: 'artisanId',
    sender: 'senderId',
    recipient: 'recipientId',
    user: 'userId',
    product: 'productId',
    userId: 'userId',
    productId: 'productId',
    orderId: 'orderId',
    artisanId: 'artisanId',
    customerId: 'customerId',
    processedBy: 'processedById',
    reviewedBy: 'reviewedById',
    performedBy: 'performedById',
    earningId: 'earningId',
    adminUserId: 'adminUserId',
    promotionId: 'promotionId',
  };

  if (map[key]) return map[key];

  // Nested mongo paths like verification.status
  if (key.includes('.')) {
    return key;
  }

  return key;
}

module.exports = {
  generateObjectId,
  toMongoDoc,
  fromMongoData,
  toIdString,
  normalizeMongoFilter,
  isPlainObject,
};
