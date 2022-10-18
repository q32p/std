const noop = require('../../../noop');
const attachEvent = require('../../../attachEvent');
const CancelablePromise = require('../../../CancelablePromise');
const {
  rpcProvider,
} = require('../../rpcWrapper');


module.exports = (childWindow, init) => {
  return new CancelablePromise((resolve, reject) => {
    let _cancel = noop;
    function terminate() {
      childWindow = 0;
      _cancel();
    }
    resolve(rpcProvider(null, init, (data) => {
      childWindow && childWindow.postMessage(data, '*');
    }, (emit) => {
      childWindow
        && (_cancel = attachEvent(childWindow.parent, 'message', (e) => {
          emit(e.data);
        }, false));
    }).then((exports) => ({
      terminate,
      exports,
    }), terminate));
    return terminate;
  });
};
