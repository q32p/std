/**
 * @overview getParamsVariants
 * @author Amir Absalyamov <mr.amirka@ya.ru>
 */
const entries = require('./entries');
const extend = require('./extend');
const isArray = require('./isArray');


module.exports = (options) => {
  const optionsItems = entries(options);
  const optionsItemsLength = optionsItems.length;

  const paramsItems = [];

  base({}, 0);

  return paramsItems;

  function base(params, level, key, value) {
    params = extend({}, params);
    key && (params[key] = value);
    if (level === optionsItemsLength) {
      paramsItems.push(params);
      return;
    }
    const option = optionsItems[level];
    const range = option[1];
    key = option[0];
    level++;
    if (!isArray(range)) {
      base(params, level, key, range);
      return;
    }

    value = range[0];
    const max = range[1];
    const step = range[2];
    for (; value <= max; value += step) {
      base(params, level, key, value);
    }
  }
};
