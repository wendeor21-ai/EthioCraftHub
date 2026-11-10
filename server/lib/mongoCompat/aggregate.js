/**
 * MongoDB aggregate() compatibility using Prisma fetch + in-memory pipeline
 */
const { prisma } = require('../prisma');
const { toMongoDoc, toIdString } = require('./serialize');

async function runAggregate(modelName, pipeline, modelDef) {
  const matchStage = pipeline.find((s) => s.$match);
  const groupStage = pipeline.find((s) => s.$group);
  const sortStage = pipeline.find((s) => s.$sort);
  const limitStage = pipeline.find((s) => s.$limit);
  const lookupStages = pipeline.filter((s) => s.$lookup);
  const unwindStages = pipeline.filter((s) => s.$unwind);

  if (lookupStages.length > 0 || unwindStages.length > 0) {
    return runInMemoryPipeline(modelName, pipeline, modelDef);
  }

  if (groupStage && modelName === 'Earning') {
    try {
      return await runEarningAggregate(matchStage?.$match, groupStage);
    } catch {
      return runInMemoryPipeline(modelName, pipeline, modelDef);
    }
  }

  if (groupStage && modelName === 'UserInteraction') {
    try {
      return await runUserInteractionAggregate(matchStage?.$match, groupStage, sortStage);
    } catch {
      return runInMemoryPipeline(modelName, pipeline, modelDef);
    }
  }

  if (groupStage && modelName === 'AIChatLog') {
    return runAIChatLogAggregate(matchStage?.$match, groupStage);
  }

  if (groupStage) {
    return runInMemoryPipeline(modelName, pipeline, modelDef);
  }

  if (matchStage && !groupStage) {
    const where = translateMatchToPrisma(matchStage.$match);
    const records = await modelDef.delegate.findMany({ where });
    return records.map((r) => toMongoDoc(r));
  }

  return [];
}

