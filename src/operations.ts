import { Cursor, Datastore } from "@core";
import {
	BaseSchema,
	Filter,
	SchemaKeyProjection,
	SchemaKeySort,
	UpdateOperators,
	FieldLevelQueryOperators,
	SF,
	SP,
} from "./types"; // for some reason using @types will disable some type checks

export class Operations<S extends BaseSchema> {
	private _datastore: Datastore<SF<S>>;

	constructor(_datastore: Datastore<SF<S>>) {
		this._datastore = _datastore;
	}

	/**
	 * Put one document
	 */
	public async insert(
		docs: SP<S>[]
	): Promise<{ docs: SF<S>[]; number: number }> {
		return this._datastore.insert(docs as any);
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
		filter?: Filter<SF<S>>;
		skip?: number;
		limit?: number;
		sort?: SchemaKeySort<SF<S>>;
		project?: SchemaKeyProjection<SF<S>>;
	}): Promise<SF<S>[]> {
		filter = fixDeep(filter || {});
		const cursor = this._datastore.cursor(filter);
		if (sort) {
			cursor.sort(sort);
		}
		if (skip) {
			cursor.skip(skip);
		}
		if (limit) {
			cursor.limit(limit);
		}
		if (project) {
			cursor.projection(project);
		}
		return cursor.exec();
	}

	/**
	 * Update many documents that meets the specified criteria
	 */
	public async update({
		filter,
		update,
		multi,
	}: {
		filter: Filter<SF<S>>;
		update: UpdateOperators<SF<S>>;
		multi?: boolean;
	}): Promise<{ docs: SF<S>[]; number: number }> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		return await this._datastore.update(filter, update, {
			multi,
			upsert: false,
		});
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
		filter: Filter<SF<S>>;
		update: SP<S>;
		multi?: boolean;
	}): Promise<{ docs: SF<S>[]; number: number }> {
		filter = fixDeep(filter || {});
		return await this._datastore.update(filter, update, {
			multi,
			upsert: true,
		});
	}

	/**
	 * Delete many documents that meets the specified criteria
	 *
	 */
	public async delete({
		filter,
		multi,
	}: {
		filter: Filter<SF<S>>;
		multi: boolean;
	}): Promise<{ docs: SF<S>[]; number: number }> {
		filter = fixDeep(filter || {});
		return this._datastore.remove(filter, { multi });
	}

	/**
	 * Count documents that meets the specified criteria
	 */
	public async count({
		filter,
	}: {
		filter?: Filter<SF<S>>;
	} = {}): Promise<number> {
		filter = fixDeep(filter || {});
		return await this._datastore.count(filter);
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
