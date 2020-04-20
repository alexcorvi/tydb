import * as compress from "./compress";
import { Operations } from "./operations";
import { Datastore, DataStoreOptions } from "@core";
import { BaseSchema } from "@types";
import * as path from "path";

export class Database<Schema extends BaseSchema> extends Operations<Schema> {
	private _database: Datastore<Schema>;

	public loaded: Promise<boolean>;

	constructor(
		options: string | (DataStoreOptions & { autoCompaction?: number })
	) {
		if (typeof options === "string") {
			options = {
				ref: options,
			};
		}
		const db = new Datastore<any>(options);
		super(db);
		this.loaded = db.loadDatabase();
		this._database = db;
		if (options.autoCompaction === undefined) options.autoCompaction = 0;
		if (options.autoCompaction > 0) {
			this._database.persistence.setAutocompactionInterval(
				options.autoCompaction
			);
		}
	}

	async reload() {
		await this._database.loadDatabase();
	}

	async compact() {
		await this._database.persistence.compactDatafile();
	}

	stopAutoCompaction() {
		this._database.persistence.stopAutocompaction();
	}

	resetAutoCompaction(interval: number) {
		this._database.persistence.setAutocompactionInterval(interval);
	}
}
