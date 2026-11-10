/**
 * Default where translator for Prisma models
 */
const { toIdString } = require('./serialize');

function toPrismaJsonPathFilter(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    return { equals: value };
  }

  if (value.$regex !== undefined) {
    return null; // post-filter via ops
  }

  const filter = {};
  if (value.$gt !== undefined) filter.gt = value.$gt;
  if (value.$gte !== undefined) filter.gte = value.$gte;
  if (value.$lt !== undefined) filter.lt = value.$lt;
  if (value.$lte !== undefined) filter.lte = value.$lte;
  if (value.$ne !== undefined) filter.not = value.$ne;
  if (value.$equals !== undefined) filter.equals = value.$equals;
  if (value.equals !== undefined) filter.equals = value.equals;

  if (Object.keys(filter).length === 0) {
    // Plain object equality is not supported for nested JSON paths
    return { equals: value };
  }

  return filter;
}

async function defaultTranslateWhere(where, ops = {}, rawFilter = {}) {
  const result = { ...where };

  // Never leave Mongo dotted keys or raw _id in Prisma where
  for (const key of Object.keys(result)) {
    if (key.includes('.') || key === '_id') {
      delete result[key];
    }
  }

  if (rawFilter._id !== undefined) {
    if (
      rawFilter._id &&
      typeof rawFilter._id === 'object' &&
      !(rawFilter._id instanceof Date) &&
      !Array.isArray(rawFilter._id)
    ) {
      if (rawFilter._id.$in) {
        result.id = { in: rawFilter._id.$in.map(toIdString).filter(Boolean) };
      } else if (rawFilter._id.$ne !== undefined) {
        result.id = { not: toIdString(rawFilter._id.$ne) };
      } else {
        result.id = toIdString(rawFilter._id);
      }
    } else {
      result.id = toIdString(rawFilter._id);
    }
  }

  const dottedSources = { ...ops, ...rawFilter };

  for (const [key, value] of Object.entries(dottedSources)) {
    if (!key.includes('.') || value === undefined) continue;

    const [jsonField, ...pathParts] = key.split('.');
    if (!jsonField || pathParts.length === 0) continue;

    const pathFilter = toPrismaJsonPathFilter(value);
    if (!pathFilter) continue;

    result[jsonField] = {
      path: (process.env.DATABASE_URL || '').startsWith('mysql:')
        ? `$.${pathParts.join('.')}`
        : pathParts,
      ...pathFilter,
    };
  }

  // items.artisan is an Order JSON array filter — keep as post-filter op if present
  if (rawFilter['items.artisan'] !== undefined) {
    delete result.items;
  }

  return result;
}

function defaultToPrisma(mongoData, fieldMap = {}) {
  const source =
    mongoData && typeof mongoData.toObject === 'function'
      ? mongoData.toObject()
      : mongoData;

  const data = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value === 'function') continue;
    if (key === '__isMongoCompatDoc' || key === '__v') continue;
    if (key.startsWith('_') && key !== '_id') continue;
    if (value === undefined) continue; // Prisma rejects undefined — use null to clear
    data[key] = value;
  }

  const id = data._id || data.id || undefined;

  if (id) data.id = toIdString(id);
  delete data._id;

  for (const [mongoField, prismaField] of Object.entries(fieldMap)) {
    if (data[mongoField] !== undefined) {
      const val = data[mongoField];
      data[prismaField] =
        val && typeof val === 'object' && (val._id || val.id)
          ? toIdString(val._id || val.id)
          : val;
      if (mongoField !== prismaField) delete data[mongoField];
    }
  }

  delete data.__v;
  return data;
}

module.exports = { defaultTranslateWhere, defaultToPrisma };
