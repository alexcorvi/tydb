import { _NEDB } from "./db";
import { FullSchema, InputSchema } from "./interfaces/base-schema";
import { SchemaKeyProjection, SchemaKeySort } from "./interfaces/filter";
import { unlink } from "fs";
import * as path from "path";
import * as util from "util";
import { promisify } from "util";
import {
	UpdateOperators,
	Filter,
	FieldLevelQueryOperators,
	OperatedMany,
	OperatedOne,
} from "./interfaces";

export class Operations<S> {
	private _nedbBase: _NEDB<InputSchema<S>>;
	private _dbName: string;

	constructor(_nedb: _NEDB<InputSchema<S>>, name: string) {
		this._nedbBase = _nedb;
		this._dbName = name;
	}

	private _connect() {
		return new Promise<_NEDB<InputSchema<S>>>((resolve, reject) => {
			this._nedbBase.loadDatabase((e) => {
				if (e) {
					throw e;
				}
				resolve(this._nedbBase);
			});
		});
	}

	/**
	 * Put one document
	 */
	public async createOne({
		doc,
	}: {
		doc: InputSchema<S>;
	}): Promise<OperatedOne<FullSchema<S>> & { affected: FullSchema<S> }> {
		return new Promise(async (resolve, reject) => {
			(await this._connect()).insert([doc], (err, res) => {
				if (err) return reject(err);
				resolve({
					n: res.length,
					affected: res[0] as FullSchema<S>,
				});
			});
		});
	}

