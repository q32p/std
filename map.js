const isArray = require('./isArray');
const isFunction = require('./isFunction');
const noopHandle = require('./noopHandle');
const getterProvider = require('./get').getter;
const hasOwn = require('./hasOwn');


module.exports = (collection, iteratee, dst, own) => {
  if (!collection) return dst || {};
  isFunction(iteratee) || (iteratee = getterProvider(iteratee) || noopHandle);
  let k = 0, l; // eslint-disable-line
  if (isArray(dst) || isArray(collection)) {
    l = collection && collection.length || 0;
    dst = dst || new Array(l);
    for (; k < l; k++) dst[k] = iteratee(collection[k], k);
    return dst;
  }
  dst = dst || {};
  for (k in collection) { // eslint-disable-line
    own && !hasOwn(collection, k)
      || (dst[k] = iteratee(collection[k], k));
  }
  return dst;
};
