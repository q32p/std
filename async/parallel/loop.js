const loopMap = require('../../loopMap');
const isLength = require('../../isLength');
const {
  resolve: cancelablePromiseResolve,
  all: cancelablePromiseAll,
} = require('../../CancelablePromise');


module.exports = (checkFn, statementFn, taskLimit) => {
  if (!isLength(taskLimit = taskLimit || 1)) {
    throw new Error('The taskLimit must be a number');
  }
  let _executing = 1;
  return cancelablePromiseAll(loopMap(taskLimit, () => {
    return cancelablePromiseResolve().then(next);
  }));
  function next() {
    if (_executing && checkFn()) {
      return cancelablePromiseResolve(statementFn())
          .then(next);
    }
    _executing = 0;
  }
};
