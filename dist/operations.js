"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class Operations {
    constructor(_datastore) {
        /**
         * Put one document
         */
        this.create = this.insert;
        /**
         * Find documents that meets a specified criteria
         */
        this.find = this.read;
        this._datastore = _datastore;
    }
    _connect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._datastore.loadDatabase();
            return this._datastore;
        });
    }
    /**
     * Put one document
     */
    insert(docs) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._connect()).insert(docs);
        });
    }
    /**
     * Database cursor
     */
    cursor(filter) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._connect()).cursor(filter);
        });
    }
    /**
     * Find documents that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort = undefined, }) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            const cursor = (yield this._connect()).cursor(filter);
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
        });
    }
    /**
     * Update many documents that meets the specified criteria
     */
    update({ filter, update, multi, }) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            update = fix$Pull$eq(update);
            if (update.$set) {
                update.$set = fixDeep(update.$set);
            }
            return yield (yield this._connect()).update(filter, update, {
                multi,
                upsert: false,
            });
        });
    }
    /**
     * Update documents that meets the specified criteria,
     * and insert the update query if no documents are matched
     */
    upsert({ filter, update, multi, }) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            return yield (yield this._connect()).update(filter, update, {
                multi,
                upsert: true,
            });
        });
    }
    /**
     * Delete many documents that meets the specified criteria
     *
     */
    delete({ filter, multi, }) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            return (yield this._connect()).remove(filter, { multi });
        });
    }
    /**
     * Count documents that meets the specified criteria
     */
    count({ filter, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            return yield (yield this._connect()).count(filter);
        });
    }
}
exports.Operations = Operations;
function fixDeep(input) {
    const result = Object.assign(input, input.$deep);
    delete result.$deep;
    return result;
}
function fix$Pull$eq(updateQuery) {
    if (updateQuery.$pull) {
        Object.keys(updateQuery.$pull).forEach((key) => {
            if (updateQuery.$pull[key].$eq) {
                updateQuery.$pull[key] = updateQuery.$pull[key].$eq;
            }
        });
    }
    return updateQuery;
}
