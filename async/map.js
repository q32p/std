const resolve = require('../CancelablePromise').resolve;
const getKeys = require('../keys');
const isArray = require('../isArray');
const isFunction = require('../isFunction');
const noopHandle = require('../noopHandle');
const getterProvider = require('../get').getter;
const loopAsync = require('./loop');


function mapArray(items, iteratee, output) {
  const length = items.length || 0;
  let index = 0;
  output || (output = new Array(length));
  return loopAsync(() => index < length, () => {
    const i = index;
    index++;
    return resolve(iteratee(items[i], i)).then((item) => {
      output[i] = item;
    });
  }).then(() => output);
}

function mapObj(collection, iteratee, output) {
  const keys = getKeys(collection);
  const length = keys.length;
  let index = 0;
  output || (output = {});
  return loopAsync(() => index < length, () => {
    const key = keys[index];
    index++;
    return resolve(iteratee(collection[key], key)).then((item) => {
      output[key] = item;
    });
  }).then(() => output);
}

module.exports = (collection, iteratee, output) => {
  return collection ? (
    isArray(output) || isArray(collection)
      ? mapArray
      : mapObj
  )(
      collection,
      isFunction(iteratee)
        ? iteratee
        : (getterProvider(iteratee) || noopHandle),
      output,
  ) : resolve(output || {});
};
