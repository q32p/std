const {
  open,
  read,
  close,
} = require('fs');
const childClass = require('../../childClass');
const extend = require('../../extend');


const DEFAULT_BUFFER_LENGTH = 1024 * 4;


const ReadUnopened = childClass(require('stream').Readable, (
    self, _super, options,
) => {
  options = extend({}, options);
  const _path = options.path;
  const _bufferLength = options.bufferLength || DEFAULT_BUFFER_LENGTH;
  let _position = 0;
  delete options.path;
  delete options.bufferLength;

  _super(options);

  self._read = () => {
    open(_path, 'r', (error, fd) => {
      if (error) {
        self.push(null);
        // self.destroy(error);
        console.error(error);
        return;
      }
      const buffer = new Buffer(_bufferLength);
      read(fd, buffer, 0, _bufferLength, _position, (error, bytesRead) => {
        error
          ? self.destroy(error)
          : self.push(
            bytesRead > 0
              ? (
                _position += bytesRead,
                bytesRead === _bufferLength
                  ? buffer
                  : buffer.slice(0, bytesRead)
              )
              : null,
          );
        close(fd, (error) => {
          // error && self.destroy(error);
          error && console.error(error);
        });
      });
    });
  };
});

/*
const readableStream = readUnopened('./input.jsonl', {
  bufferLength: 1024 * 8,
});
*/
function readUnopened(path, options) {
  return new ReadUnopened(extend({
    path: path,
  }, options));
}

readUnopened.ReadUnopened = ReadUnopened;

module.exports = readUnopened;
