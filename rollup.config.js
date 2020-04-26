import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";
import ts from "@wessberg/rollup-plugin-ts";

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
					code = code.replace(
						`//$__IMPORT_IDB`,
						`export { IDB_Persistence_Adapter } from "./adapters/indexeddb";`
					);
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
		plugins: [
			ts(),
			{
				name: "replacer",
				transform: function (code) {
					// include both when in node
					code = code.replace(
						`//$__IMPORT_IDB`,
						`export { IDB_Persistence_Adapter } from "./adapters/indexeddb";`
					);
					code = code.replace(
						`//$__IMPORT_FS`,
						`export { FS_Persistence_Adapter } from "./adapters/fs-adapter";`
					);
					return { code };
				},
			},
		],
		external: [
			"fs",
			"path",
			"readline",
			"util",
			"idb-keyval",
			"lockfile",
			"p-queue",
		],
	},
];
