import Datastore from "./datastore";
import * as model from "./model";

interface BaseSchema {
	_id: string;
	updatedAt: Date;
	createdAt: Date;
}

/**
 * Create a new cursor for this collection
 */
class Cursor<G extends Partial<BaseSchema>> {
	db: Datastore<G>;
	query: { [key: string]: any };

	private _limit: number | undefined;
	private _skip: number | undefined;
	private _sort: undefined | { [key: string]: number };

	private _projection: undefined | { [key: string]: number };

	constructor(db: any, query: any) {
		this.db = db;
		this.query = query || {};
	}

	/**
	 * Set a limit to the number of results
	 */
	limit(limit: number) {
		this._limit = limit;
		return this;
	}

	/**
	 * Skip a the number of results
	 */
	skip(skip: number) {
		this._skip = skip;
		return this;
	}

	/**
	 * Sort results of the query
	 */
	sort(sortQuery: { [key: string]: number }) {
		this._sort = sortQuery;
		return this;
	}

	/**
	 * Add the use of a projection
	 */
	projection(projection: { [key: string]: number }) {
		this._projection = projection;
		return this;
	}

	/**
	 * Apply the projection
	 */
	project(candidates: any[]) {
		if (
			this._projection === undefined ||
			Object.keys(this._projection).length === 0
		) {
			return candidates;
		}

		let res: any[] = [];

		let keepId = this._projection._id === 0 ? false : true;
		delete this._projection._id; // CHANGED
		// TODO: remove all CHANGED

		let keys = Object.keys(this._projection);

		// Check for consistency
		// either all are 0, or all are -1
		let actions = keys.map((k) => this._projection![k]).sort();
		if (actions[0] !== actions[actions.length - 1]) {
			throw new Error("Can't both keep and omit fields except for _id");
		}

		let action = actions[0];

		// Do the actual projection
		candidates.forEach((candidate) => {
			let toPush: { [key: string]: any } = {};
			if (action === 1) {
				// pick-type projection
				toPush = { $set: {} };
				keys.forEach((k) => {
					toPush.$set[k] = model.getDotValue(candidate, k);
					if (toPush.$set[k] === undefined) {
						delete toPush.$set[k];
					}
				});
				toPush = model.modify({} as any, toPush);
			} else {
				// omit-type projection
				toPush = { $unset: {} };
				keys.forEach((k) => {
					toPush.$unset[k] = true;
				});
				toPush = model.modify(candidate, toPush);
			}
			if (keepId) {
				toPush._id = candidate._id;
			} else {
				delete toPush._id;
			}
			res.push(toPush);
		});

		return res;
	}

	/**
	 * Get all matching elements
	 * Will return pointers to matched elements (shallow copies), returning full copies is the role of find or findOne
	 *
	 */
	async __exec_unsafe() {
		let res: G[] = [];
		let added = 0;
		let skipped = 0;
		let error: any = undefined;
		const candidates = await this.db.getCandidates(this.query);

		for (let i = 0; i < candidates.length; i++) {
			if (model.match(candidates[i], this.query)) {
				// If a sort is defined, wait for the results to be sorted before applying limit and skip
				if (!this._sort) {
					if (this._skip && this._skip > skipped) {
						skipped++;
					} else {
						res.push(candidates[i]);
						added++;
						if (this._limit && this._limit <= added) {
							break;
						}
					}
				} else {
					res.push(candidates[i]);
				}
			}
		}

		// Apply all sorts
		if (this._sort) {
			let keys = Object.keys(this._sort);

			// Sorting
			const criteria: { key: string; direction: number }[] = [];
			for (let i = 0; i < keys.length; i++) {
				let key = keys[i];
				criteria.push({ key, direction: this._sort[key] });
			}
			res.sort((a, b) => {
				let criterion;
				let compare;
				let i;
				for (i = 0; i < criteria.length; i++) {
					criterion = criteria[i];
					compare =
						criterion.direction *
						model.compareThings(
							model.getDotValue(a, criterion.key),
							model.getDotValue(b, criterion.key)
						);
					if (compare !== 0) {
						return compare;
					}
				}
				return 0;
			});

			// Applying limit and skip
			const limit = this._limit || res.length;

			const skip = this._skip || 0;

			res = res.slice(skip, skip + limit);
		}

		// Apply projection
		res = this.project(res);

		return res;
	}

	private async _exec() {
		return this.db.q.add(() => this.__exec_unsafe());
	}

	async exec() {
		const original = await this._exec();
		const res: G[] = [];
		for (let index = 0; index < original.length; index++) {
			const element = original[index];
			res.push(model.deepCopy(original) as any);
		}
		return res;
	}
}

// Interface
export default Cursor;
