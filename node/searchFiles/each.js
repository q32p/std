const fs = require('fs');
const pathLib = require('path');
const CancelablePromise = require('../../CancelablePromise');
const noop = require('../../noop');

function defaultFilter() {
  return true;
}

module.exports = (folderPath, iteratee) => {
  return new CancelablePromise((resolve, reject) => {
    options || (options = {});
    const filter = options.filter || defaultFilter;
    const iteratee = options.iteratee || noop;
    let _stop = false;
    let _taskCount = 0;

    base(folderPath, pathLib.basename(folderPath));

    function dec() {
      --_taskCount || resolve();
    }
    function base(path, name) {
      _taskCount++;
      fs.lstat(path, (err, stats) => {
        if (_stop) {
          return;
        }
        if (err) {
          return dec();
        }
        const isDir = stats.isDirectory();
        if (!filter(name, isDir)) {
          return dec();
        }
        if (!isDir) {
          iteratee(path);
          return dec();
        }
        fs.readdir(path, (err, files) => {
          if (_stop) {
            return;
          }
          if (err) {
            return dec();
          }
          const length = files.length;
          let i = 0;
          let name;
          for (; i < length; i++) {
            name = files[i];
            base(pathLib.join(path, name), name);
          }
          dec();
        });
      });
    }
    return () => {
      _stop = true;
    };
  });
};
