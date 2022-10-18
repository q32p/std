const noop = require('../../../noop');
const attachEvent = require('../../../attachEvent');
const CancelablePromise = require('../../../CancelablePromise');
const {
  rpcProvider,
} = require('../../rpcWrapper');


module.exports = (env) => {
  const parent = window.parent;
  return new CancelablePromise((resolve, reject) => {
    function terminate(error) {
      error && console.error(error);
      _stop = 1;
      _cancel();
    }
    let _stop;
    let _cancel = noop;
    resolve(rpcProvider(env || {}, null, (data) => {
      _stop || parent.postMessage(data, '*');
    }, (emit) => {
      _stop || (_cancel = attachEvent(window, 'message', (e) => {
        emit(e.data);
      }, false));
    }).then((exports) => ({
      terminate,
      exports,
    }), terminate));
    return terminate;
  });
};
