import { Datastore, EnsureIndexOptions, Persistence } from "./core";
import {
	NFP,
	BaseModel,
	Filter,
	SchemaKeyProjection,
	SchemaKeySort,
	UpdateOperators,
	UpsertOperators,
} from "./types"; // for some reason using @types will disable some type checks

export interface DatabaseConfigurations<S extends BaseModel<S>> {
	ref: string;
	model?: (new () => S) & {
		new: (json: S) => S;
	};
	afterSerialization?(line: string): string;
	beforeDeserialization?(line: string): string;
	corruptAlertThreshold?: number;
	timestampData?: boolean;
	persistence_adapter?: typeof Persistence;
	autoCompaction?: number;
	reloadBeforeOperations?: boolean;
}

export class Database<S extends BaseModel<S>> {
	private ref: string;
	private _datastore: Datastore<S>;
	private reloadBeforeOperations: boolean;
	public loaded: Promise<boolean>;

	constructor(options: DatabaseConfigurations<S>) {
		const model =
			options.model ||
			(BaseModel as (new () => S) & {
				new: (json: S) => S;
			});
		this.ref = options.ref;
		this.reloadBeforeOperations = !!options.reloadBeforeOperations;
		this._datastore = new Datastore({
			ref: this.ref,
			model: model,
			afterSerialization: options.afterSerialization,
			beforeDeserialization: options.beforeDeserialization,
			corruptAlertThreshold: options.corruptAlertThreshold,
			persistence_adapter: options.persistence_adapter,
			timestampData: options.timestampData,
		});
		this.loaded = this._datastore.loadDatabase();
		if (options.autoCompaction && options.autoCompaction > 0) {
			this._datastore.persistence.setAutocompactionInterval(
				options.autoCompaction
			);
		}
	}
	private async reloadFirst() {
		if (!this.reloadBeforeOperations) return;
		await this.reload();
	}

	/**
	 * insert documents
	 */
	public async insert(docs: S[]): Promise<{ docs: S[]; number: number }> {
		await this.reloadFirst();
		const res = await this._datastore.insert(docs as any);
		return res;
	}

	/**
	 * Find document(s) that meets a specified criteria
	 */
	public async read({
		filter,
		skip,
		limit,
		project,
		sort = undefined,
	}: {
		filter?: Filter<NFP<S>>;
		skip?: number;
		limit?: number;
		sort?: SchemaKeySort<NFP<S>>;
		project?: SchemaKeyProjection<NFP<S>>;
	}): Promise<S[]> {
		filter = fixDeep(filter || {});
		sort = fixDeep(sort || {});
		project = fixDeep(project || {});
		const cursor = this._datastore.cursor(filter);
		if (sort) {
			cursor.sort(sort as any);
		}
		if (skip) {
			cursor.skip(skip);
		}
		if (limit) {
			cursor.limit(limit);
		}
		if (project) {
			cursor.projection(project as any);
		}
		await this.reloadFirst();
		return await cursor.exec();
	}

	/**
	 * Update document(s) that meets the specified criteria
	 */
	public async update({
		filter,
		update,
		multi,
	}: {
		filter: Filter<NFP<S>>;
		update: UpdateOperators<NFP<S>>;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		if (update.$unset) {
			update.$unset = fixDeep(update.$unset);
		}
		await this.reloadFirst();
		const res = await this._datastore.update(filter, update, {
			multi,
			upsert: false,
		});
		return res;
	}

	/**
	 * Update document(s) that meets the specified criteria,
	 * and do an insertion if no documents are matched
	 */
	public async upsert({
		filter,
		update,
		multi,
	}: {
		filter: Filter<NFP<S>>;
		update: UpsertOperators<NFP<S>>;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number; upsert: boolean }> {
		filter = fixDeep(filter || {});
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		if (update.$unset) {
			update.$unset = fixDeep(update.$unset);
		}
		await this.reloadFirst();
		const res = await this._datastore.update(filter, update, {
			multi,
			upsert: true,
		});
		return res;
	}

	/**
	 * Count documents that meets the specified criteria
	 */
	public async count(filter: Filter<NFP<S>> = {}): Promise<number> {
		filter = fixDeep(filter || {});
		await this.reloadFirst();
		return await this._datastore.count(filter);
	}

	/**
	 * Delete document(s) that meets the specified criteria
	 *
	 */
	public async delete({
		filter,
		multi,
	}: {
		filter: Filter<NFP<S>>;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		await this.reloadFirst();
		const res = await this._datastore.remove(filter, {
			multi: multi || false,
		});
		return res;
	}

	/**
	 * Create an index specified by options
	 */
	public async createIndex(options: EnsureIndexOptions) {
		await this.reloadFirst();
		await this._datastore.ensureIndex(options);
	}

	/**
	 * Remove an index by passing the field name that it is related to
	 */
	public async removeIndex(fieldName: string) {
		await this.reloadFirst();
		await this._datastore.removeIndex(fieldName);
	}

	/**
	 * Reload database from the persistence layer (if it exists)
	 */
	async reload() {
		await this._datastore.persistence.loadDatabase();
	}

	/**
	 * Compact the database persistence layer
	 */
	async compact() {
		await this._datastore.persistence.compactDatafile();
	}

	/**
	 * forcefully unlocks the persistence layer
	 * use with caution, and only if you know what you're doing
	 */
	async forcefulUnlock() {
		await this._datastore.persistence.forcefulUnlock();
	}

	/**
	 * Stop auto compaction of the persistence layer
	 */
	stopAutoCompaction() {
		this._datastore.persistence.stopAutocompaction();
	}

	/**
	 * Set auto compaction defined by an an interval
	 */
	resetAutoCompaction(interval: number) {
		this._datastore.persistence.setAutocompactionInterval(interval);
	}

	/**
	 * Put one document
	 */
	create = this.insert;
	/**
	 * Find documents that meets a specified criteria
	 */
	find = this.read;
}

function fixDeep<T extends Filter<any>>(input: T): T {
	const result = Object.assign<T, Filter<any>>(input, input.$deep);
	delete result.$deep;
	return result;
}
