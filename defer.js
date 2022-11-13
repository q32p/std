const delay = require('./delay');
const cancelProvider = require('./cancelProvider');

module.exports = (fn, args, ctx) => {
  try {
    return cancelProvider(clearImmediate, setImmediate(() => {
      fn.apply(ctx || null, args || []);
    }));
  } catch (ex) {
    return delay(fn, 0, args, ctx);
  }
};
