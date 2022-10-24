const create = require('../create');
const delay = require('../delay');
const defer = require('../defer');
const eachApply = require('../eachApply');
const executeTry = require('../executeTry');
const isObject = require('../isObject');
const isFunction = require('../isFunction');
const isPromise = require('../isPromise');
const isArray = require('../isArray');
const forEach = require('../forEach');
const map = require('../map');
const getter = require('../get/getter');


module.exports = function(ctx) {
  ctx = ctx || {};
  const deferApply = ctx.defer || defer;
  const ParentClass = ctx.ParentClass;

  function thenCall(chain, onResolve, onReject, onCancel) {
    if (onCancel && !isFunction(onCancel)) {
      throw new Error('onCancel param must be a function');
    }

    onResolve = getter(onResolve);
    if (onResolve && !isFunction(onResolve)) {
      throw new Error('onResolve param must be a function');
    }

    onReject = getter(onReject);
    if (onReject && !isFunction(onReject)) {
      throw new Error('onReject param must be a function');
    }

    return new CancelablePromise((__resolve, __reject) => {
      function clear() {
        cancel = __reject = __resolve = onResolve = onReject = onCancel = 0;
      }
      let cancel = chain(
        onResolve ? (subject) => {
          try {
            __resolve && __resolve(onResolve(subject));
          } catch (ex) {
            __reject && __reject(ex);
          }
          clear();
        } : __resolve,
        onReject ? (error) => {
          try {
            __resolve && __resolve(onReject(error));
          } catch (ex) {
            __reject && __reject(ex);
          }
          clear();
        } : __reject,
      );
      chain = 0;
      return onCancel ? () => {
        cancel && (
          cancel(),
          onCancel && onCancel(),
          clear()
        );
      } : cancel;
    });
  }

  function finallyCall(chain, onFinally) {
    if (!isFunction(onFinally)) {
      throw new Error('The argument can only be a function');
    }
    const promise = thenCall(
        chain,
        (subject) => {
          executeTry(onFinally, [null, subject], null, onErrorFinally);
          return subject;
        },
        (subject) => {
          executeTry(onFinally, [subject], null, onErrorFinally);
          throw subject;
        },
        () => {
          executeTry(onFinally, [null, null, true], null, onErrorFinally);
        },
    );
    chain = 0;
    promise._hasErrorHandle = 1;
    return promise;
  }

  function CancelablePromise(executor) {
    const self = this;
    let pool = [];
    let args;
    let applied;
    let cancelInner = cancelNoop;
    let cancelResolve = cancelNoop;
    function normalizeWrap(onResolve) {
      return (subject) => {
        if (applied) return cancelNoop;
        applied = 1;
        cancelResolve = isPromise(subject)
          ? subject.then(onResolve, reject).cancel || cancelNoop
          : deferApply(onResolve, [subject]);
        subject = 0;
        return cancelResolve;
      };
    }
    function resolve(_subject, hasError) {
      args || (
        args = [_subject, hasError],
        eachApply(pool),
        pool = 0,
        cancelResolve = cancelInner = cancelNoop
      );
    }
    function reject(_subject) {
      pool.length
        || self._hasErrorHandle
        || console.error('Unhandled promise rejection:', _subject);
      resolve(_subject, 1);
    }

    const _resolve = self.resolve = normalizeWrap(resolve);
    const _reject = self.reject = normalizeWrap(reject);
    const init = subscribleInit(() => {
      function setCancel(_cancel) {
        isFunction(_cancel) && (cancelInner = _cancel);
      }
      let cancel;
      if (executor) {
        if (!isFunction(executor)) {
          throw new Error('Executor param must be a function');
        }
        try {
          cancel = executor(_resolve, _reject);
          executor = 0;
          isPromise(cancel)
            ? setCancel(cancel.then(setCancel).cancel)
            : setCancel(cancel);
        } catch (ex) {
          _reject(ex);
        }
      }
      return () => {
        args || (
          args = [new Error('Already canceled'), 1],
          executeTry(cancelResolve, null, null, onErrorCancel),
          executeTry(cancelInner, null, null, onErrorCancel),
          cancelResolve = cancelInner = cancelNoop
        );
        pool = 0;
      };
    }, _reject);
    self.cancel = init();

    function __chain(onResolve, onReject) {
      let cancel = init();
      function handle() {
        cancel && (args[1] ? onReject : onResolve)(args[0]);
        onResolve = onReject = cancel = 0;
      }
      if (args) return deferApply(handle);
      pool.push(handle);

      return () => {
        cancel && (
          cancel(),
          cancel = 0
        );
      };
    }

    self.then = (
        onResolve, onReject, onCancel,
    ) => thenCall(__chain, onResolve, onReject, onCancel);
    self.catch = (
        onReject, onCancel,
    ) => thenCall(__chain, null, onReject, onCancel);
    self.finally = (onFinally) => finallyCall(__chain, onFinally);
    self.onCancel = (onCancel) => thenCall(__chain, null, null, onCancel);
  }

  CancelablePromise.resolve = (subject) => {
    return new CancelablePromise((resolve) => {
      resolve(subject);
    });
  };
  CancelablePromise.reject = (subject) => {
    return new CancelablePromise((resolve, reject) => {
      reject(subject);
    });
  };
  CancelablePromise.all = (promises) => {
    return new CancelablePromise((resolve, reject) => {
      if (!isObject(promises)) {
        throw new TypeError('argument may only be an Object: ' + promises);
      }
      function clear() {
        stop = 1;
        forEach(pendingPromises, cancelPromise);
      }
      function onReject(subject) {
        if (stop) return;
        clear();
        reject(subject);
      }
      function setValue(key, value) {
        output[key] = value;
        ++loaded < length || resolve(output);
      }
      function step(value, key) {
        isPromise(value)
          ? pendingPromises.push(value.then(
              (value) => setValue(key, value),
              onReject,
          ))
          : setValue(key, value);
      }
      const pendingPromises = [];
      let stop;
      let output;
      let loaded = 0;
      let length = 1;
      let k;
      if (isArray(promises)) {
        output = new Array(length = promises.length);
        forEach(promises, step);
      } else {
        output = {};
        for (k in promises) { // eslint-disable-line
          length++;
          step(promises[k], k);
        }
        length--;
      }
      loaded < length || resolve(output);
      return clear;
    });
  };
  CancelablePromise.race = (promises) => {
    return new CancelablePromise((resolve, reject) => {
      if (!isObject(promises)) {
        throw new TypeError('argument may only be an Object: ' + promises);
      }
      function clear() {
        stop = 1;
        forEach(pendingPromises, cancelPromise);
      }
      function onResolve(subject) {
        if (stop) return;
        clear();
        resolve(subject);
      }
      function setError(key, error) {
        errors[key] = error;
        ++loaded < length || reject(errors);
      }
      function step(value, key) {
        isPromise(value)
          ? (stop
            ? cancelPromise(value)
            : pendingPromises.push(value.then(
                onResolve,
                (error) => setError(key, error),
            ))
          )
          : stop || onResolve(value);
      }
      const pendingPromises = [];
      let stop;
      let errors;
      let loaded = 0;
      let length = 1;
      let k;
      if (isArray(promises)) {
        errors = new Array(length = promises.length);
        forEach(promises, step);
      } else {
        errors = {};
        for (k in promises) { // eslint-disable-line
          length++;
          step(promises[k], k);
        }
        length--;
      }
      loaded < length || reject(errors);
      return clear;
    });
  };
  CancelablePromise.delay = (_delay, fn, subject, self) => {
    return new CancelablePromise((resolve) => {
      return isFunction(fn) ? delay(() => {
        resolve(fn.call(self, subject));
      }, _delay) : delay(resolve, _delay, [fn]);
    });
  };
  CancelablePromise.provide = (executor) => {
    return new CancelablePromise(executor);
  };
  CancelablePromise.defer = (fn, subject, self) => {
    return new CancelablePromise((resolve) => deferApply(() => {
      resolve(isFunction(fn) ? fn.call(self, subject) : fn);
    }));
  };
  CancelablePromise.promisify = (fn, self) => {
    return function() {
      const _self = self || this, args = map(arguments, null, []); // eslint-disable-line
      return new CancelablePromise((resolve, reject) => {
        args.push((error, result) => {
          error
            ? reject(error)
            : resolve(result);
        });
        return fn.apply(_self, args);
      });
    };
  };
  CancelablePromise.promisifyStream = (stream, onReadable) => {
    return new CancelablePromise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
      stream.on('readable', () => {
        onReadable(_read);
      });
      function _read() {
        return stream.read();
      }
      return () => {
        stream.destroy();
      };
    });
  };

  ParentClass && (CancelablePromise.prototype = create(ParentClass.prototype));

  return CancelablePromise;
};
function onErrorCancel(error) {
  console.error('An error occurred in the "cancel" callback:', error);
}
function onErrorFinally(error) {
  console.error('An error occurred in the "finally" callback:', error);
}
function cancelNoop() {
  return false;
}
function cancelPromise(promise) {
  promise.cancel && promise.cancel();
}
function subscribleInit(init) {
  let count = -1;
  let cancel = init();
  init = 0;
  function cancelFn() {
    if (!cancel) return false;
    if (--count < 1) {
      cancel();
      cancel = 0;
    }
    return true;
  }
  return () => {
    return cancel
      ? (count++, cancelFn)
      : cancelNoop;
  };
}
