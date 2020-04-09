import { _NEDB } from "./db";
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

export class Operations<Schema> {
	private _nedbBase: _NEDB<Schema>;
	private _dbName: string;

	constructor(_nedb: _NEDB<Schema>, name: string) {
		this._nedbBase = _nedb;
		this._dbName = name;
	}

	private _connect() {
		return new Promise<_NEDB<Schema>>((resolve, reject) => {
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
		doc: Schema;
	}): Promise<OperatedOne<Schema> & { affected: Schema }> {
		return new Promise(async (resolve, reject) => {
			(await this._connect()).insert([doc], (err, res) => {
				if (err) return reject(err);
				resolve({
					n: res.length,
					affected: res[0],
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
		docs: Schema[];
	}): Promise<OperatedMany<Schema>> {
		return new Promise(async (resolve, reject) => {
			(await this._connect()).insert(docs, (err, res) => {
				if (err) return reject(err);
				resolve({
					n: res.length,
					affected: res,
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
		filter?: Filter<Schema>;
		skip?: number;
		limit?: number;
		sort?: SchemaKeySort<Schema>;
		project?: SchemaKeyProjection<Schema>;
	}): Promise<Schema[]> {
		filter = fixDeep(filter || {});
		const cursor = (await this._connect()).find<Schema>(filter);
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
		filter: Filter<Schema>;
		update: UpdateOperators<Schema>;
	}): Promise<OperatedMany<Schema>> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<Schema>(
				filter,
				update,
				{
					multi: true,
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
		upsert = false,
	}: {
		filter: Filter<Schema>;
		update: UpdateOperators<Schema>;
		upsert: boolean;
	}): Promise<OperatedOne<Schema> & { upsert: boolean }> {
		filter = fixDeep(filter || {});
		update = fix$Pull$eq(update);
		return new Promise(async (resolve, reject) => {
			(await this._connect()).update<Schema>(
				filter,
				update,
				{
					multi: false,
					upsert,
					returnUpdatedDocs: true,
				},
				(err, n, affected, upsert) => {
					if (err) return reject(err);
					resolve({
						n,
						upsert,
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
	 * Delete many documents that meets the specified criteria
	 *
	 */
	public async deleteMany({
		filter,
	}: {
		filter: Filter<Schema>;
	}): Promise<OperatedMany<Schema>> {
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
		filter: Filter<Schema>;
	}): Promise<OperatedOne<Schema>> {
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
		filter?: Filter<Schema>;
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
	}): Promise<OperatedMany<Schema>> {
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
