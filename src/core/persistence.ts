import * as customUtils from "./customUtils";
import { Datastore } from "./datastore";
import { Index } from "./indexes";
import * as model from "./model";
import { BaseSchema } from "@types";

type PersistenceEventCallback = (message: string) => Promise<void>;

type PersistenceEventEmits = "readLine" | "writeLine" | "end";

export class PersistenceEvent {
	callbacks: {
		readLine: Array<PersistenceEventCallback>;
		writeLine: Array<PersistenceEventCallback>;
		end: Array<PersistenceEventCallback>;
	} = {
		readLine: [],
		writeLine: [],
		end: [],
	};

	on(event: PersistenceEventEmits, cb: PersistenceEventCallback) {
		if (!this.callbacks[event]) this.callbacks[event] = [];
		this.callbacks[event].push(cb);
	}

	async emit(event: PersistenceEventEmits, data: string) {
		let cbs = this.callbacks[event];
		if (cbs) {
			for (let i = 0; i < cbs.length; i++) {
				const cb = cbs[i];
				await cb(data);
			}
		}
	}
}

interface PersistenceOptions<G extends Partial<BaseSchema>> {
	db: Datastore<G>;
	afterSerialization?: (raw: string) => string;
	beforeDeserialization?: (encrypted: string) => string;
	corruptAlertThreshold?: number;
}

/**
 * Create a new Persistence object for database options.db
 */
export class Persistence<G extends Partial<BaseSchema> = any> {
	db: Datastore<G>;
	ref: string = "";
	corruptAlertThreshold: number = 0.1;
	afterSerialization = (s: string) => s;
	beforeDeserialization = (s: string) => s;
	autocompactionIntervalId: NodeJS.Timeout | undefined;
	protected _memoryIndexes: string[] = [];
	protected _memoryData: string[] = [];
	constructor(options: PersistenceOptions<G>) {
		this.db = options.db;
		this.ref = this.db.ref;
		this.corruptAlertThreshold =
			options.corruptAlertThreshold !== undefined
				? options.corruptAlertThreshold
				: 0.1;

		if (this.ref && this.ref.charAt(this.ref.length - 1) === "~") {
			throw new Error(
				"The datafile name can't end with a ~, which is reserved for crash safe backup files"
			);
		}

		// After serialization and before deserialization hooks with some basic sanity checks
		if (options.afterSerialization && !options.beforeDeserialization) {
			throw new Error(
				"Serialization hook defined but deserialization hook undefined, cautiously refusing to start Datastore to prevent dataloss"
			);
		}
		if (!options.afterSerialization && options.beforeDeserialization) {
			throw new Error(
				"Serialization hook undefined but deserialization hook defined, cautiously refusing to start Datastore to prevent dataloss"
			);
		}
		this.afterSerialization =
			options.afterSerialization || this.afterSerialization;
		this.beforeDeserialization =
			options.beforeDeserialization || this.beforeDeserialization;

		let randomString = customUtils.randomString(113);
		if (
			this.beforeDeserialization(
				this.afterSerialization(randomString)
			) !== randomString
		) {
			throw new Error(
				"beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start data store to prevent dataloss"
			);
		}
		this.init();
	}

	private async persistAllIndexes() {
		const emitter = new PersistenceEvent();
		await this.writeIndexes(emitter);
		const allKeys = Object.keys(this.db.indexes);
		for (let i = 0; i < allKeys.length; i++) {
			const fieldName = allKeys[i];
			if (fieldName !== "_id") {
				// The special _id index is managed by datastore.ts, the others need to be persisted
				await emitter.emit(
					"writeLine",
					this.afterSerialization(
						model.serialize({
							$$indexCreated: {
								fieldName,
								unique: this.db.indexes[fieldName].unique,
								sparse: this.db.indexes[fieldName].sparse,
							},
						})
					)
				);
			}
		}
		await emitter.emit("end", "");
	}

	private async persistAllData() {
		const emitter = new PersistenceEvent();
		await this.writeData(emitter);
		const allData = this.db.getAllData();
		for (let i = 0; i < allData.length; i++) {
			const doc = allData[i];
			await emitter.emit(
				"writeLine",
				this.afterSerialization(model.serialize(doc))
			);
		}
		await emitter.emit("end", "");
	}

	private async persistCachedDatabase() {
		await this.persistAllData();
		await this.persistAllIndexes();
	}

	/**
	 * Queue a rewrite of the datafile
	 */
	async compactDatafile() {
		return await this.db.q.add(() => this.persistCachedDatabase());
	}

	/**
	 * Set automatic compaction every interval ms
	 */
	setAutocompactionInterval(interval?: number) {
		const minInterval = 5000;
		const realInterval = Math.max(interval || 0, minInterval);
		this.stopAutocompaction();
		this.autocompactionIntervalId = setInterval(() => {
			this.compactDatafile();
		}, realInterval);
	}

	/**
	 * Stop autocompaction (do nothing if autocompaction was not running)
	 */
	stopAutocompaction() {
		if (this.autocompactionIntervalId) {
			clearInterval(this.autocompactionIntervalId);
		}
	}

