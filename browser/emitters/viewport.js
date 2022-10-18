const getViewportSize = require('../getViewportSize');


module.exports = require('../../attachEventEmitable')(window, 'resize')
    .map(getViewportSize, 0, getViewportSize());
