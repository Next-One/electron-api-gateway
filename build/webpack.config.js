const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');

module.exports = {
  entry: {
    ApiMain: './src/ApiServer/ApiGateway.js',
    ApiRenderer: './src/ApiClient/ApiClient.js'
  },
  output: {
    filename: '[name].js',
    chunkFilename: 'common.[name].js',
    libraryTarget: 'commonjs2',
    path: path.resolve(__dirname, '../dist')
  },
  mode: 'production',
  target: 'electron-main',
  plugins: [
    new CleanWebpackPlugin()
  ],
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 20000,
      minRemainingSize: 0,
      maxSize: 2000000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true
        },
        default: {
          minChunks: 1,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    }
  }
};
