import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";
import ts from "@wessberg/rollup-plugin-ts";
import shebang from "rollup-plugin-add-shebang";

export default [
	// Browser Version
	{
		input: "./src/index.ts",
		output: {
			name: pkg.name,
			file: pkg.browser,
			format: "umd",
		},
		plugins: [
			ts(),
			resolve(),
			commonjs(),
			{
				name: "replacer",
				transform: function (code) {
					// keep only IDB when in browser
					code = code.replace(/^(.*)\/\/__IMPORT_IDB/gim, "$1");
					code = code.replace(/^(.*)\/\/__IMPORT_FS/gim, "");
					code = code.replace(/^.*cross-fetch.*/gim, "");
					return { code };
				},
			},
		],
	},
	// Node Version
	{
		input: "./src/index.ts",
		output: {
			name: pkg.name,
			file: pkg.main,
			format: "cjs",
		},
		plugins: [ts()],
		external: [
			"fs",
			"path",
			"readline",
			"util",
			"idb-keyval",
			"lockfile",
			"p-queue",
			"cross-fetch",
		],
	},
	// bin
	{
		input: "./src/bin.ts",
		output: {
			name: pkg.name,
			file: pkg.bin.tydb,
			format: "cjs",
		},
		plugins: [
			ts(),
			shebang({
				include: pkg.bin.tydb,
			}),
		],
		external: [
			"fs",
			"path",
			"readline",
			"util",
			"idb-keyval",
			"lockfile",
			"p-queue",
			"cross-fetch",
			"fastify",
			"ow",
			"fastify-cors",
		],
	},
];
