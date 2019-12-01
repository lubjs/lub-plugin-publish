"use strict";
const path = require("path");

module.exports = {
  plugins: require.resolve(path.join(__dirname, "../../../index.js"))
};
