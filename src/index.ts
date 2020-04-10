import * as compress from "./compress";
import { _NEDB, ConnectionOptions } from "./db";
import { Operations } from "./operations";
import * as path from "path";

export class Database<Schema> extends Operations<Schema> {
	private _database: _NEDB;

	name: string;
	filePath: string;

	constructor(
		options: string | (ConnectionOptions & { autoCompaction?: number })
	) {
		if (typeof options === "string") {
			options = {
				filename: options,
				timestampData: true,
			};
		}
		const nedb = new _NEDB(Object.assign(options, { timestampData: true }));
		super(nedb, options.filename);
		this._database = nedb;
		this.name = options.filename;
		this.filePath = path.resolve(this.name);
		if (options.autoCompaction === undefined) options.autoCompaction = 0;
		if (options.autoCompaction > 0) {
			this._database.persistence.setAutocompactionInterval(
				options.autoCompaction
			);
		}
	}

	compact() {
		this._database.persistence.compactDatafile();
	}

	stopAutoCompaction() {
		this._database.persistence.stopAutocompaction();
	}

	resetAutoCompaction(interval: number) {
		this._database.persistence.setAutocompactionInterval(interval);
	}

	async backup(path: string) {
		await compress.gzip(this.filePath, path);
	}

	async restore(path: string) {
		await compress.unzip(path, this.filePath);
	}
}