function getByPath(obj, path) {
  if (!obj || path == null) return undefined;
  if (path === '') return obj;
  const parts = String(path).replace(/^\$/, '').split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

function resolveValue(doc, expr) {
  if (expr == null) return expr;
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getByPath(doc, expr.slice(1));
  }
  if (typeof expr === 'object' && !Array.isArray(expr) && !(expr instanceof Date)) {
    if (expr.$dateToString) {
      const dateVal = resolveValue(doc, expr.$dateToString.date);
      if (!(dateVal instanceof Date) && !dateVal) return null;
      const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (Number.isNaN(d.getTime())) return null;
      // Support %Y-%m-%d
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
    if (expr.$cond) {
      const [cond, ifTrue, ifFalse] = Array.isArray(expr.$cond)
        ? expr.$cond
        : [expr.$cond.if, expr.$cond.then, expr.$cond.else];
      return evalCondition(doc, cond) ? resolveValue(doc, ifTrue) : resolveValue(doc, ifFalse);
    }
    if (expr.$eq) {
      const [a, b] = expr.$eq;
      return resolveValue(doc, a) === resolveValue(doc, b);
    }
    if (expr.$in) {
      const [valExpr, listExpr] = expr.$in;
      const val = resolveValue(doc, valExpr);
      const list = Array.isArray(listExpr) ? listExpr : resolveValue(doc, listExpr) || [];
      return list.map(String).includes(String(val));
    }
    if (expr.$ifNull) {
      const [valExpr, fallback] = expr.$ifNull;
      const val = resolveValue(doc, valExpr);
      return val == null ? resolveValue(doc, fallback) : val;
    }
    if (expr.$multiply) {
      return (expr.$multiply || []).reduce((acc, part) => {
        const n = Number(resolveValue(doc, part));
        return acc * (Number.isFinite(n) ? n : 0);
      }, 1);
    }
    if (expr.$add) {
      return (expr.$add || []).reduce((acc, part) => {
        const n = Number(resolveValue(doc, part));
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0);
    }
    if (expr.$round) {
      const [numExpr, places = 0] = Array.isArray(expr.$round) ? expr.$round : [expr.$round, 0];
      const num = Number(resolveValue(doc, numExpr));
      if (!Number.isFinite(num)) return 0;
      const factor = Math.pow(10, places);
      return Math.round(num * factor) / factor;
    }
    if (expr.$concat) {
      const parts = Array.isArray(expr.$concat) ? expr.$concat : [expr.$concat];
      return parts.map((part) => {
        const val = resolveValue(doc, part);
        return val == null ? '' : String(val);
      }).join('');
    }
    if (expr.$toLower) {
      const val = resolveValue(doc, expr.$toLower);
      return val == null ? '' : String(val).toLowerCase();
    }
    if (expr.$toUpper) {
      const val = resolveValue(doc, expr.$toUpper);
      return val == null ? '' : String(val).toUpperCase();
    }
    if (expr.$trim) {
      const val = resolveValue(doc, expr.$trim?.input || expr.$trim);
      return val == null ? '' : String(val).trim();
    }
    if (expr.$arrayElemAt) {
      const [arrExpr, idx] = expr.$arrayElemAt;
      const arr = resolveValue(doc, arrExpr);
      return Array.isArray(arr) ? arr[idx] : null;
    }
    if (expr.$size) {
      const arr = resolveValue(doc, expr.$size);
      return Array.isArray(arr) ? arr.length : 0;
    }
    if (expr.$sum !== undefined) return resolveValue(doc, expr.$sum);
    if (expr.$avg !== undefined) return resolveValue(doc, expr.$avg);
  }
  return expr;
}

function evalCondition(doc, cond) {
  if (typeof cond === 'string' && cond.startsWith('$')) {
    return !!resolveValue(doc, cond);
  }
  if (cond && typeof cond === 'object') {
    if (cond.$eq) {
      const [a, b] = cond.$eq;
      return resolveValue(doc, a) === resolveValue(doc, b);
    }
    if (cond.$in) {
      return !!resolveValue(doc, cond);
    }
    if (cond.$nin) {
      const [valExpr, list] = cond.$nin;
      const val = resolveValue(doc, valExpr);
      return !(list || []).map(String).includes(String(val));
    }
  }
  return !!cond;
}

function matchesFilter(doc, filter) {
  if (!filter || typeof filter !== 'object') return true;

  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or') {
      if (!Array.isArray(val) || !val.some((clause) => matchesFilter(doc, clause))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(val) || !val.every((clause) => matchesFilter(doc, clause))) return false;
      continue;
    }

    const fieldVal = getByPath(doc, key);

    if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
      if (val.$in) {
        const list = val.$in.map((v) => String(toIdString(v) ?? v));
        const cmp = fieldVal == null ? null : String(toIdString(fieldVal) ?? fieldVal);
        if (!list.includes(cmp)) return false;
        continue;
      }
      if (val.$nin) {
        const list = val.$nin.map((v) => String(toIdString(v) ?? v));
        const cmp = fieldVal == null ? null : String(toIdString(fieldVal) ?? fieldVal);
        if (list.includes(cmp)) return false;
        continue;
      }
      if (val.$gte !== undefined || val.$gt !== undefined || val.$lte !== undefined || val.$lt !== undefined) {
        const num = fieldVal instanceof Date ? fieldVal.getTime() : fieldVal;
        if (val.$gte !== undefined) {
          const bound = val.$gte instanceof Date ? val.$gte.getTime() : val.$gte;
          if (!(num >= bound)) return false;
        }
        if (val.$gt !== undefined) {
          const bound = val.$gt instanceof Date ? val.$gt.getTime() : val.$gt;
          if (!(num > bound)) return false;
        }
        if (val.$lte !== undefined) {
          const bound = val.$lte instanceof Date ? val.$lte.getTime() : val.$lte;
          if (!(num <= bound)) return false;
        }
        if (val.$lt !== undefined) {
          const bound = val.$lt instanceof Date ? val.$lt.getTime() : val.$lt;
          if (!(num < bound)) return false;
        }
        continue;
      }
      if (val.$ne !== undefined) {
        if (String(fieldVal) === String(val.$ne)) return false;
        continue;
      }
      if (val.$regex !== undefined) {
        const re = new RegExp(val.$regex, val.$options || '');
        if (!re.test(String(fieldVal ?? ''))) return false;
        continue;
      }
    }

    const expected = val && typeof val === 'object' && val._id ? toIdString(val._id) : val;
    const actual = fieldVal && typeof fieldVal === 'object' && (fieldVal._id || fieldVal.id)
      ? toIdString(fieldVal._id || fieldVal.id)
      : fieldVal;
    if (String(actual) !== String(expected)) return false;
  }

  return true;
}

