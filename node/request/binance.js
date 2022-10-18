const crypto = require('crypto');
const http = require('http');
const https = require('https');
const noopHandle = require('../../noopHandle');
const loopMap = require('../../loopMap');
const forEach = require('../../forEach');
const extend = require('../../extend');
const toLower = require('../../toUpper');
const getTime = require('../../time');
const formatTime = require('../../formatTime');
const {
  intval,
} = require('../../anyval');
const param = require('../../param');
const urlParse = require('../../urlParse');
const CancelablePromise = require('../../CancelablePromise');
const {
  delay: cancelablePromiseDelay,
  resolve: cancelablePromiseResolve,
  all: cancelablePromiseAll,
} = CancelablePromise;
const {
  provider,
} = require('./Response');


const DEFAULT_RETRY_LIMIT = 3;
const DEFAULT_RETRY_TIMEOUT = 10;
const DEFAULT_TASK_LIMIT = 1;

function onError(error) {
  console.error('binance', error);
}

module.exports = (options) => {
  options = options || {};
  const retry = options.retry;
  const minLatency = intval(options.minLatency, 0, 0);
  const taskLimit = intval(options.taskLimit, DEFAULT_TASK_LIMIT, 1);
  const retryTimeout
    = intval(options.retryTimeoutSec, DEFAULT_RETRY_TIMEOUT, 0);
  const retryLimit = intval(options.retryLimit, DEFAULT_RETRY_LIMIT, 0);
  const timestampKey = options.timestampKey || 'timestamp';
  const apiSecret = options.apiSecret;
  const headers = options.headers || {};
  const baseUrl = options.baseUrl || '';
  const _promises = loopMap(taskLimit, cancelablePromiseResolve);
  let _requestId = 0;
  let _lockedTime = 0;

  const promiseWithLatency = minLatency
    ? ((promise) => {
      let _error;
      return cancelablePromiseAll([
        promise.catch((error) => {
          _error = error;
        }),
        cancelablePromiseDelay(minLatency),
      ]).then((response) => {
        if (_error) {
          throw _error;
        }
        return response[0];
      });
    })
    : noopHandle;

  function request(method, path, _params, sign) {
    const id = ++_requestId;
    const taskIndex = id % taskLimit;
    const opts = {
      method,
      headers,
    };

    let numberOfRetries = 0;

    return _promises[taskIndex] = _promises[taskIndex]
        .then(base)
        .catch(onError);

    function base() {
      const time = getTime();
      if (_lockedTime > time) {
        return cancelablePromiseDelay(_lockedTime - time).then(base);
      }

      const params = extend({}, _params);
      sign && (params[timestampKey] = time);
      let queryString = param(params);
      const signature = sign && apiSecret
        ? crypto
            .createHmac('sha256', apiSecret)
            .update(queryString)
            .digest('hex')
        : '';

      signature && (queryString += '&signature=' + signature);

      const loc = urlParse(baseUrl + path
        + (queryString ? ('?' + queryString) : ''));
      const url = loc.href;

      function throwError(error, message) {
        error.id = id;
        error.time = formatTime();
        error.method = method;
        error.url = url;
        message && (error.message = message);
        console.error(error);
        throw error;
      }

      return promiseWithLatency((new CancelablePromise((resolve, reject) => {
        const req = (loc.protocol === 'https' ? https : http)
            .request(url, opts, resolve)
            .on('error', reject);

        // body && req.write(body);
        req.end();
        return () => {
          req.abort();
        };
      })).then((response) => {
        const {
          statusCode,
          headers,
        } = response;
        const retryAfter = headers['x-retry-after'] || headers['retry-after'];
        const timeToWait = intval(retryAfter, retryTimeout, 0) * 1000;

        _lockedTime = getTime() + timeToWait;

        if (
          retry && (
            statusCode === 503
            || statusCode === 429
            || statusCode === 418
          )
        ) {
          numberOfRetries++;
          if (numberOfRetries > retryLimit) {
            throwError({
              response: provider(response),
            }, `${formatTime()} Request ${id} on ${method} ${url
            }. The retry limit has been exceeded`);
          }
          // eslint-disable-next-line
          console.log(`${formatTime()} Request ${id} on ${method} ${url}. You have reached the rate limit for the API. Please retry in ${
            retryAfter} seconds`);

          return cancelablePromiseDelay(timeToWait).then(base);
        }

        response = provider(response);

        return response.json().then((data) => {
          const {
            msg,
          } = data;
          if (msg) {
            throwError(data);
          }
          return {
            status: statusCode,
            headers,
            data,
          };
        }, (error) => {
          if (statusCode >= 400 && statusCode <= 600) {
            throwError({
              code: statusCode,
              response,
            }, `Request on ${method} ${url} returned error code: ${
              statusCode}`);
          }
          throw error;
        });
      }));
    }
  }

  forEach([
    'POST',
    'GET',
    'DELETE',
  ], (method) => {
    request[toLower(method)] = (path, params) => {
      return request(method, path, params);
    };
  });

  return request;
};