	async persistByAppendNewIndex(newDocs: any[]) {
		for (let i = 0; i < newDocs.length; i++) {
			const doc = newDocs[i];
			await this.appendIndex(
				this.afterSerialization(model.serialize(doc))
			);
		}
	}

	async persistByAppendNewData(newDocs: any[]) {
		for (let i = 0; i < newDocs.length; i++) {
			const doc = newDocs[i];
			await this.appendData(
				this.afterSerialization(model.serialize(doc))
			);
		}
	}

	treatSingleLine(
		line: string
	): {
		type: "index" | "doc" | "corrupt";
		status: "add" | "remove";
		data: any;
	} {
		let treatedLine: any;
		try {
			treatedLine = model.deserialize(this.beforeDeserialization(line));
		} catch (e) {
			return {
				type: "corrupt",
				status: "remove",
				data: false,
			};
		}
		if (treatedLine._id) {
			if (treatedLine.$$deleted === true) {
				return {
					type: "doc",
					status: "remove",
					data: { _id: treatedLine._id },
				};
			} else {
				return {
					type: "doc",
					status: "add",
					data: treatedLine,
				};
			}
		} else if (
			treatedLine.$$indexCreated &&
			treatedLine.$$indexCreated.fieldName !== undefined
		) {
			return {
				type: "index",
				status: "add",
				data: {
					fieldName: treatedLine.$$indexCreated.fieldName,
					data: treatedLine.$$indexCreated,
				},
			};
		} else if (typeof treatedLine.$$indexRemoved === "string") {
			return {
				type: "index",
				status: "remove",
				data: { fieldName: treatedLine.$$indexRemoved },
			};
		} else {
			return {
				type: "corrupt",
				status: "remove",
				data: true,
			};
		}
	}

	/**
	 * Load the database
	 * 1) Create all indexes
	 * 2) Insert all data
	 * 3) Compact the database
	 * This means pulling data out of the data file or creating it if it doesn't exist
	 * Also, all data is persisted right away, which has the effect of compacting the database file
	 * This operation is very quick at startup for a big collection (60ms for ~10k docs)
	 */
	async loadDatabase() {
		this.db.q.pause();
		this.db.resetIndexes();
		const indexesEmitter = new PersistenceEvent();
		let corrupt = 0;
		let processed = 0;
		let err: any;
		indexesEmitter.on("readLine", async (line) => {
			processed++;
			const treatedLine = this.treatSingleLine(line);
			if (treatedLine.type === "index") {
				if (treatedLine.status === "add") {
					this.db.indexes[treatedLine.data.fieldName] = new Index(
						treatedLine.data.data
					);
				}
				if (treatedLine.status === "remove") {
					delete this.db.indexes[treatedLine.data.fieldName];
				}
			} else if (!treatedLine.data) {
				corrupt++;
			}
		});
		await this.readIndexes(indexesEmitter);

		const dataEmitter = new PersistenceEvent();
		dataEmitter.on("readLine", async (line) => {
			processed++;
			const treatedLine = this.treatSingleLine(line);
			if (treatedLine.type === "doc") {
				if (treatedLine.status === "add") {
					try {
						this.db.addToIndexes(treatedLine.data);
					} catch (e) {
						// hacky way of dealing with updates
						if (e.toString().indexOf(treatedLine.data._id) !== -1) {
							this.db.removeFromIndexes(treatedLine.data);
							this.db.addToIndexes(treatedLine.data);
						} else {
							err = e;
						}
					}
				}
				if (treatedLine.status === "remove") {
					this.db.removeFromIndexes(treatedLine.data);
				}
			} else if (!treatedLine.data) {
				corrupt++;
			}
		});
		await this.readData(dataEmitter);

		if (processed > 0 && corrupt / processed > this.corruptAlertThreshold) {
			throw new Error(
				`More than ${Math.floor(
					100 * this.corruptAlertThreshold
				)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start Datastore to prevent dataloss`
			);
		} else if (err) {
			throw err;
		}

		this.db.q.start();
		return;
	}

	async init() {}

	async readIndexes(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryIndexes.length; index++) {
			const line = this._memoryIndexes[index];
			event.emit("readLine", line);
		}
	}

	async readData(event: PersistenceEvent) {
		for (let index = 0; index < this._memoryData.length; index++) {
			const line = this._memoryData[index];
			event.emit("readLine", line);
		}
	}

	async writeIndexes(event: PersistenceEvent) {
		this._memoryIndexes = [];
		event.on("writeLine", async (data) => {
			this._memoryIndexes.push(data);
		});
	}

	async writeData(event: PersistenceEvent) {
		this._memoryData = [];
		event.on("writeLine", async (data) => {
			this._memoryData.push(data);
		});
	}

	async appendIndex(data: string) {
		this._memoryIndexes.push(data);
	}

	async appendData(data: string) {
		this._memoryData.push(data);
	}
}
