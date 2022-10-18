const isDefined = require('../isDefined');
const isArray = require('../isArray');
const noopHandle = require('../noopHandle');
const base = require('./base');


function arrayHandleProvider(path) {
  return (v) => base(v, path);
}

module.exports = (v) => {
  const type = typeof v;
  return isDefined(v) ? (
    type === 'string'
      ? arrayHandleProvider(v.split('.'))
      : type === 'number'
        ? arrayHandleProvider([v])
        : type === 'object'
          ? (isArray(v) ? arrayHandleProvider(v) : noopHandle)
          : noopHandle(v)
  ) : v;
};
