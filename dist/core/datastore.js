"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const cursor_1 = require("./cursor");
const customUtils = require("./customUtils");
const indexes_1 = require("./indexes");
const model = require("./model");
const persistence_1 = require("./persistence");
const base_schema_1 = require("../types/base-schema");
const p_queue_1 = require("p-queue");
class Datastore {
    constructor(options) {
        this.ref = "db";
        this.timestampData = false;
        // rename to something denotes that it's an internal thing
        this.q = new p_queue_1.default({
            concurrency: 1,
            autoStart: false,
        });
        this.indexes = {
            _id: new indexes_1.Index({ fieldName: "_id", unique: true }),
        };
        this.ttlIndexes = {};
        this.model = options.model || base_schema_1.BaseModel;
        if (options.ref) {
            this.ref = options.ref;
        }
        const PersistenceAdapter = options.persistence_adapter || persistence_1.Persistence;
        // Persistence handling
        this.persistence = new PersistenceAdapter({
            db: this,
            model: options.model,
            afterSerialization: options.afterSerialization,
            beforeDeserialization: options.beforeDeserialization,
            corruptAlertThreshold: options.corruptAlertThreshold || 0,
        });
        if (options.timestampData) {
            this.timestampData = true;
        }
    }
    /**
     * Load the database from the datafile, and trigger the execution of buffered commands if any
     */
    loadDatabase() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield this.persistence.loadDatabase();
        });
    }
    /**
     * Get an array of all the data in the database
     */
    getAllData() {
        return this.indexes._id.getAll();
    }
    /**
     * Reset all currently defined indexes
     */
    resetIndexes() {
        Object.keys(this.indexes).forEach((i) => {
            this.indexes[i].reset();
        });
    }
    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it takes
     * We use an async API for consistency with the rest of the code
     */
    ensureIndex(options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            options = options || {};
            if (!options.fieldName) {
                let err = new Error("Cannot create an index without a fieldName");
                err.missingFieldName = true;
                throw err;
            }
            if (this.indexes[options.fieldName]) {
                return;
            }
            this.indexes[options.fieldName] = new indexes_1.Index(options);
            // TTL
            if (options.expireAfterSeconds !== undefined) {
                this.ttlIndexes[options.fieldName] = options.expireAfterSeconds;
            }
            // Index data
            try {
                this.indexes[options.fieldName].insert(this.getAllData());
            }
            catch (e) {
                delete this.indexes[options.fieldName];
                throw e;
            }
            // We may want to force all options to be persisted including defaults, not just the ones passed the index creation function
            return yield this.persistence.persistByAppendNewIndex([
                { $$indexCreated: options },
            ]);
        });
    }
    /**
     * Remove an index
     */
    removeIndex(fieldName) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            delete this.indexes[fieldName];
            return yield this.persistence.persistByAppendNewIndex([
                { $$indexRemoved: fieldName },
            ]);
        });
    }
    /**
     * Add one or several document(s) to all indexes
     */
    addToIndexes(doc) {
        let failingIndex = -1;
        let error;
        const keys = Object.keys(this.indexes);
        for (let i = 0; i < keys.length; i++) {
            try {
                this.indexes[keys[i]].insert(doc);
            }
            catch (e) {
                failingIndex = i;
                error = e;
                break;
            }
        }
        // If an error happened, we need to rollback the insert on all other indexes
        if (error) {
            for (let i = 0; i < failingIndex; i++) {
                this.indexes[keys[i]].remove(doc);
            }
            throw error;
        }
    }
    /**
     * Remove one or several document(s) from all indexes
     */
    removeFromIndexes(doc) {
        Object.keys(this.indexes).forEach((i) => {
            this.indexes[i].remove(doc);
        });
    }
    updateIndexes(oldDoc, newDoc) {
        let failingIndex = -1;
        let error;
        const keys = Object.keys(this.indexes);
        for (let i = 0; i < keys.length; i++) {
            try {
                this.indexes[keys[i]].update(oldDoc, newDoc);
            }
            catch (e) {
                failingIndex = i;
                error = e;
                break;
            }
        }
        // If an error happened, we need to rollback the update on all other indexes
        if (error) {
            for (let i = 0; i < failingIndex; i++) {
                this.indexes[keys[i]].revertUpdate(oldDoc, newDoc);
            }
            throw error;
        }
    }
    _isBasicType(value) {
        return (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            value instanceof Date ||
            value === null);
    }
    /**
     * This will return the least number of candidates,
     * using Index if possible
     * when failing it will return all the database
     */
    _leastCandidates(query) {
        const currentIndexKeys = Object.keys(this.indexes);
        const queryKeys = Object.keys(query);
        // STEP 1: get candidates list by checking indexes from most to least frequent use case
        let usableQueryKeys = [];
        // possibility: basic match
        queryKeys.forEach((k) => {
            // only types that can't be used with . notation
            if (this._isBasicType(query[k]) &&
                currentIndexKeys.indexOf(k) !== -1) {
                usableQueryKeys.push(k);
            }
        });
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
        }
        // possibility: using $eq
        queryKeys.forEach((k) => {
            if (query[k] &&
                query[k].hasOwnProperty("$eq") &&
                this._isBasicType(query[k].$eq) &&
                currentIndexKeys.indexOf(k) !== -1) {
                usableQueryKeys.push(k);
            }
        });
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
        }
        // possibility: using $in
        queryKeys.forEach((k) => {
            if (query[k] &&
                query[k].hasOwnProperty("$in") &&
                currentIndexKeys.indexOf(k) !== -1) {
                usableQueryKeys.push(k);
            }
        });
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in);
        }
        // possibility: using $lt $lte $gt $gte
        queryKeys.forEach((k) => {
            if (query[k] &&
                currentIndexKeys.indexOf(k) !== -1 &&
                (query[k].hasOwnProperty("$lt") ||
                    query[k].hasOwnProperty("$lte") ||
                    query[k].hasOwnProperty("$gt") ||
                    query[k].hasOwnProperty("$gte"))) {
                usableQueryKeys.push(k);
            }
        });
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getBetweenBounds(query[usableQueryKeys[0]]);
        }
        return this.getAllData();
    }
    /**
     * Return the list of candidates for a given query
     * Crude implementation for now, we return the candidates given by the first usable index if any
     * We try the following query types, in this order: basic match, $in match, comparison match
     * One way to make it better would be to enable the use of multiple indexes if the first usable index
     * returns too much data. I may do it in the future.
     *
     * Returned candidates will be scanned to find and remove all expired documents
     */
    getCandidates(query, dontExpireStaleDocs) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const candidates = this._leastCandidates(query);
            if (dontExpireStaleDocs) {
                return candidates;
            }
            const expiredDocsIds = [];
            const validDocs = [];
            const ttlIndexesFieldNames = Object.keys(this.ttlIndexes);
            candidates.forEach((candidate) => {
                let valid = true;
                ttlIndexesFieldNames.forEach((field) => {
                    if (candidate[field] !== undefined &&
                        candidate[field] instanceof Date &&
                        Date.now() >
                            candidate[field].getTime() +
                                this.ttlIndexes[field] * 1000) {
                        valid = false;
                    }
                });
                if (valid) {
                    validDocs.push(candidate);
                }
                else if (candidate._id) {
                    expiredDocsIds.push(candidate._id);
                }
            });
            for (let index = 0; index < expiredDocsIds.length; index++) {
                const _id = expiredDocsIds[index];
                yield this._remove({ _id }, { multi: false });
            }
            return validDocs;
        });
    }
    /**
     * Insert a new document
     */
    _insert(newDoc) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let preparedDoc = this.prepareDocumentForInsertion(newDoc);
            this._insertInCache(preparedDoc);
            yield this.persistence.persistByAppendNewData(Array.isArray(preparedDoc) ? preparedDoc : [preparedDoc]);
            return model.deepCopy(preparedDoc, this.model);
        });
    }
    /**
     * Create a new _id that's not already in use
     */
    createNewId() {
        let tentativeId = customUtils.uid();
        if (this.indexes._id.getMatching(tentativeId).length > 0) {
            tentativeId = this.createNewId();
        }
        return tentativeId;
    }
    /**
     * Prepare a document (or array of documents) to be inserted in a database
     * Meaning adds _id and timestamps if necessary on a copy of newDoc to avoid any side effect on user input
     */
    prepareDocumentForInsertion(newDoc) {
        let preparedDoc = [];
        if (Array.isArray(newDoc)) {
            newDoc.forEach((doc) => {
                preparedDoc.push(this.prepareDocumentForInsertion(doc));
            });
        }
        else {
            preparedDoc = model.deepCopy(newDoc, this.model);
            if (preparedDoc._id === undefined) {
                preparedDoc._id = this.createNewId();
            }
            const now = new Date();
            if (this.timestampData && preparedDoc.createdAt === undefined) {
                preparedDoc.createdAt = now;
            }
            if (this.timestampData && preparedDoc.updatedAt === undefined) {
                preparedDoc.updatedAt = now;
            }
            model.checkObject(preparedDoc);
        }
        return preparedDoc;
    }
    /**
     * If newDoc is an array of documents, this will insert all documents in the cache
     */
    _insertInCache(preparedDoc) {
        if (Array.isArray(preparedDoc)) {
            this._insertMultipleDocsInCache(preparedDoc);
        }
        else {
            this.addToIndexes(preparedDoc);
        }
    }
    /**
     * If one insertion fails (e.g. because of a unique constraint), roll back all previous
     * inserts and throws the error
     */
    _insertMultipleDocsInCache(preparedDocs) {
        let failingI = -1;
        let error;
        for (let i = 0; i < preparedDocs.length; i++) {
            try {
                this.addToIndexes(preparedDocs[i]);
            }
            catch (e) {
                error = e;
                failingI = i;
                break;
            }
        }
        if (error) {
            for (let i = 0; i < failingI; i++) {
                this.removeFromIndexes(preparedDocs[i]);
            }
            throw error;
        }
    }
    insert(newDoc) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const res = yield this.q.add(() => this._insert(newDoc));
            if (Array.isArray(res)) {
                return {
                    docs: res,
                    number: res.length,
                };
            }
            else {
                return {
                    docs: [res],
                    number: 1,
                };
            }
        });
    }
    /**
     * Count all documents matching the query
     */
    count(query) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cursor = new cursor_1.Cursor(this, query);
            return (yield cursor.exec()).length;
        });
    }
    /**
     * Find all documents matching the query
     */
    find(query) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const cursor = new cursor_1.Cursor(this, query);
            const docs = yield cursor.exec();
            return docs;
        });
    }
    /**
     * Find all documents matching the query
     */
    cursor(query) {
        const cursor = new cursor_1.Cursor(this, query);
        return cursor;
    }
    /**
     * Update all docs matching query
     */
    _update(query, updateQuery, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let multi = options.multi !== undefined ? options.multi : false;
            let upsert = options.upsert !== undefined ? options.upsert : false;
            const cursor = new cursor_1.Cursor(this, query);
            cursor.limit(1);
            const res = yield cursor.__exec_unsafe();
            if (res.length > 0) {
                let numReplaced = 0;
                const candidates = yield this.getCandidates(query);
                const modifications = [];
                // Preparing update (if an error is thrown here neither the datafile nor
                // the in-memory indexes are affected)
                for (let i = 0; i < candidates.length; i++) {
                    if ((multi || numReplaced === 0) &&
                        model.match(candidates[i], query)) {
                        numReplaced++;
                        let createdAt = candidates[i].createdAt;
                        let modifiedDoc = model.modify(candidates[i], updateQuery, this.model);
                        if (createdAt) {
                            modifiedDoc.createdAt = createdAt;
                        }
                        if (this.timestampData &&
                            updateQuery.updatedAt === undefined &&
                            (!updateQuery.$set ||
                                updateQuery.$set.updatedAt === undefined)) {
                            modifiedDoc.updatedAt = new Date();
                        }
                        modifications.push({
                            oldDoc: candidates[i],
                            newDoc: modifiedDoc,
                        });
                    }
                }
                // Change the docs in memory
                this.updateIndexes(modifications);
                // Update the datafile
                const updatedDocs = modifications.map((x) => x.newDoc);
                yield this.persistence.persistByAppendNewData(updatedDocs);
                return {
                    number: updatedDocs.length,
                    docs: updatedDocs.map((x) => model.deepCopy(x, this.model)),
                    upsert: false,
                };
            }
            else if (res.length === 0 && upsert) {
                if (!updateQuery.$setOnInsert) {
                    throw new Error("$setOnInsert modifier is required when upserting");
                }
                let toBeInserted = model.deepCopy(updateQuery.$setOnInsert, this.model, true);
                const newDoc = yield this._insert(toBeInserted);
                if (Array.isArray(newDoc)) {
                    return {
                        number: newDoc.length,
                        docs: newDoc,
                        upsert: true,
                    };
                }
                else {
                    return {
                        number: 1,
                        docs: [newDoc],
                        upsert: true,
                    };
                }
            }
            else {
                return {
                    number: 0,
                    docs: [],
                    upsert: false,
                };
            }
        });
    }
    update(query, updateQuery, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield this.q.add(() => this._update(query, updateQuery, options));
        });
    }
    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     */
    _remove(query, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let numRemoved = 0;
            const removedDocs = [];
            const removedFullDoc = [];
            let multi = options ? !!options.multi : false;
            const candidates = yield this.getCandidates(query, true);
            candidates.forEach((d) => {
                if (model.match(d, query) && (multi || numRemoved === 0)) {
                    numRemoved++;
                    removedFullDoc.push(model.deepCopy(d, this.model));
                    removedDocs.push({ $$deleted: true, _id: d._id });
                    this.removeFromIndexes(d);
                }
            });
            yield this.persistence.persistByAppendNewData(removedDocs);
            return {
                number: numRemoved,
                docs: removedFullDoc,
            };
        });
    }
    remove(query, options) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return this.q.add(() => this._remove(query, options));
        });
    }
}
exports.Datastore = Datastore;
