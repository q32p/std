const {
  getData,
} = require('./formatTime');

// eslint-disable-next-line
const token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZWN]|'[^']*'|'[^']*'/g;

module.exports = (date, mask, utc, i18n) => {
  const ctx = getData(date, utc, i18n);
  return ctx ? (mask || 'yyyy-mm-dd HH:MM:ss').replace(token, (match) => {
    return (match in ctx)
      ? ctx[match]
      : match.slice(1, match.length - 1);
  }) : '';
};
