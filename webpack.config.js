const path = require("path");

module.exports = {
  mode: "development",
  entry: "./lib/plain.js",
  target: "node",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "beetle.js",
  },
};
