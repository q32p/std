const CancelablePromise = require('./CancelablePromise');
const {
  resolve: cancelablePromiseResolve,
  delay: cancelablePromiseDelay,
} = CancelablePromise;


module.exports = (fn, delay, ctx) => {
	let _hasDebounce, _args, result = cancelablePromiseResolve(); // eslint-disable-line
  function exec() {
    _hasDebounce = 0;
    return fn.apply(ctx, _args);
  }
  return function() {
    _args = arguments; // eslint-disable-line
    _hasDebounce || (_hasDebounce = 1, result = cancelablePromiseDelay(delay).then(exec));
    return result;
  };
};
