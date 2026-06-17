module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/index.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
   // Externalize @noble/secp256k1 so it's loaded at runtime via require()
   // instead of being bundled (ESM modules can't be bundled by webpack)
  externals: {
    '@noble/secp256k1': 'commonjs @noble/secp256k1',
  },
}
