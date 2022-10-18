const CancelablePromise = require('../CancelablePromise');
const Emitter = require('../Emitter');
const slice = require('../slice');
const isArray = require('../isArray');
const isPromise = require('../isPromise');
const isEmitter = require('../isEmitter');
const isDate = require('../isDate');
const isRegExp = require('../isRegExp');
const regexpParse = require('../regexpParse');
const noop = require('../noop');
const map = require('../map');
const concat = require('../concat');
const indexOf = require('../indexOf');
const getTime = require('../time');
const __get = require('../get');

const {
  all: cancelablePromiseAll,
  resolve: cancelablePromiseResolve,
} = CancelablePromise;


const RPC_RESULT_HAS_ERROR = 0;
const RPC_RESULT_DATA = 1;
const RPC_RESULT_ERROR = 2;

const RPC_TYPE_FUNCTION = 0;
const RPC_TYPE_OBJECT = 1;
const RPC_TYPE_TIME = 2;
const RPC_TYPE_REGEXP = 3;
const RPC_TYPE_EMITTER = 4;
const RPC_TYPE_PROMISE = 5;

const RPC_MSG_GET_TASK = 0;
const RPC_MSG_REQUEST = 1;
const RPC_MSG_RESPONSE = 2;
const RPC_MSG_CANCEL = 3;

const RPC_TASK_ARGS = 0;
const RPC_TASK_NEXT = 1;
const RPC_TASK_CANCEL = 2;

const INIT_FN_NAME = 'RPC_CONNECTION_INIT';

let _lastId = 0;


function getUniqId() {
  return `rpc_${++_lastId}_${getTime()}`;
}

