const {
  writeFile,
  mkdir,
} = require('fs');
const {
  dirname,
} = require('path');
const find = require('../../find');
const isFunction = require('../../isFunction');


module.exports = function(outputFileName) {
  const args = arguments; // eslint-disable-line
  const dname = dirname(outputFileName);
  dname ? mkdir(dname, {
    recursive: true,
  }, write) : write();
  function write(error, onFinally) {
    error ? (
      onFinally = find(args, isFunction),
      onFinally && onFinally(error)
    ) : writeFile.apply(null, args); // eslint-disable-line
  }
};