	/**
	 * Put one document
	 */
	public async createMany({
		docs,
	}: {
		docs: InputSchema<S>[];
	}): Promise<OperatedMany<FullSchema<S>>> {
		return new Promise(async (resolve, reject) => {
			(await this._connect()).insert(docs, (err, res) => {
				if (err) return reject(err);
				resolve({
					n: res.length,
					affected: res as FullSchema<S>[],
				});
			});
		});
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
		filter?: Filter<FullSchema<S>>;
		skip?: number;
		limit?: number;
		sort?: SchemaKeySort<FullSchema<S>>;
		project?: SchemaKeyProjection<FullSchema<S>>;
	}): Promise<FullSchema<S>[]> {
		filter = fixDeep(filter || {});
		const cursor = (await this._connect()).find<FullSchema<S>>(filter);
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
		return new Promise((resolve, reject) => {
			cursor.exec((err, res) => {
				if (err) return reject(err);
				resolve(res);
			});
		});
	}

	/**
	 * Update many documents that meets the specified criteria
	 */
	public async updateMany({
		filter,
		update,
	}: {
		filter: Filter<FullSchema<S>>;
		update: UpdateOperators<FullSchema<S>>;
	}): Promise<OperatedMany<FullSchema<S>>> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<FullSchema<S>>(
				filter,
				update,
				{
					multi: true,
					upsert: false,
					returnUpdatedDocs: true,
				},
				(err, n, affected) => {
					if (err) return reject(err);
					resolve({
						n,
						affected: util.isArray(affected)
							? affected
							: affected
							? [affected]
							: [],
					});
				}
			);
		});
	}

	/**
	 * Update one document that meets the specified criteria
	 */
	public async updateOne({
		filter,
		update,
	}: {
		filter: Filter<FullSchema<S>>;
		update: UpdateOperators<FullSchema<S>>;
	}): Promise<OperatedOne<FullSchema<S>>> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		if (update.$set) {
			update.$set = fixDeep(update.$set);
		}
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<FullSchema<S>>(
				filter,
				update,
				{
					multi: false,
					upsert: false,
					returnUpdatedDocs: true,
				},
				(err, n, affected) => {
					if (err) return reject(err);
					resolve({
						n,
						affected: util.isArray(affected)
							? affected[0]
							: affected
							? affected
							: null,
					});
				}
			);
		});
	}

	/**
	 * Update many documents that meets the specified criteria
	 * and create the document when they are not found
	 */
	public async upsertMany({
		filter,
		doc,
	}: {
		filter: Filter<FullSchema<S>>;
		doc: S;
	}): Promise<OperatedMany<FullSchema<S>> & { upsert: boolean }> {
		filter = fixDeep(filter || {});
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<FullSchema<S>>(
				filter,
				doc,
				{
					multi: true,
					upsert: true,
					returnUpdatedDocs: true,
				},
				(err, n, affected, upsert) => {
					if (err) return reject(err);
					resolve({
						n,
						affected: util.isArray(affected)
							? affected
							: affected
							? [affected]
							: [],
						upsert: !!upsert,
					});
				}
			);
		});
	}

	/**
	 * Update one document that meets the specified criteria
	 * and create them when they are not found
	 */
	public async upsertOne({
		filter,
		doc,
	}: {
		filter: Filter<FullSchema<S>>;
		doc: S;
	}): Promise<OperatedOne<FullSchema<S>> & { upsert: boolean }> {
		filter = fixDeep(filter || {});
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<FullSchema<S>>(
				filter,
				doc,
				{
					multi: false,
					upsert: true,
					returnUpdatedDocs: true,
				},
				(err, n, affected, upsert) => {
					if (err) return reject(err);
					resolve({
						n,
						affected: util.isArray(affected)
							? affected[0]
							: affected
							? affected
							: null,
						upsert: !!upsert,
					});
				}
			);
		});
	}

	/**
	 * Delete many documents that meets the specified criteria
	 *
	 */
	public async deleteMany({
		filter,
	}: {
		filter: Filter<FullSchema<S>>;
	}): Promise<OperatedMany<FullSchema<S>>> {
		filter = fixDeep(filter || {});
		const doc = await this.find({ filter });
		return new Promise(async (resolve, reject) => {
			(await this._connect()).remove(
				filter,
				{
					multi: true,
				},
				(err, num) => {
					if (err) return reject(err);
					resolve({
						n: num,
						affected: doc,
					});
				}
			);
		});
	}

	/**
	 * Delete one document that meets the specified criteria
	 */
	public async deleteOne({
		filter,
	}: {
		filter: Filter<FullSchema<S>>;
	}): Promise<OperatedOne<FullSchema<S>>> {
		filter = fixDeep(filter || {});
		const doc = await this.find({ filter });
		return new Promise(async (resolve, reject) => {
			(await this._connect()).remove(
				filter,
				{
					multi: false,
				},
				(err, num) => {
					if (err) return reject(err);
					resolve({
						n: num,
						affected: doc[0] || null,
					});
				}
			);
		});
	}

	/**
	 * Count documents that meets the specified criteria
	 */
	public async count({
		filter,
	}: {
		filter?: Filter<FullSchema<S>>;
	} = {}): Promise<number> {
		filter = fixDeep(filter || {});
		return new Promise(async (resolve, reject) => {
			(await this._connect()).count(filter || {}, (err, res) => {
				if (err) return reject(err);
				resolve(res);
			});
		});
	}

	public async drop({
		dbName,
	}: {
		dbName: string;
	}): Promise<{ n: number; affected: never[] }> {
		if (this._dbName !== dbName) {
			throw new Error("Supplied name of the database is not correct");
		}
		const n = await this.count();
		await this.deleteMany({ filter: {} });
		await promisify(unlink)(path.resolve(dbName));
		return {
			n,
			affected: [],
		};
	}

	/**
	 * Aliases
	 *
	 */
	query(filter: Filter<FullSchema<S>>) {
		return this.read({ filter });
	}

	find = this.read;
	insert = this.createOne;
	insertOne = this.createOne;
	insertMany = this.createMany;
	removeOne = this.deleteOne;
	removeMany = this.deleteMany;
}

function fixDeep<T extends { $deep?: any }>(input: T): T {
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
