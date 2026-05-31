const path = require('path')

const CopyWebpackPlugin = require('copy-webpack-plugin')

const rules = require('./webpack.rules')


const assets = [ './static/assets' ] // asset directories

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: assets.map(asset => ({
        from: path.resolve(__dirname, 'src', asset),
        to: asset,
      })),
    }),
  ],
}