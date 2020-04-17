import { Datastore } from "@core";
import {
	BaseSchema,
	Filter,
	SchemaKeyProjection,
	SchemaKeySort,
	UpdateOperators,
	FieldLevelQueryOperators,
} from "@types";

export class Operations<S extends BaseSchema> {
	private _datastore: Datastore<S>;

	constructor(_datastore: Datastore<S>) {
		this._datastore = _datastore;
	}

	private async _connect() {
		await this._datastore.loadDatabase();
		return this._datastore;
	}

	/**
	 * Put one document
	 */
	public async insert(docs: S[]): Promise<{ docs: S[]; number: number }> {
		return (await this._connect()).insert(docs);
	}

	/**
	 * Put one document
	 */
	create = this.insert;

	/**
	 * Database cursor
	 */
	public async cursor(filter: Filter<S>) {
		return (await this._connect()).cursor(filter);
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
		filter?: Filter<S>;
		skip?: number;
		limit?: number;
		sort?: SchemaKeySort<S>;
		project?: SchemaKeyProjection<S>;
	}): Promise<S[]> {
		filter = fixDeep(filter || {});
		const cursor = (await this._connect()).cursor(filter);
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
	 * Find documents that meets a specified criteria
	 */
	find = this.read;

	/**
	 * Update many documents that meets the specified criteria
	 */
	public async update({
		filter,
		update,
		multi,
	}: {
		filter: Filter<S>;
		update: UpdateOperators<S>;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		return await (await this._connect()).update(filter, update, {
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
		filter: Filter<S>;
		update: S;
		multi?: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		return await (await this._connect()).update(filter, update, {
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
		filter: Filter<S>;
		multi: boolean;
	}): Promise<{ docs: S[]; number: number }> {
		filter = fixDeep(filter || {});
		return (await this._connect()).remove(filter, { multi });
	}

	/**
	 * Count documents that meets the specified criteria
	 */
	public async count({
		filter,
	}: {
		filter?: Filter<S>;
	} = {}): Promise<number> {
		filter = fixDeep(filter || {});
		return await (await this._connect()).count(filter);
	}
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
