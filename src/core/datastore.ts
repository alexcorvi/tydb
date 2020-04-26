import { Cursor } from "./cursor";
import * as customUtils from "./customUtils";
import { Index } from "./indexes";
import * as model from "./model";
import { Persistence } from "./persistence";
import * as types from "../types";
import { BaseModel } from "../types/base-schema";
import Q from "p-queue";

interface EnsureIndexOptions {
	fieldName: string;
	unique?: boolean;
	sparse?: boolean;
	expireAfterSeconds?: number;
}

export interface DataStoreOptions<G> {
	ref: string;
	afterSerialization?(line: string): string;
	beforeDeserialization?(line: string): string;
	corruptAlertThreshold?: number;
	timestampData?: boolean;
	persistence_adapter?: typeof Persistence;
	model?: (new () => G) & {
		new: (json: G) => G;
	};
}

interface UpdateOptions {
	multi?: boolean;
	upsert?: boolean;
}

export class Datastore<
	G extends Partial<types.BaseModel> & { [key: string]: any }
> {
	ref: string = "db";
	timestampData = false;

	persistence: Persistence<G>;
	// rename to something denotes that it's an internal thing
	q: Q = new Q({
		concurrency: 1,
		autoStart: false,
	});

	indexes: { [key: string]: Index<string, G> } = {
		_id: new Index({ fieldName: "_id", unique: true }),
	};

	ttlIndexes: { [key: string]: number } = {};

	model: (new () => G) & {
		new: (json: G) => G;
	};

	constructor(options: DataStoreOptions<G>) {
		this.model = options.model || (BaseModel as any);
		if (options.ref) {
			this.ref = options.ref;
		}

		const PersistenceAdapter = options.persistence_adapter || Persistence;

		// Persistence handling
		this.persistence = new PersistenceAdapter({
			db: this,
			model: options.model,
			afterSerialization: options.afterSerialization,
			beforeDeserialization: options.beforeDeserialization,
			corruptAlertThreshold: options.corruptAlertThreshold || 0,
		});

		if (options.timestampData) {
			this.timestampData = true;
		}
	}

	/**
	 * Load the database from the datafile, and trigger the execution of buffered commands if any
	 */
	async loadDatabase() {
		return await this.persistence.loadDatabase();
	}

	/**
	 * Get an array of all the data in the database
	 */
	getAllData() {
		return this.indexes._id.getAll();
	}

	/**
	 * Reset all currently defined indexes
	 */
	resetIndexes() {
		Object.keys(this.indexes).forEach((i) => {
			this.indexes[i].reset();
		});
	}

	/**
	 * Ensure an index is kept for this field. Same parameters as lib/indexes
	 * For now this function is synchronous, we need to test how much time it takes
	 * We use an async API for consistency with the rest of the code
	 */
	async ensureIndex(options: EnsureIndexOptions) {
		options = options || {};

		if (!options.fieldName) {
			let err: any = new Error(
				"Cannot create an index without a fieldName"
			);
			err.missingFieldName = true;
			throw err;
		}
		if (this.indexes[options.fieldName]) {
			return;
		}

		this.indexes[options.fieldName] = new Index(options);

		// TTL
		if (options.expireAfterSeconds !== undefined) {
			this.ttlIndexes[options.fieldName] = options.expireAfterSeconds;
		}

		// Index data
		try {
			this.indexes[options.fieldName].insert(this.getAllData());
		} catch (e) {
			delete this.indexes[options.fieldName];
			throw e;
		}

		// We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
		return await this.persistence.persistByAppendNewIndex([
			{ $$indexCreated: options },
		]);
	}

	/**
	 * Remove an index
	 */
	async removeIndex(fieldName: string) {
		delete this.indexes[fieldName];
		return await this.persistence.persistByAppendNewIndex([
			{ $$indexRemoved: fieldName },
		]);
	}

	/**
	 * Add one or several document(s) to all indexes
	 */
	addToIndexes<T extends G>(doc: T | T[]) {
		let failingIndex = -1;
		let error;
		const keys = Object.keys(this.indexes);
		for (let i = 0; i < keys.length; i++) {
			try {
				this.indexes[keys[i]].insert(doc);
			} catch (e) {
				failingIndex = i;
				error = e;
				break;
			}
		}

		// If an error happened, we need to rollback the insert on all other indexes
		if (error) {
			for (let i = 0; i < failingIndex; i++) {
				this.indexes[keys[i]].remove(doc);
			}

			throw error;
		}
	}

	/**
	 * Remove one or several document(s) from all indexes
	 */

	removeFromIndexes<T extends G>(doc: T | T[]) {
		Object.keys(this.indexes).forEach((i) => {
			this.indexes[i].remove(doc);
		});
	}

	/**
	 * Update one or several documents in all indexes
	 * To update multiple documents, oldDoc must be an array of { oldDoc, newDoc } pairs
	 * If one update violates a constraint, all changes are rolled back
	 */
	updateIndexes<T extends G>(oldDoc: T, newDoc: T): void;
	updateIndexes<T extends G>(updates: Array<{ oldDoc: T; newDoc: T }>): void;
	updateIndexes<T extends G>(
		oldDoc: T | Array<{ oldDoc: T; newDoc: T }>,
		newDoc?: T
	) {
		let failingIndex = -1;
		let error;
		const keys = Object.keys(this.indexes);
		for (let i = 0; i < keys.length; i++) {
			try {
				this.indexes[keys[i]].update(oldDoc, newDoc);
			} catch (e) {
				failingIndex = i;
				error = e;
				break;
			}
		}

		// If an error happened, we need to rollback the update on all other indexes
		if (error) {
			for (let i = 0; i < failingIndex; i++) {
				this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
			}

			throw error;
		}
	}

	private _isBasicType(value: any) {
		return (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean" ||
			value instanceof Date ||
			value === null
		);
	}

	/**
	 * This will return the least number of candidates,
	 * using Index if possible
	 * when failing it will return all the database
	 */
	private _leastCandidates(query: any) {
		const currentIndexKeys = Object.keys(this.indexes);
		const queryKeys = Object.keys(query);

		// STEP 1: get candidates list by checking indexes from most to least frequent use case
		let usableQueryKeys: string[] = [];

		// possibility: basic match
		queryKeys.forEach((k) => {
			// only types that can't be used with . notation
			if (
				this._isBasicType(query[k]) &&
				currentIndexKeys.indexOf(k) !== -1
			) {
				usableQueryKeys.push(k);
			}
		});
		if (usableQueryKeys.length > 0) {
			return this.indexes[usableQueryKeys[0]].getMatching(
				query[usableQueryKeys[0]]
			);
		}

		// possibility: using $eq
		queryKeys.forEach((k) => {
			if (
				query[k] &&
				query[k].hasOwnProperty("$eq") &&
				this._isBasicType(query[k].$eq) &&
				currentIndexKeys.indexOf(k) !== -1
			) {
				usableQueryKeys.push(k);
			}
		});
		if (usableQueryKeys.length > 0) {
			return this.indexes[usableQueryKeys[0]].getMatching(
				query[usableQueryKeys[0]]
			);
		}

		// possibility: using $in
		queryKeys.forEach((k) => {
			if (
				query[k] &&
				query[k].hasOwnProperty("$in") &&
				currentIndexKeys.indexOf(k) !== -1
			) {
				usableQueryKeys.push(k);
			}
		});
		if (usableQueryKeys.length > 0) {
			return this.indexes[usableQueryKeys[0]].getMatching(
				query[usableQueryKeys[0]].$in
			);
		}

		// possibility: using $lt $lte $gt $gte
		queryKeys.forEach((k) => {
			if (
				query[k] &&
				currentIndexKeys.indexOf(k) !== -1 &&
				(query[k].hasOwnProperty("$lt") ||
					query[k].hasOwnProperty("$lte") ||
					query[k].hasOwnProperty("$gt") ||
					query[k].hasOwnProperty("$gte"))
			) {
				usableQueryKeys.push(k);
			}
		});
		if (usableQueryKeys.length > 0) {
			return this.indexes[usableQueryKeys[0]].getBetweenBounds(
				query[usableQueryKeys[0]]
			);
		}

		return this.getAllData();
	}

	/**
	 * Return the list of candidates for a given query
	 * Crude implementation for now, we return the candidates given by the first usable index if any
	 * We try the following query types, in this order: basic match, $in match, comparison match
	 * One way to make it better would be to enable the use of multiple indexes if the first usable index
	 * returns too much data. I may do it in the future.
	 *
	 * Returned candidates will be scanned to find and remove all expired documents
	 */
	async getCandidates(query: any, dontExpireStaleDocs?: boolean) {
		const candidates = this._leastCandidates(query);
		if (dontExpireStaleDocs) {
			return candidates;
		}
		const expiredDocsIds: string[] = [];
		const validDocs: G[] = [];
		const ttlIndexesFieldNames = Object.keys(this.ttlIndexes);
		candidates.forEach((candidate) => {
			let valid = true;
			ttlIndexesFieldNames.forEach((field) => {
				if (
					candidate[field] !== undefined &&
					candidate[field] instanceof Date &&
					Date.now() >
						candidate[field].getTime() +
							this.ttlIndexes[field] * 1000
				) {
					valid = false;
				}
			});
			if (valid) {
				validDocs.push(candidate);
			} else if (candidate._id) {
				expiredDocsIds.push(candidate._id);
			}
		});

		for (let index = 0; index < expiredDocsIds.length; index++) {
			const _id = expiredDocsIds[index];
			await this._remove({ _id }, { multi: false });
		}

		return validDocs;
	}

	/**
	 * Insert a new document
	 */
	private async _insert(newDoc: G | G[]) {
		let preparedDoc = this.prepareDocumentForInsertion(newDoc);
		this._insertInCache(preparedDoc);

		await this.persistence.persistByAppendNewData(
			Array.isArray(preparedDoc) ? preparedDoc : [preparedDoc]
		);
		return model.deepCopy(preparedDoc, this.model);
	}

	/**
	 * Create a new _id that's not already in use
	 */
	private createNewId() {
		let tentativeId = customUtils.uid();
		if (this.indexes._id.getMatching(tentativeId).length > 0) {
			tentativeId = this.createNewId();
		}
		return tentativeId;
	}

	/**
	 * Prepare a document (or array of documents) to be inserted in a database
	 * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
	 */
	private prepareDocumentForInsertion(newDoc: G | G[]) {
		let preparedDoc: G[] | G = [];
		if (Array.isArray(newDoc)) {
			newDoc.forEach((doc) => {
				preparedDoc.push(this.prepareDocumentForInsertion(doc));
			});
		} else {
			preparedDoc = model.deepCopy(newDoc, this.model);
			if (preparedDoc._id === undefined) {
				preparedDoc._id = this.createNewId();
			}
			const now = new Date();
			if (this.timestampData && preparedDoc.createdAt === undefined) {
				preparedDoc.createdAt = now;
			}
			if (this.timestampData && preparedDoc.updatedAt === undefined) {
				preparedDoc.updatedAt = now;
			}
			model.checkObject(preparedDoc);
		}

		return preparedDoc;
	}

	/**
	 * If newDoc is an array of documents, this will insert all documents in the cache
	 */
	private _insertInCache(preparedDoc: G | G[]) {
		if (Array.isArray(preparedDoc)) {
			this._insertMultipleDocsInCache(preparedDoc);
		} else {
			this.addToIndexes(preparedDoc);
		}
	}

	/**
	 * If one insertion fails (e.g. because of a unique constraint), roll back all previous
	 * inserts and throws the error
	 */
	private _insertMultipleDocsInCache(preparedDocs: G[]) {
		let failingI = -1;
		let error;

		for (let i = 0; i < preparedDocs.length; i++) {
			try {
				this.addToIndexes(preparedDocs[i]);
			} catch (e) {
				error = e;
				failingI = i;
				break;
			}
		}

		if (error) {
			for (let i = 0; i < failingI; i++) {
				this.removeFromIndexes(preparedDocs[i]);
			}

			throw error;
		}
	}

	async insert(newDoc: G | G[]): Promise<types.Result<G>> {
		const res = await this.q.add(() => this._insert(newDoc));
		if (Array.isArray(res)) {
			return {
				docs: res,
				number: res.length,
			};
		} else {
			return {
				docs: [res],
				number: 1,
			};
		}
	}

	/**
	 * Count all documents matching the query
	 */
	async count(query: any) {
		const cursor = new Cursor<G>(this, query);
		return (await cursor.exec()).length;
	}

	/**
	 * Find all documents matching the query
	 */
	async find(query: any): Promise<G[]> {
		const cursor = new Cursor(this, query);
		const docs = await cursor.exec();
		return docs;
	}

	/**
	 * Find all documents matching the query
	 */
	cursor(query: any) {
		const cursor = new Cursor<G>(this, query);
		return cursor;
	}

	/**
	 * Update all docs matching query
	 */
	private async _update(
		query: any,
		updateQuery: any,
		options: UpdateOptions
	): Promise<types.Result<G> & { upsert: boolean }> {
		let multi = options.multi !== undefined ? options.multi : false;
		let upsert = options.upsert !== undefined ? options.upsert : false;

		const cursor = new Cursor(this, query);
		cursor.limit(1);
		const res = await cursor.__exec_unsafe();
		if (res.length > 0) {
			let numReplaced = 0;
			const candidates = await this.getCandidates(query);
			const modifications = [];

			// Preparing update (if an error is thrown here neither the datafile nor
			// the in-memory indexes are affected)
			for (let i = 0; i < candidates.length; i++) {
				if (
					(multi || numReplaced === 0) &&
					model.match(candidates[i], query)
				) {
					numReplaced++;
					let createdAt = candidates[i].createdAt;
					let modifiedDoc = model.modify(
						candidates[i],
						updateQuery,
						this.model
					);
					if (createdAt) {
						modifiedDoc.createdAt = createdAt as any;
					}
					if (
						this.timestampData &&
						updateQuery.updatedAt === undefined &&
						(!updateQuery.$set ||
							updateQuery.$set.updatedAt === undefined)
					) {
						modifiedDoc.updatedAt = new Date();
					}
					modifications.push({
						oldDoc: candidates[i],
						newDoc: modifiedDoc,
					});
				}
			}

			// Change the docs in memory
			this.updateIndexes(modifications);

			// Update the datafile
			const updatedDocs = modifications.map((x) => x.newDoc);
			await this.persistence.persistByAppendNewData(updatedDocs);

			return {
				number: updatedDocs.length,
				docs: updatedDocs.map((x) => model.deepCopy(x, this.model)),
				upsert: false,
			};
		} else if (res.length === 0 && upsert) {
			if (!updateQuery.$setOnInsert) {
				throw new Error(
					"$setOnInsert modifier is required when upserting"
				);
			}
			let toBeInserted = model.deepCopy(
				updateQuery.$setOnInsert,
				this.model,
				true
			);
			const newDoc = await this._insert(toBeInserted);
			if (Array.isArray(newDoc)) {
				return {
					number: newDoc.length,
					docs: newDoc,
					upsert: true,
				};
			} else {
				return {
					number: 1,
					docs: [newDoc],
					upsert: true,
				};
			}
		} else {
			return {
				number: 0,
				docs: [],
				upsert: false,
			};
		}
	}

	async update(query: any, updateQuery: any, options: UpdateOptions) {
		return await this.q.add(() =>
			this._update(query, updateQuery, options)
		);
	}

	/**
	 * Remove all docs matching the query
	 * For now very naive implementation (similar to update)
	 */
	private async _remove(
		query: any,
		options?: { multi: boolean }
	): Promise<types.Result<G>> {
		let numRemoved = 0;
		const removedDocs: { $$deleted: true; _id?: string }[] = [];
		const removedFullDoc: G[] = [];
		let multi = options ? !!options.multi : false;
		const candidates = await this.getCandidates(query, true);
		candidates.forEach((d) => {
			if (model.match(d, query) && (multi || numRemoved === 0)) {
				numRemoved++;
				removedFullDoc.push(model.deepCopy(d, this.model));
				removedDocs.push({ $$deleted: true, _id: d._id });
				this.removeFromIndexes(d);
			}
		});
		await this.persistence.persistByAppendNewData(removedDocs);
		return {
			number: numRemoved,
			docs: removedFullDoc,
		};
	}

	async remove(query: any, options?: { multi: boolean }) {
		return this.q.add(() => this._remove(query, options));
	}
}