function rpcProvider(env, init, emit, on) {
  const defers = {};
  const fns = {};
  const handlers = [];
  let promises = {}, current, last = []; // eslint-disable-line

  fns[INIT_FN_NAME] = init || noop;
  handlers[RPC_MSG_GET_TASK] = start;
  handlers[RPC_MSG_REQUEST] = (taskId, req) => {
    if (!req) {
      return;
    }
    const result = execute(__get(fns, req[0]), req[1]);
    const data = result[RPC_RESULT_DATA];
    (
      promises[taskId] = isPromise(data)
        ? data.then(normalizePromise, errorProvider)
        : cancelablePromiseResolve(result)
    ).then((response) => {
      let encoded;
      try {
        encoded = rpcEncode(response, fns, getUniqId());
      } catch (e) {
        encoded = rpcEncode(errorProvider(e));
      }
      emit([
        RPC_MSG_RESPONSE, [taskId, encoded],
      ]);
    }).finally(() => {
      delete promises[taskId];
    });
    emit([RPC_MSG_GET_TASK]);
  };
  handlers[RPC_MSG_RESPONSE] = (taskId, res) => {
    const task = defers[taskId];
    delete defers[taskId];
    const args = task && task[RPC_TASK_ARGS];
    const error = res[RPC_RESULT_HAS_ERROR];
    args && (
      error
        ? args[2](error)
        : args[1](res[RPC_RESULT_DATA])
    );
    start();
  };
  handlers[RPC_MSG_CANCEL] = (taskId) => {
    const promise = promises[taskId];
    const cancel = promise && promise.cancel;
    delete promises[taskId];
    cancel && cancel();
  };
  function start() {
    let prev;
    while (prev = current) {
      current = prev[RPC_TASK_NEXT];
      if (prev[RPC_TASK_ARGS]) return __start(prev);
    }
  }
  function __start(task) {
    const args = task[RPC_TASK_ARGS];
    const params = args[0];
    const taskId = getUniqId();
    defers[taskId] = task;
    task[RPC_TASK_CANCEL] = () => {
      if (defers[taskId]) {
        emit([RPC_MSG_CANCEL, [taskId]]);
        delete defers[taskId];
      }
    };

    emit([RPC_MSG_REQUEST, [
      taskId,
      rpcEncode(params[1], fns, params[0]), // eslint-disable-line
    ]]);
  }
  function invokeBase(slotId, ctx) {
    return new CancelablePromise((resolve, reject) => {
      last = last[RPC_TASK_NEXT] = [
        [[slotId, ctx], resolve, reject],
      ];
      current || (current = last, start());
      return subscriptionWrap(last);
    });
  }
  function invoke(ctx) {
    const slotId = getUniqId();
    return invokeBase(slotId, ctx).finally(() => {
      delete fns[slotId];
    });
  }
  function getFn(fnName) {
    return function() {
      return invoke([fnName, slice(arguments)]); // eslint-disable-line
    };
  }

  on((response, handle, options, taskId) => {
    response
      && (options = response[1])
      && (taskId = options[0])
      && (handle = handlers[response[0]])
      && rpcDecode(options[1], getFn)
          .then((v) => handle(taskId, v));
  });

  return invokeBase(getUniqId(), [INIT_FN_NAME, [env]]);
}
function adaptEmitter(input$) {
  const {
    on,
  } = input$;
  const output$ = map(input$);
  output$.on = (v) => {
    return new CancelablePromise(() => {
      return on(v);
    });
  };
  return output$;
}
function rpcEncode(src, scope, name) {
  function withFn(src, scope, name, prefix, excludes) {
    if (!src) return src;
    const type = typeof src;
    if (type === 'function') {
      scope[name] = src;
      return [RPC_TYPE_FUNCTION, prefix + name];
    }
    if (type === 'object') {
      if (isDate(src)) return [RPC_TYPE_TIME, src.toISOString()];
      if (isRegExp(src)) return [RPC_TYPE_REGEXP, src.toString()];
      if (indexOf(excludes, src) > -1) {
        throw new Error('Converting circular structure to RPC params'
          + (property ? ' in property "' + prefix + name + '"': ''));
      }
      excludes = concat(excludes, [src]);
      if (isEmitter(src)) src = adaptEmitter(src);
      prefix += name + '.';
      scope = scope[name] = {};
      let k, dst, length; // eslint-disable-line
      if (isArray(src)) {
        dst = new Array(length = src.length);
        for (k = 0; k < length; k++) {
          dst[k] = withFn(src[k], scope, k, prefix, excludes);
        }
      } else {
        dst = {};
        // eslint-disable-next-line
        for (k in src) dst[k] = withFn(src[k], scope, k, prefix, excludes);
      }
      return [RPC_TYPE_OBJECT, dst];
    }
    return src;
  }
  function base(src, name, prefix, excludes) {
    if (!src) {
      return src;
    }
    const type = typeof src;
    if (type === 'function') {
      return null;
    }
    if (type !== 'object') {
      return src;
    }
    if (isRegExp(src)) {
      return [RPC_TYPE_REGEXP, src.toString()];
    }
    if (isDate(src)) {
      return [RPC_TYPE_TIME, src.toISOString()];
    }
    if (indexOf(excludes, src) > -1) {
      throw new Error('Converting circular structure to RPC params'
        + (property ? ' in property "' + prefix + name + '"': ''));
    }
    excludes = concat(excludes, [src]);
    prefix += name + '.';
    let k, output; // eslint-disable-line
    if (isArray(src)) {
      const length = src.length;
      const output = new Array(length);
      for (let k = 0; k < length; k++) {
        output[k] = base(src[k], k, prefix, excludes);
      }
      return output;
    }
    isEmitter(src) && (src = adaptEmitter(src));
    for (k in src) { // eslint-disable-line
      output[k] = base(src[k], k, prefix, excludes);
    }
    return output;
  }
  return scope ? withFn(src, scope, name, '', []) : base(src, name, '', []);
}
function rpcDecode(value, getFn) {
  const promies = [];
  getFn = getFn || noop;
  function unpack(v) {
    if (!isArray(v)) return v;
    let type = v[0], value = v[1], matchs; // eslint-disable-line
    if (type === RPC_TYPE_FUNCTION) return getFn(value);
    if (type === RPC_TYPE_TIME) return new Date(value);
    if (type === RPC_TYPE_REGEXP) {
      matchs = regexpParse(value);
      return new RegExp(matchs[1], matchs[2]);
    }

    value = map(value, unpack);

    if (isEmitter(value)) {
      const emitter$ = new Emitter();
      const {
        emit,
      } = emitter$;
      value.on(emit);
      promies.push(value.getValue().then(emit));
      return emitter$.map();
    }

    return value;
  }
  const output = unpack(value);
  return cancelablePromiseAll(promies)
      .then(() => output);
}

function normalizePromise(data) {
  return [0, data];
}
function errorProvider(error) {
  return [1, null, error];
}
function execute(fn, data) {
  try {
    return [0, fn.apply(null, data)]; // eslint-disable-line
  } catch (ex) {
    return errorProvider(ex);
  }
}
function subscriptionWrap(current) {
  return () => {
    if (current) {
      const cancel = current[RPC_TASK_CANCEL];
      cancel && cancel();
      delete current[RPC_TASK_ARGS];
      current = null;
    }
  };
}

module.exports = {
  RPC_RESULT_HAS_ERROR,
  RPC_RESULT_DATA,
  RPC_RESULT_ERROR,

  RPC_TYPE_FUNCTION,
  RPC_TYPE_TIME,
  RPC_TYPE_PROMISE,
  RPC_TYPE_EMITTER,
  RPC_TYPE_REGEXP,
  RPC_RESULT_ERROR,

  RPC_MSG_REQUEST,
  RPC_MSG_RESPONSE,
  RPC_MSG_GET_TASK,
  RPC_MSG_CANCEL,

  RPC_TASK_ARGS,
  RPC_TASK_NEXT,
  RPC_TASK_CANCEL,

  rpcProvider,
  rpcEncode,
  rpcDecode,
};