function translateMatchToPrisma(match) {
  const where = {};
  const REF_MAP = {
    customer: 'customerId',
    artisan: 'artisanId',
    user: 'userId',
    product: 'productId',
    sender: 'senderId',
    recipient: 'recipientId',
  };

  for (const [key, val] of Object.entries(match || {})) {
    // Dot paths / JSON nested filters are applied in-memory after fetch
    if (key.includes('.') || key.startsWith('$')) continue;

    let prismaKey = REF_MAP[key] || key;
    if (prismaKey === '_id') prismaKey = 'id';

    if (val && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
      if (val.$gte !== undefined || val.$gt !== undefined || val.$lte !== undefined || val.$lt !== undefined) {
        where[prismaKey] = {};
        if (val.$gte !== undefined) where[prismaKey].gte = val.$gte;
        if (val.$gt !== undefined) where[prismaKey].gt = val.$gt;
        if (val.$lte !== undefined) where[prismaKey].lte = val.$lte;
        if (val.$lt !== undefined) where[prismaKey].lt = val.$lt;
      } else if (val.$in) {
        where[prismaKey] = { in: val.$in.map((v) => String(toIdString(v) ?? v)) };
      } else if (val.$ne !== undefined) {
        where[prismaKey] = { not: val.$ne };
      } else if (val._id || val.id) {
        where[prismaKey] = String(toIdString(val._id || val.id));
      }
      // skip unknown operator objects for Prisma; in-memory filter will handle
    } else {
      where[prismaKey] = typeof val === 'object' && val?._id ? String(val._id) : val;
    }
  }
  return where;
}

function hasUnsupportedPrismaMatch(match) {
  if (!match) return false;
  return Object.keys(match).some(
    (k) => k.includes('.') || k.startsWith('$') || (match[k] && typeof match[k] === 'object' && match[k].$regex)
  );
}

async function fetchBaseRecords(modelName, modelDef, match) {
  const delegate = modelDef?.delegate || getDelegate(modelName);
  if (!delegate) return [];

  const prismaWhere = translateMatchToPrisma(match);
  const records = await delegate.findMany({
    where: Object.keys(prismaWhere).length ? prismaWhere : undefined,
  });
  return records.map((r) => toMongoDoc(r, { refMap: modelDef?.refMap || {} }));
}

function applyUnwind(docs, unwindExpr) {
  const path = typeof unwindExpr === 'string' ? unwindExpr : unwindExpr.path;
  const field = path.replace(/^\$/, '');
  const out = [];
  for (const doc of docs) {
    const arr = getByPath(doc, field);
    if (!Array.isArray(arr) || arr.length === 0) continue;
    for (const item of arr) {
      out.push({ ...doc, [field]: item });
    }
  }
  return out;
}

function computeGroupKey(doc, groupId) {
  if (groupId === null || groupId === undefined) return 'all';
  if (typeof groupId === 'string') {
    const val = resolveValue(doc, groupId);
    return val == null ? 'null' : String(typeof val === 'object' ? toIdString(val) ?? JSON.stringify(val) : val);
  }
  if (typeof groupId === 'object') {
    // Operator expression used directly as _id (e.g. $dateToString)
    if (groupId.$dateToString || groupId.$cond || groupId.$eq) {
      const val = resolveValue(doc, groupId);
      return val == null ? 'null' : String(val);
    }
    const keyObj = {};
    for (const [k, v] of Object.entries(groupId)) {
      keyObj[k] = resolveValue(doc, v);
    }
    return JSON.stringify(keyObj);
  }
  return String(groupId);
}

