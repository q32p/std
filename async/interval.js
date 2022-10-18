const delay = require('../delay');
const noop = require('../noop');
const isPromise = require('../isPromise');


module.exports = (fn, _delay, args, self) => {
  let _cancel;
  nextLazy();
  function next(promise) {
    try {
      isPromise(promise = fn.apply(self || null, args || []))
        ? (_cancel = promise.then(nextLazy, nextLazy).cancel || noop)
        : nextLazy();
    } catch (ex) {
      console.error(ex);
      nextLazy();
    }
  }
  function nextLazy() {
    _cancel = delay(next, _delay);
  }
  return () => {
    _cancel();
  };
};
