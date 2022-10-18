const CancelablePromise = require('./CancelablePromise');
const noop = require('./noop');
const DEFAULT_LIMIT = 100;


module.exports = (stream, limit) => {
  limit = limit || DEFAULT_LIMIT;
  let _hasReadable;
  let _hasEnd;
  let _hasError;
  let _error;
  let _reject = noop;
  let _resolve = noop;
  let _onReadable = noop;
  let _items = [];

  stream.on('end', () => {
    _hasEnd = 1;
    _resolve();
  });
  stream.on('error', (error) => {
    // console.error('error');
    _hasEnd = 1;
    _hasError = 1;
    _reject(_error = error);
  });
  stream.on('readable', () => {
    _hasReadable = 1;
    _onReadable();
  });
  function cancel() {
    stream.destroy();
  }
  return () => {
    return new CancelablePromise((resolve, reject) => {
      let executed;
      if (_hasError) {
        reject(_error);
        return;
      }
      _resolve = () => {
        if (executed) return;
        executed = 1;
        const items = _items.slice(0, limit);
        _items = _items.slice(limit);
        resolve(items);
      };
      _onReadable = () => {
        if (executed) return;
        let item;
        while ((item = stream.read()) !== null) {
          _items.push(item);
        }
        executed || _items.length < limit || _resolve();
      };
      if (_hasEnd) {
        _onReadable();
        _resolve();
        return cancel;
      }
      _reject = reject;
      _hasReadable && _onReadable();
      return cancel;
    });
  };
};