function materializeGroupId(doc, groupId) {
  if (groupId === null || groupId === undefined) return null;
  if (typeof groupId === 'string') {
    const val = resolveValue(doc, groupId);
    if (val && typeof val === 'object' && (val._id || val.id)) return toIdString(val._id || val.id);
    return val;
  }
  if (typeof groupId === 'object') {
    if (groupId.$dateToString || groupId.$cond || groupId.$eq) {
      return resolveValue(doc, groupId);
    }
    const out = {};
    for (const [k, v] of Object.entries(groupId)) {
      const resolved = resolveValue(doc, v);
      out[k] =
        resolved && typeof resolved === 'object' && (resolved._id || resolved.id)
          ? toIdString(resolved._id || resolved.id)
          : resolved;
    }
    return out;
  }
  return groupId;
}

function applyGroup(docs, groupStage) {
  const groupId = groupStage._id;
  const grouped = new Map();

  for (const doc of docs) {
    const mapKey = computeGroupKey(doc, groupId);
    if (!grouped.has(mapKey)) {
      const bucket = {
        _id: materializeGroupId(doc, groupId),
        __counts: {},
        __sums: {},
        __avgs: {},
      };
      grouped.set(mapKey, bucket);
    }

    const bucket = grouped.get(mapKey);

    for (const [outKey, expr] of Object.entries(groupStage)) {
      if (outKey === '_id') continue;

      if (expr && typeof expr === 'object') {
        if (expr.$sum !== undefined) {
          const sumExpr = expr.$sum;
          let add = 0;
          if (sumExpr === 1) {
            add = 1;
          } else if (typeof sumExpr === 'number') {
            add = sumExpr;
          } else {
            const resolved = resolveValue(doc, sumExpr);
            add = typeof resolved === 'number' ? resolved : Number(resolved) || 0;
          }
          bucket.__sums[outKey] = (bucket.__sums[outKey] || 0) + add;
          bucket[outKey] = bucket.__sums[outKey];
        } else if (expr.$avg !== undefined) {
          const resolved = resolveValue(doc, expr.$avg);
          const num = typeof resolved === 'number' ? resolved : Number(resolved) || 0;
          if (!bucket.__avgs[outKey]) bucket.__avgs[outKey] = { sum: 0, n: 0 };
          bucket.__avgs[outKey].sum += num;
          bucket.__avgs[outKey].n += 1;
          bucket[outKey] = bucket.__avgs[outKey].sum / bucket.__avgs[outKey].n;
        } else if (expr.$push !== undefined) {
          if (!bucket[outKey]) bucket[outKey] = [];
          bucket[outKey].push(resolveValue(doc, expr.$push));
        } else if (expr.$addToSet !== undefined) {
          if (!bucket[outKey]) bucket[outKey] = [];
          const v = resolveValue(doc, expr.$addToSet);
          const s = String(v);
          if (!bucket[outKey].some((x) => String(x) === s)) bucket[outKey].push(v);
        } else if (expr.$first !== undefined) {
          if (bucket[outKey] === undefined) bucket[outKey] = resolveValue(doc, expr.$first);
        } else if (expr.$max !== undefined) {
          const v = resolveValue(doc, expr.$max);
          if (bucket[outKey] === undefined || v > bucket[outKey]) bucket[outKey] = v;
        } else if (expr.$min !== undefined) {
          const v = resolveValue(doc, expr.$min);
          if (bucket[outKey] === undefined || v < bucket[outKey]) bucket[outKey] = v;
        }
      }
    }
  }

  return [...grouped.values()].map((b) => {
    const { __counts, __sums, __avgs, ...rest } = b;
    return rest;
  });
}

