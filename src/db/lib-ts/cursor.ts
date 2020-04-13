import * as model from "./model";

/**
 * Create a new cursor for this collection
 * @param {Datastore} db - The datastore this cursor is bound to
 * @param {Query} query - The query this cursor will operate on
 * @param {Function} execFn - Handler to be executed after cursor has found the results and before the callback passed to find/findOne/update/remove
 */
class Cursor {
	db: any; // TODO place datastore instance
	query: { [key: string]: any };

	execFn: ((err: any, res: any, cb: any) => void) | undefined;

	private _limit: number | undefined;
	private _skip: number | undefined;
	private _sort: undefined | { [key: string]: number };

	private _projection: undefined | { [key: string]: number };

	constructor(db: any, query: any, execFn?: any) {
		this.db = db;
		this.query = query || {};
		if (execFn) {
			this.execFn = execFn;
		}
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
				toPush = model.modify({}, toPush);
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
	 * This is an internal function, use exec which uses the executor
	 *
	 */
	_exec(_callback: (err?: any, result?: any[]) => void) {
		let res: any[] = [];
		let added = 0;
		let skipped = 0;
		let error: any = undefined;

		const callback = (error?: any, res?: any[]) => {
			if (this.execFn) {
				return this.execFn(error, res, _callback);
			} else {
				return _callback(error, res);
			}
		};

		this.db.getCandidates(this.query, (err: any, candidates: any[]) => {
			if (err) {
				return callback(err);
			}

			try {
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
			} catch (err) {
				return callback(err);
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
								model.getDotValue(b, criterion.key),
								this.db.compareStrings
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
			try {
				res = this.project(res);
			} catch (e) {
				res = [];
				error = e;
			}

			return callback(error, res);
		});
	}

	exec(...args: any[]) {
		this.db.executor.push({ this: this, fn: this._exec, arguments: args });
	}
}

// Interface
export default Cursor;
