const loopAsync = require('./loop');


module.exports = (items, fn) => {
  const length = items && items.length || 0;
  let index = 0;
  return loopAsync(() => index < length, () => {
    const i = index;
    index++;
    return fn(items[i], i);
  });
};
