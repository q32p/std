const isArray = require('./isArray');

module.exports = (collection, iteratee, accumulator, hasArray, i, l) => {
  if (hasArray || isArray(collection)) {
    for (l = collection && collection.length || 0, i = 0; i < l; i++) {
      accumulator = iteratee(accumulator, collection[i], i, collection);
    }
    return accumulator;
  }
  for (i in collection) { //eslint-disable-line
    accumulator = iteratee(accumulator, collection[i], i, collection);
  }
  return accumulator;
};
