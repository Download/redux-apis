var fs = require('fs');
var path = require('path');
var webpack = require('webpack');

module.exports = {
	// The base directory (absolute path!) for resolving the entry option.
	// If output.pathinfo is set, the included pathinfo is shortened to this directory.
	context: path.resolve('src'),

	resolve: {
		// IMPORTANT: Setting this option will override the default, meaning that webpack
		// will no longer try to resolve modules using the default extensions. If you want
		// modules that were required with their extension (e.g. require('./somefile.ext'))
		// to be properly resolved, you must include an empty string in your array.
		// Similarly, if you want modules that were required without extensions (e.g.
		// require('underscore')) to be resolved to files with “.js” extensions, you must
		// include ".js" in your array.
		// Default: ["", ".webpack.js", ".web.js", ".js"]
		// https://webpack.github.io/docs/configuration.html#resolve-extensions
		extensions: ['', '.js', '.jsx'],
	},

	module: {
		loaders: [
			{
				test: /\.jsx/,
				exclude: /node_modules/,
				loader: 'babel',
			},
		],
		noParse: /\.min\.js/,
	},

	devtool: '#cheap-module-source-map',
/*
	// Options affecting the output.
	// If you use any hashing ([hash] or [chunkhash]) make sure to have a consistent ordering of modules. Use the OccurenceOrderPlugin or recordsPath.
	output: {
		// The output directory as absolute path (required).
		// [hash] is replaced by the hash of the compilation.
		path: __dirname,

		// The filename of the entry chunk as relative path inside the output.path directory.
		// [name] is replaced by the name of the chunk.
		// [hash] is replaced by the hash of the compilation.
		// [chunkhash] is replaced by the hash of the chunk.
		// ! You must not specify an absolute path here! Use the output.path option.
		filename: bundle.js,
	},
*/

	devServer: {
		stats: {
			chunks: false,
		}
	}
};
