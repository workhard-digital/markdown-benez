const path = require('path');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
	devtool: 'source-map',
	stats: 'errors-only',
	entry: {
		'clipboard': './source/clipboard.js',
		'background': './source/background.js',
	},
	output: {
		path: path.join(__dirname, 'distribution'),
		filename: '[name].js',
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{
					from: 'manifest.json',
					context: 'source',
				},
				{
					from: 'icon.png',
					context: 'source',
				},
				{
					from: 'editor',
					context: 'source',
					to: 'editor',
				},
				{
					from: '_locales',
					context: 'source',
					to: '_locales',
				},
			],
		}),
	],
	optimization: {
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					mangle: false,
					compress: false,
					output: {
						beautify: true,
						indent_level: 2 // eslint-disable-line camelcase
					}
				}
			})
		]
	}
};
