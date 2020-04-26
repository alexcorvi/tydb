"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("./core");
const types_1 = require("./types"); // for some reason using @types will disable some type checks
class Database {
    constructor(options) {
        /**
         * Put one document
         */
        this.create = this.insert;
        /**
         * Find documents that meets a specified criteria
         */
        this.find = this.read;
        const model = options.model ||
            types_1.BaseModel;
        this.ref = options.ref;
        this._datastore = new core_1.Datastore({
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
            this._datastore.persistence.setAutocompactionInterval(options.autoCompaction);
        }
    }
    /**
     * Put one document
     */
    insert(docs) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const res = yield this._datastore.insert(docs);
            return res;
        });
    }
    /**
     * Find documents that meets a specified criteria
     */
    read({ filter, skip, limit, project, sort = undefined, }) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            sort = fixDeep(sort || {});
            project = fixDeep(project || {});
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
            return yield cursor.exec();
        });
    }
    /**
     * Update many documents that meets the specified criteria
     */
    update({ filter, update, multi, }) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            if (update.$set) {
                update.$set = fixDeep(update.$set);
            }
            if (update.$unset) {
                update.$unset = fixDeep(update.$unset);
            }
            const res = yield this._datastore.update(filter, update, {
                multi,
                upsert: false,
            });
            return res;
        });
    }
    /**
     * Update documents that meets the specified criteria,
     * and insert the update query if no documents are matched
     */
    upsert({ filter, update, multi, }) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            if (update.$set) {
                update.$set = fixDeep(update.$set);
            }
            if (update.$unset) {
                update.$unset = fixDeep(update.$unset);
            }
            const res = yield this._datastore.update(filter, update, {
                multi,
                upsert: true,
            });
            return res;
        });
    }
    /**
     * Count documents that meets the specified criteria
     */
    count(filter = {}) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            return yield this._datastore.count(filter);
        });
    }
    /**
     * Delete many documents that meets the specified criteria
     *
     */
    delete({ filter, multi, }) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            filter = fixDeep(filter || {});
            const res = yield this._datastore.remove(filter, {
                multi: multi || false,
            });
            return res;
        });
    }
    reload() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this._datastore.persistence.loadDatabase();
        });
    }
    compact() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this._datastore.persistence.compactDatafile();
        });
    }
    stopAutoCompaction() {
        this._datastore.persistence.stopAutocompaction();
    }
    resetAutoCompaction(interval) {
        this._datastore.persistence.setAutocompactionInterval(interval);
    }
}
exports.Database = Database;
function fixDeep(input) {
    const result = Object.assign(input, input.$deep);
    delete result.$deep;
    return result;
}