async function runInMemoryPipeline(modelName, pipeline, modelDef) {
  // Initial fetch: use first $match that has only Prisma-safe fields when possible
  const firstMatch = pipeline.find((s) => s.$match)?.$match;
  let docs = await fetchBaseRecords(modelName, modelDef, firstMatch);

  // If first match had nested/JSON filters, apply full filter in memory
  if (firstMatch && hasUnsupportedPrismaMatch(firstMatch)) {
    docs = docs.filter((d) => matchesFilter(d, firstMatch));
  }

  let stageIndex = 0;
  // Skip the first match stage since we already applied it
  if (pipeline[0]?.$match) stageIndex = 1;

  for (; stageIndex < pipeline.length; stageIndex++) {
    const stage = pipeline[stageIndex];

    if (stage.$match) {
      docs = docs.filter((d) => matchesFilter(d, stage.$match));
    } else if (stage.$unwind) {
      docs = applyUnwind(docs, stage.$unwind);
    } else if (stage.$group) {
      docs = applyGroup(docs, stage.$group);
    } else if (stage.$sort) {
      const sortField = Object.keys(stage.$sort)[0];
      const dir = stage.$sort[sortField];
      docs.sort((a, b) => {
        const av = getByPath(a, sortField);
        const bv = getByPath(b, sortField);
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av > bv) return dir === -1 ? -1 : 1;
        if (av < bv) return dir === -1 ? 1 : -1;
        return 0;
      });
    } else if (stage.$limit) {
      docs = docs.slice(0, stage.$limit);
    } else if (stage.$project) {
      docs = docs.map((d) => {
        const out = {};
        for (const [k, v] of Object.entries(stage.$project)) {
          if (v === 1 || v === true) out[k] = getByPath(d, k);
          else if (v === 0 || v === false) continue;
          else out[k] = resolveValue(d, v);
        }
        if (stage.$project._id !== 0) out._id = d._id;
        return out;
      });
    } else if (stage.$lookup) {
      // Basic lookup support for common cases
      const from = stage.$lookup.from;
      const localField = stage.$lookup.localField;
      const foreignField = stage.$lookup.foreignField;
      const as = stage.$lookup.as;
      const fromModel = fromMap(from);
      if (fromModel) {
        const ids = [...new Set(docs.map((d) => toIdString(getByPath(d, localField))).filter(Boolean))];
        const related = await fromModel.findMany({
          where: foreignField === '_id' || foreignField === 'id'
            ? { id: { in: ids } }
            : { [foreignField]: { in: ids } },
        });
        const relatedDocs = related.map((r) => toMongoDoc(r));
        const map = new Map(relatedDocs.map((r) => [String(r._id), r]));
        docs = docs.map((d) => {
          const key = String(toIdString(getByPath(d, localField)) || '');
          return { ...d, [as]: map.get(key) ? [map.get(key)] : [] };
        });
      }
    }
  }

  return docs;
}

function fromMap(name) {
  const map = {
    users: prisma.user,
    products: prisma.product,
    orders: prisma.order,
    earnings: prisma.earning,
  };
  return map[name];
}

async function runEarningAggregate(match, groupStage) {
  const artisanId = match?.artisan?._id || match?.artisan;
  const baseWhere = {
    status: match?.status || 'completed',
  };

  if (artisanId) {
    baseWhere.artisanId = String(toIdString(artisanId) || artisanId);
  }

  if (match?.transactionType) {
    baseWhere.transactionType = match.transactionType;
  }

  if (match?.withdrawalStatus?.$in) {
    baseWhere.withdrawalStatus = { in: match.withdrawalStatus.$in };
  }

  if (match?.createdAt?.$gte) {
    baseWhere.createdAt = { gte: match.createdAt.$gte };
  }
  if (match?.createdAt?.$lte) {
    baseWhere.createdAt = { ...baseWhere.createdAt, lte: match.createdAt.$lte };
  }

  const group = groupStage.$group || groupStage;
  const groupId = group._id;

  if (groupId === '$transactionType') {
    if (!artisanId) return [];
    const rows = await prisma.earning.groupBy({
      by: ['transactionType'],
      where: baseWhere,
      _sum: { netAmount: true },
    });
    return rows.map((r) => ({
      _id: r.transactionType,
      total: r._sum.netAmount || 0,
    }));
  }

  if (groupId && groupId.year && groupId.month) {
    if (!artisanId) return [];
    const earnings = await prisma.earning.findMany({
      where: {
        ...baseWhere,
        transactionType: match?.transactionType || 'sale',
      },
      select: { netAmount: true, createdAt: true },
    });

    const grouped = {};
    for (const e of earnings) {
      const year = e.createdAt.getFullYear();
      const month = e.createdAt.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!grouped[key]) {
        grouped[key] = { _id: { year, month }, totalEarnings: 0, totalSales: 0 };
      }
      grouped[key].totalEarnings += e.netAmount;
      grouped[key].totalSales += 1;
    }

    return Object.values(grouped).sort((a, b) => {
      if (a._id.year !== b._id.year) return a._id.year - b._id.year;
      return a._id.month - b._id.month;
    });
  }

  if (groupId === null) {
    const sumFields = {};
    for (const [k, v] of Object.entries(group)) {
      if (k === '_id') continue;
      if (v?.$sum && typeof v.$sum === 'string') {
        const field = v.$sum.replace(/^\$/, '');
        if (['netAmount', 'amount', 'platformFee'].includes(field)) {
          sumFields[field] = true;
        }
      }
    }

    const agg = await prisma.earning.aggregate({
      where: baseWhere,
      _sum: Object.keys(sumFields).length
        ? Object.fromEntries(Object.keys(sumFields).map((f) => [f, true]))
        : { netAmount: true, platformFee: true, amount: true },
      _count: true,
    });

    const result = { _id: null, count: agg._count, transactionCount: agg._count };
    for (const [k, v] of Object.entries(group)) {
      if (k === '_id') continue;
      if (v?.$sum === 1) result[k] = agg._count;
      else if (typeof v?.$sum === 'string') {
        const field = v.$sum.replace(/^\$/, '');
        result[k] = agg._sum?.[field] || 0;
      }
    }
    if (result.total === undefined && agg._sum?.netAmount != null) {
      result.total = Math.abs(agg._sum.netAmount || 0);
    }
    return [result];
  }

  return [];
}

