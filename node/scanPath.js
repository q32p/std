const fs = require('fs');
const Path = require('path');
const finallyAll = require('../finallyAll');
const noop = require('../noop');
const CancelablePromise = require('../CancelablePromise');

const regexpPath = /^\.?\.?\/.*/;
const regexpNormalize = /\\/gim;

module.exports = (options) => {
  return new CancelablePromise((resolve) => {
    let _stop;
    finallyAll((inc, dec) => {
      const _each = options.each || noop;
      const _exclude = options.exclude || noop;
      function base(path) {
        inc();
        path = path.replace(regexpNormalize, '/');
        regexpPath.test(path) || (path = './' + path);
        function iteratee(name) {
          base(Path.join(path, name));
        }
        fs.stat(path, (err, stat) => {
          if (_stop) return;
          if (!stat) return dec();
          if (stat.isDirectory()) {
            fs.readdir(path, (err, list) => {
              if (_stop) return;
              list && list.forEach(iteratee);
              dec();
            });
          } else {
            _exclude(path) || _each('found', path);
            dec();
          }
        });
      }
      base(options.path);
    }, resolve);
    return () => {
      _stop = true;
    };
  });
};
