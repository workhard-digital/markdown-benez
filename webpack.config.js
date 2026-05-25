const path = require('path');

const CleanCSS = require('clean-css');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {minify: minifyHtml} = require('html-minifier-terser');
const TerserPlugin = require('terser-webpack-plugin');
const {minify: minifyJavaScript} = require('terser');

const LEGAL_COMMENT_PATTERN = /^!/;

async function minifyEditorAsset(content, absolutePath) {
	const source = content.toString();
	const extension = path.extname(absolutePath);

	if (extension === '.js') {
		const result = await minifyJavaScript(source, {
			compress: true,
			mangle: true,
			format: {
				comments: LEGAL_COMMENT_PATTERN
			}
		});

		return result.code;
	}

	if (extension === '.css') {
		const result = new CleanCSS({
			level: 2,
			rebase: false
		}).minify(source);

		if (result.errors.length > 0) {
			throw new Error(`Unable to minify ${absolutePath}: ${result.errors.join(', ')}`);
		}

		return result.styles;
	}

	if (extension === '.html') {
		return minifyHtml(source, {
			collapseWhitespace: true,
			minifyCSS: true,
			minifyJS: {
				compress: true,
				mangle: true,
				format: {
					comments: LEGAL_COMMENT_PATTERN
				}
			},
			removeComments: true,
			removeRedundantAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true,
			useShortDoctype: true
		});
	}

	return content;
}

function minifyJsonAsset(content) {
	return JSON.stringify(JSON.parse(content.toString()));
}

function transformWhenProduction(transformer, isProduction) {
	if (!isProduction) {
		return undefined;
	}

	return {
		transformer,
		cache: true
	};
}

module.exports = (_environment, arguments_) => {
	const isProduction = arguments_.mode === 'production';

	return {
		devtool: isProduction ? false : 'source-map',
		stats: 'errors-only',
		entry: {
			clipboard: './source/clipboard.js',
			background: './source/background.js'
		},
		output: {
			path: path.join(__dirname, 'distribution'),
			filename: '[name].js',
			clean: isProduction
		},
		plugins: [
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'manifest.json',
						context: 'source',
						transform: transformWhenProduction(minifyJsonAsset, isProduction)
					},
					{
						from: 'icon.png',
						context: 'source'
					},
					{
						from: 'editor',
						context: 'source',
						to: 'editor',
						transform: transformWhenProduction(minifyEditorAsset, isProduction)
					},
					{
						from: '_locales',
						context: 'source',
						to: '_locales',
						transform: transformWhenProduction(minifyJsonAsset, isProduction)
					}
				]
			})
		],
		optimization: {
			minimize: isProduction,
			minimizer: [
				new TerserPlugin({
					extractComments: false,
					terserOptions: {
						format: {
							comments: LEGAL_COMMENT_PATTERN
						}
					}
				})
			]
		}
	};
};