async function runUserInteractionAggregate(match, groupStage, sortStage) {
  const where = {};
  if (match?.product) where.productId = String(match.product._id || match.product);
  if (match?.user) where.userId = String(match.user._id || match.user);
  if (match?.interactionType) where.interactionType = match.interactionType;
  if (match?.createdAt?.$gte) where.createdAt = { gte: match.createdAt.$gte };

  const group = groupStage.$group || groupStage;
  const groupId = group._id;

  if (groupId === '$product') {
    const rows = await prisma.userInteraction.groupBy({
      by: ['productId'],
      where,
      _count: { _all: true },
    });
    const results = rows.map((r) => ({
      _id: r.productId,
      count: r._count._all,
    }));

    const productIds = results.map((r) => r._id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return results.map((r) => ({
      _id: r._id,
      count: r.count,
      product: productMap.get(r._id),
    }));
  }

  if (groupId === '$interactionType') {
    const rows = await prisma.userInteraction.groupBy({
      by: ['interactionType'],
      where,
      _count: { _all: true },
    });
    return rows.map((r) => ({ _id: r.interactionType, count: r._count._all }));
  }

  return [];
}

async function runAIChatLogAggregate(match) {
  const where = {};
  if (match?.createdAt?.$gte) where.createdAt = { gte: match.createdAt.$gte };
  if (match?.createdAt?.$lte) where.createdAt = { ...where.createdAt, lte: match.createdAt.$lte };

  const logs = await prisma.aIChatLog.findMany({ where });

  return [{
    _id: null,
    totalQueries: logs.length,
    avgResponseTime: logs.reduce((s, l) => s + (l.responseTime || 0), 0) / (logs.length || 1),
    totalTokens: logs.reduce((s, l) => s + (l.tokenCount || 0), 0),
    flaggedCount: logs.filter((l) => l.flaggedForReview).length,
    contextBreakdown: logs.map((l) => l.conversationContext),
  }];
}

function getDelegate(modelName) {
  const map = {
    User: prisma.user,
    Product: prisma.product,
    Order: prisma.order,
    CustomOrder: prisma.customOrder,
    Promotion: prisma.promotion,
    Message: prisma.message,
    Earning: prisma.earning,
    CommissionPayment: prisma.commissionPayment,
    WithdrawalAuditLog: prisma.withdrawalAuditLog,
    UserInteraction: prisma.userInteraction,
    AIChatLog: prisma.aIChatLog,
    AlertLog: prisma.alertLog,
    SiteConfig: prisma.siteConfig,
    NotificationSetting: prisma.notificationSetting,
  };
  return map[modelName];
}

module.exports = { runAggregate };
