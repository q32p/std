const entries = require('../entries');
const extend = require('../extend');
const getTime = require('../time');
const loopAsync = require('./loop');


/*
  @example

  async function robot(params) {
    // params // => {deviationBuy: -0.5, differenceThreshold: 0.02, maxBalanceOfOneAsset: 0.1}
    let result = 0;
    // some code

    return result;
  }

  getOptimalParamsByRange({
    deviationBuy: [
      -0.5, // min value
      0.9, // max value
      0.1, // step
    ],
    differenceThreshold: [
      0.02,
      0.5,
      0.02,
    ],
    maxBalanceOfOneAsset: [
      0.1,
      1,
      0.05,
    ],
  }, robot).then(([optimalResult, optimalParams]) => {
    console.log({optimalResult, optimalParams});
  });
*/

module.exports = (options, executor, settings) => {
  settings = settings || {};
  const onItem = settings.onItem;
  const lastParams = settings.lastParams;
  const startTime = getTime();

  const optionsItems = entries(options);
  const optionsItemsLength = optionsItems.length;
  let optimalResult = 0;
  let optimalParams;

  let lastTime = startTime;

  return base({}, 0).then(() => {
    return [
      optimalResult,
      optimalParams,
      getTime() - startTime,
      startTime,
    ];
  });

  function base(params, level) {
    if (level === optionsItemsLength) {
      return executor(params).then((result) => {
        result > optimalResult && (
          optimalResult = result,
          optimalParams = params
        );
        if (onItem) {
          const currentTime = getTime();
          onItem([result, params, currentTime - lastTime, lastTime]);
          lastTime = currentTime;
        }
      });
    }
    const option = optionsItems[level];
    const [key, range] = option;
    let [
      value,
      max,
      step,
    ] = range;
    level++;
    lastParams && (value = lastParams[key]);
    return loopAsync(() => value <= max, () => {
      const next = extend({}, params);
      next[key] = value;
      value += step;
      return base(next, level);
    });
  }
};
