const {
  resolve: cancelablePromiseResolve,
} = require('../CancelablePromise');

module.exports = (checkFn, statementFn) => {
  function next() {
    if (checkFn()) {
      return cancelablePromiseResolve(statementFn())
          .then(next);
    }
  }
  return cancelablePromiseResolve().then(next);
};
