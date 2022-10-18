const CancelablePromise = require('../CancelablePromise');
const isLength = require('../isLength');
const forEach = require('../forEach');
const loopMap = require('../loopMap');


module.exports = (items, fn, taskLimit) => {
  return new CancelablePromise((resolve, reject) => {
    if (!isLength(taskLimit = taskLimit || 1)) {
      throw new Error('The taskLimit must be a number');
    }
    let index = 0;
    let completed = 0;
    const length = items && items.length || 0;
    const tasks = loopMap(taskLimit, task);

    function task(taskId) {
      if (index < length) {
        const i = index;
        index++;
        return (new CancelablePromise((resolve) => {
          resolve(fn(items[i], i));
        })).then(() => {
          ++completed < length
            ? (tasks[taskId] = task(taskId))
            : resolve();
        }, onCatch);
      }
    }
    function onCatch(error) {
      forEach(tasks, (item) => {
        item && item.cancel();
      });
      reject(error);
    }
  });
};
