import * as compress from "./compress";
import { Operations } from "./operations";
import { Datastore, DataStoreOptions } from "@core";
import { BaseSchema } from "@types";
import * as path from "path";

export class Database<Schema extends BaseSchema> extends Operations<Schema> {
	private _database: Datastore<Schema>;

	name: string;
	filePath: string;

	constructor(
		options: string | (DataStoreOptions & { autoCompaction?: number })
	) {
		if (typeof options === "string") {
			options = {
				ref: options,
			};
		}
		const db = new Datastore<Schema>(
			Object.assign(options, { timestampData: true })
		);
		super(db);
		this._database = db;
		this.name = options.ref;
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
