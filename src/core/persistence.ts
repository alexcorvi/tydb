import * as customUtils from "./customUtils";
import { Datastore } from "./datastore";
import { Index } from "./indexes";
import * as model from "./model";
import { BaseSchema } from "@types";

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

	private memory: { [key: string]: string } = {};

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
	}

	/**
	 * Persist cached database
	 * This serves as a compaction function since the cache always contains only the actual of documents in the collection
	 * while the data file is append-only so it may grow larger
	 */
	async persistCachedDatabase() {
		let toPersist = "";
		this.db.getAllData().forEach((doc: any) => {
			toPersist += `${this.afterSerialization(model.serialize(doc))}\n`;
		});
		Object.keys(this.db.indexes).forEach((fieldName) => {
			if (fieldName != "_id") {
				// The special _id index is managed by datastore.ts, the others need to be persisted
				toPersist += `${this.afterSerialization(
					model.serialize({
						$$indexCreated: {
							fieldName,
							unique: this.db.indexes[fieldName].unique,
							sparse: this.db.indexes[fieldName].sparse,
						},
					})
				)}\n`;
			}
		});
		await this.write(toPersist);
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

	/**
	 * Persist new state for the given newDocs (can be insertion, update or removal)
	 * Use an append-only format
	 */
	async persistNewState(newDocs: any[]) {
		let toPersist = "";
		newDocs.forEach((doc) => {
			toPersist += `${this.afterSerialization(model.serialize(doc))}\n`;
		});
		if (toPersist.length === 0) {
			return;
		}
		await this.append(toPersist);
	}

	/**
	 * From a database's raw data, return the corresponding
	 * machine understandable collection
	 */
	treatRawData(rawData: string) {
		const data = rawData.split("\n"); // Last line of every data file is usually blank so not really corrupt
		const dataById: { [key: string]: any } = {};
		const tData: any[] = [];
		const indexes: { [key: string]: any } = {};
		let corruptItems = -1;
		for (let i = 0; i < data.length; i += 1) {
			try {
				let doc = model.deserialize(
					this.beforeDeserialization(data[i])
				);
				if (doc._id) {
					if (doc.$$deleted === true) {
						delete dataById[doc._id];
					} else {
						dataById[doc._id] = doc;
					}
				} else if (
					doc.$$indexCreated &&
					doc.$$indexCreated.fieldName !== undefined
				) {
					indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
				} else if (typeof doc.$$indexRemoved === "string") {
					delete indexes[doc.$$indexRemoved];
				}
			} catch (e) {
				corruptItems += 1;
			}
		}

		// A bit lenient on corruption
		if (
			data.length > 0 &&
			corruptItems / data.length > this.corruptAlertThreshold
		) {
			throw new Error(
				`More than ${Math.floor(
					100 * this.corruptAlertThreshold
				)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start Datastore to prevent dataloss`
			);
		}

		Object.keys(dataById).forEach((k) => {
			tData.push(dataById[k]);
		});

		return { data: tData, indexes };
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
		let rawData = await this.read();
		let treatedData = this.treatRawData(rawData);
		// Recreate all indexes in the datafile
		Object.keys(treatedData.indexes).forEach((key) => {
			let index = new Index<string, G>(treatedData.indexes[key]);
			this.db.indexes[key] = index;
		});
		// Fill cached database (i.e. all indexes) with data
		try {
			this.db.resetIndexes(treatedData.data);
		} catch (e) {
			this.db.resetIndexes(); // Rollback any index which didn't fail
			throw e;
		}
		await this.db.persistence.persistCachedDatabase();
		this.db.q.start();
		return;
	}

	async init() {
		this.memory[this.ref] = "";
	}

	async read() {
		return this.memory[this.ref] || "";
	}

	async write(data: string) {
		this.memory[this.ref] = data || "";
	}

	async append(data: string) {
		this.memory[this.ref] = (this.memory[this.ref] || "") + (data || "");
	}
}
