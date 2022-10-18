const immediate = require('../defer');
const noop = require('../noop');
const CancelablePromise = require('../CancelablePromise');
const isPromise = require('../isPromise');


module.exports = (checkFn, statementFn) => {
  return new CancelablePromise((resolve, reject) => {
    let _cancel = noop;
    function next() {
      try {
        if (checkFn()) {
          const result = statementFn();
          _cancel = isPromise(result)
            ? result.then(next, reject).cancel || noop
            : immediate(next);
        } else {
          resolve();
        }
      } catch (ex) {
        reject(ex);
      }
    }

    next();
    return () => {
      _cancel();
    };
  });
};
