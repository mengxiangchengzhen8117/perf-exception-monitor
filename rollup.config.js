/**
 * rollup.config.js
 *
 * @author fukui <fukui@wps.cn>
 */
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import babelrc from 'babelrc-rollup'
import { terser } from "rollup-plugin-terser"

export default {
	input: 'src/index.js',
	output: [{
		file: 'lib/perf-exception-monitor.js',
		format: 'umd',
		name: 'PerfExceptionMonitor'
	}, {
		file: 'lib/perf-exception-monitor.esm.js',
		format: 'es',
		name: 'PerfExceptionMonitor'
	}],
	watch: {
		exclude: 'node_modules/**'
	},
	plugins: [
		resolve(), // plugin-node-resolve 插件可以让 Rollup 查找到依赖的外部模块
		commonjs(), // plugin-commonjs插件可以让 Rollup 将依赖的外部模块由CommonJS 转换为 ES2015，因为有些npm包对外暴露的是CommonJS模块而不是ES Module
		babel(babelrc({
			addExternalHelpersPlugin: false,
			exclude: /node_modules/,
			runtimeHelpers: false
		})),
		terser()
	]
}

