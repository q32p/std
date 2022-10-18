const REGEXP_CHAR = /[\\^$.*+?()[\]{}|]/g;

module.exports = (v) => v.replace(REGEXP_CHAR, '\\$&');
