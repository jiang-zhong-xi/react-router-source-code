var webpack = require('webpack')
const path = require('path')
const rootDir = path.resolve(__dirname, '.');

module.exports = {
  entry: './index.js',
  devtool: 'source-map',
  resolve: {
    alias: {
        'react-router': path.resolve(rootDir, 'src/react-router-3.0.0'),
    }
  },
  output: {
    path: 'public',
    filename: 'bundle.js',
    publicPath: '/'
  },

  plugins: process.env.NODE_ENV === 'production' ? [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin()
  ] : [],

  module: {
    loaders: [
      { 
        test: /\.js$/, 
        exclude: /node_modules/, 
        loader: 'babel-loader',
        options: {
            presets: [
                [
                    '@babel/preset-env',
                    {
                        modules: false,
                        useBuiltIns: 'usage',
                        corejs: {
                            version: 3,
                            proposals: true
                        }
                    }
                ],
                '@babel/preset-react'
            ],
            plugins: ['@babel/plugin-proposal-class-properties', ["@babel/plugin-transform-spread", {
              "loose": true
            }]]
        }
      }
    ]
  }
}
