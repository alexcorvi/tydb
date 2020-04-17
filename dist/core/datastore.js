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
const cursor_1 = require("./cursor");
const customUtils = require("./customUtils");
const indexes_1 = require("./indexes");
const model = require("./model");
const persistence_1 = require("./persistence");
const p_queue_1 = require("p-queue");
const util = require("util");
class Datastore {
    constructor(options) {
        this.filename = "";
        this.timestampData = true;
        // rename to something denotes that it's an internal thing
        this.q = new p_queue_1.default({
            concurrency: 1,
            autoStart: false,
        });
        this.indexes = {
            _id: new indexes_1.Index({ fieldName: "_id", unique: true }),
        };
        this.ttlIndexes = {};
        if (options.ref) {
            this.filename = options.ref;
        }
        // Persistence handling
        this.persistence = new persistence_1.Persistence({
            db: this,
            afterSerialization: options.afterSerialization,
            beforeDeserialization: options.beforeDeserialization,
            corruptAlertThreshold: options.corruptAlertThreshold || 0,
        });
    }
    /**
     * Load the database from the datafile, and trigger the execution of buffered commands if any
     */
    loadDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
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
    resetIndexes(newData) {
        Object.keys(this.indexes).forEach((i) => {
            this.indexes[i].reset(newData);
        });
    }
    /**
     * Ensure an index is kept for this field. Same parameters as lib/indexes
     * For now this function is synchronous, we need to test how much time it takes
     * We use an async API for consistency with the rest of the code
     */
    ensureIndex(options) {
        return __awaiter(this, void 0, void 0, function* () {
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
            return yield this.persistence.persistNewState([
                { $$indexCreated: options },
            ]);
        });
    }
    /**
     * Remove an index
     */
    removeIndex(fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            delete this.indexes[fieldName];
            return yield this.persistence.persistNewState([
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
        // STEP 1: get candidates list by checking indexes from most to least frequent use case
        let usableQueryKeys = [];
        // possibility: basic match
        Object.keys(query).forEach((k) => {
            // only types that can't be used with . notation
            if (this._isBasicType(query[k])) {
                usableQueryKeys.push(k);
            }
        });
        usableQueryKeys = usableQueryKeys.filter((key) => currentIndexKeys.indexOf(key) !== -1);
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
        }
        // possibility: using $eq
        Object.keys(query).forEach((k) => {
            if (query[k] &&
                query[k].hasOwnProperty("$eq") &&
                this._isBasicType(query[k].$eq)) {
                usableQueryKeys.push(k);
            }
        });
        usableQueryKeys = usableQueryKeys.filter((key) => currentIndexKeys.indexOf(key) !== -1);
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]]);
        }
        // possibility: using $in
        Object.keys(query).forEach((k) => {
            if (query[k] && query[k].hasOwnProperty("$in")) {
                usableQueryKeys.push(k);
            }
        });
        usableQueryKeys = usableQueryKeys.filter((key) => currentIndexKeys.indexOf(key) !== -1);
        if (usableQueryKeys.length > 0) {
            return this.indexes[usableQueryKeys[0]].getMatching(query[usableQueryKeys[0]].$in);
        }
        // possibility: using $lt $lte $gt $gte
        Object.keys(query).forEach((k) => {
            if (query[k] &&
                (query[k].hasOwnProperty("$lt") ||
                    query[k].hasOwnProperty("$lte") ||
                    query[k].hasOwnProperty("$gt") ||
                    query[k].hasOwnProperty("$gte"))) {
                usableQueryKeys.push(k);
            }
        });
        usableQueryKeys = usableQueryKeys.filter((key) => currentIndexKeys.indexOf(key) !== -1);
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
        return __awaiter(this, void 0, void 0, function* () {
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
                        util.isDate(candidate[field]) &&
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
        return __awaiter(this, void 0, void 0, function* () {
            let preparedDoc = this.prepareDocumentForInsertion(newDoc);
            this._insertInCache(preparedDoc);
            yield this.persistence.persistNewState(util.isArray(preparedDoc) ? preparedDoc : [preparedDoc]);
            return model.deepCopy(preparedDoc);
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
        if (util.isArray(newDoc)) {
            newDoc.forEach((doc) => {
                preparedDoc.push(this.prepareDocumentForInsertion(doc));
            });
        }
        else {
            preparedDoc = model.deepCopy(newDoc);
            if (preparedDoc._id === undefined) {
                preparedDoc._id = this.createNewId();
            }
            const now = new Date();
            if (preparedDoc.createdAt === undefined) {
                preparedDoc.createdAt = now;
            }
            if (preparedDoc.updatedAt === undefined) {
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
        return __awaiter(this, void 0, void 0, function* () {
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
        return __awaiter(this, void 0, void 0, function* () {
            const cursor = new cursor_1.Cursor(this, query);
            return (yield cursor.exec()).length;
        });
    }
    /**
     * Find all documents matching the query
     */
    find(query) {
        return __awaiter(this, void 0, void 0, function* () {
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
        return __awaiter(this, void 0, void 0, function* () {
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
                        let createdAt;
                        createdAt = candidates[i].createdAt;
                        let modifiedDoc = model.modify(candidates[i], updateQuery);
                        modifiedDoc.createdAt = createdAt;
                        if (updateQuery.updatedAt === undefined &&
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
                yield this.persistence.persistNewState(updatedDocs);
                return {
                    number: updatedDocs.length,
                    docs: updatedDocs.map((x) => model.deepCopy(x)),
                    upsert: false,
                };
            }
            else if (res.length === 0 && upsert) {
                let toBeInserted;
                try {
                    model.checkObject(updateQuery);
                    // updateQuery is a simple object with no modifier, use it as the document to insert
                    toBeInserted = updateQuery;
                }
                catch (e) {
                    // updateQuery contains modifiers, use the find query as the base,
                    // strip it from all operators and update it according to updateQuery
                    toBeInserted = model.modify(model.deepCopy(query, true), updateQuery);
                }
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
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.q.add(() => this._update(query, updateQuery, options));
        });
    }
    /**
     * Remove all docs matching the query
     * For now very naive implementation (similar to update)
     */
    _remove(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let numRemoved = 0;
            const removedDocs = [];
            const removedFullDoc = [];
            let multi = options ? !!options.multi : false;
            const candidates = yield this.getCandidates(query, true);
            candidates.forEach((d) => {
                if (model.match(d, query) && (multi || numRemoved === 0)) {
                    numRemoved++;
                    removedFullDoc.push(model.deepCopy(d));
                    removedDocs.push({ $$deleted: true, _id: d._id });
                    this.removeFromIndexes(d);
                }
            });
            yield this.persistence.persistNewState(removedDocs);
            return {
                number: numRemoved,
                docs: removedFullDoc,
            };
        });
    }
    remove(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.q.add(() => this._remove(query, options));
        });
    }
}
exports.Datastore = Datastore;
