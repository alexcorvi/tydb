import { Datastore, Persistence } from "./core";
import {
	NFP,
	BaseModel,
	Filter,
	SchemaKeyProjection,
	SchemaKeySort,
	UpdateOperators,
	FieldLevelQueryOperators,
} from "./types"; // for some reason using @types will disable some type checks

interface DatabaseConfigurations<S extends BaseModel<S>> {
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
}

export class Database<S extends BaseModel<S>> {
	private ref: string;
	private _datastore: Datastore<S>;
	public loaded: Promise<boolean>;

	constructor(options: DatabaseConfigurations<S>) {
		const model =
			options.model ||
			(BaseModel as (new () => S) & {
				new: (json: S) => S;
			});
		this.ref = options.ref;
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

	/**
	 * Put one document
	 */
	public async insert(docs: S[]): Promise<{ docs: S[]; number: number }> {
		const res = await this._datastore.insert(docs as any);
		return res;
	}

	/**
	 * Find documents that meets a specified criteria
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
		return await cursor.exec();
	}

	/**
	 * Update many documents that meets the specified criteria
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
		update = fix$Pull$eq(update);
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		const res = await this._datastore.update(filter, update, {
			multi,
			upsert: false,
		});
		return res;
	}

	/**
	 * Update documents that meets the specified criteria,
	 * and insert the update query if no documents are matched
	 */
	public async upsert({
		filter,
		update,
		multi,
	}: {
		filter: Filter<NFP<S>>;
		update: UpdateOperators<NFP<S>>;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
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
		return await this._datastore.count(filter);
	}

	/**
	 * Delete many documents that meets the specified criteria
	 *
	 */
	public async delete({
		filter,
		multi,
	}: {
		filter: Filter<NFP<S>>;
		multi: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		const res = await this._datastore.remove(filter, { multi });
		return res;
	}

	async reload() {
		await this._datastore.persistence.loadDatabase();
	}

	async compact() {
		await this._datastore.persistence.compactDatafile();
	}

	stopAutoCompaction() {
		this._datastore.persistence.stopAutocompaction();
	}

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

function fix$Pull$eq<S>(updateQuery: UpdateOperators<S>) {
	if (updateQuery.$pull) {
		Object.keys(updateQuery.$pull).forEach((key) => {
			if (
				(updateQuery.$pull as {
					[key: string]: FieldLevelQueryOperators<any>;
				})[key].$eq
			) {
				(updateQuery.$pull as { [key: string]: any })[
					key
				] = (updateQuery.$pull as {
					[key: string]: FieldLevelQueryOperators<any>;
				})[key].$eq;
			}
		});
	}
	return updateQuery;
}
