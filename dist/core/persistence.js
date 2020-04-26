"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const customUtils = require("./customUtils");
const indexes_1 = require("./indexes");
const model = require("./model");
class PersistenceEvent {
    constructor() {
        this.callbacks = {
            readLine: [],
            writeLine: [],
            end: [],
        };
    }
    on(event, cb) {
        if (!this.callbacks[event])
            this.callbacks[event] = [];
        this.callbacks[event].push(cb);
    }
    emit(event, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let cbs = this.callbacks[event];
            if (cbs) {
                for (let i = 0; i < cbs.length; i++) {
                    const cb = cbs[i];
                    yield cb(data);
                }
            }
        });
    }
}
exports.PersistenceEvent = PersistenceEvent;
/**
 * Create a new Persistence object for database options.db
 */
class Persistence {
    constructor(options) {
        this.ref = "";
        this.corruptAlertThreshold = 0.1;
        this.afterSerialization = (s) => s;
        this.beforeDeserialization = (s) => s;
        this._memoryIndexes = [];
        this._memoryData = [];
        this._model = options.model;
        this.db = options.db;
        this.ref = this.db.ref;
        this.corruptAlertThreshold =
            options.corruptAlertThreshold !== undefined
                ? options.corruptAlertThreshold
                : 0.1;
        if (this.ref && this.ref.charAt(this.ref.length - 1) === "~") {
            throw new Error("The datafile name can't end with a ~, which is reserved for crash safe backup files");
        }
        // After serialization and before deserialization hooks with some basic sanity checks
        if (options.afterSerialization && !options.beforeDeserialization) {
            throw new Error("Serialization hook defined but deserialization hook undefined, cautiously refusing to start Datastore to prevent dataloss");
        }
        if (!options.afterSerialization && options.beforeDeserialization) {
            throw new Error("Serialization hook undefined but deserialization hook defined, cautiously refusing to start Datastore to prevent dataloss");
        }
        this.afterSerialization =
            options.afterSerialization || this.afterSerialization;
        this.beforeDeserialization =
            options.beforeDeserialization || this.beforeDeserialization;
        let randomString = customUtils.randomString(113);
        if (this.beforeDeserialization(this.afterSerialization(randomString)) !== randomString) {
            throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start data store to prevent dataloss");
        }
        this.init();
    }
    persistAllIndexes() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const emitter = new PersistenceEvent();
            yield this.rewriteIndexes(emitter);
            const allKeys = Object.keys(this.db.indexes);
            for (let i = 0; i < allKeys.length; i++) {
                const fieldName = allKeys[i];
                if (fieldName !== "_id") {
                    // The special _id index is managed by datastore.ts, the others need to be persisted
                    yield emitter.emit("writeLine", this.afterSerialization(model.serialize({
                        $$indexCreated: {
                            fieldName,
                            unique: this.db.indexes[fieldName].unique,
                            sparse: this.db.indexes[fieldName].sparse,
                        },
                    })));
                }
            }
            yield emitter.emit("end", "");
        });
    }
    persistAllData() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const emitter = new PersistenceEvent();
            yield this.rewriteData(emitter);
            const allData = this.db.getAllData();
            for (let i = 0; i < allData.length; i++) {
                const doc = allData[i];
                yield emitter.emit("writeLine", this.afterSerialization(model.serialize(doc)));
            }
            yield emitter.emit("end", "");
        });
    }
    persistCachedDatabase() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.persistAllData();
            yield this.persistAllIndexes();
        });
    }
    /**
     * Queue a rewrite of the datafile
     */
    compactDatafile() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return yield this.db.q.add(() => this.persistCachedDatabase());
        });
    }
    /**
     * Set automatic compaction every interval ms
     */
    setAutocompactionInterval(interval) {
        const minInterval = 5000;
        const realInterval = Math.max(interval || 0, minInterval);
        this.stopAutocompaction();
        this.autocompactionIntervalId = setInterval(() => {
            this.compactDatafile();
        }, realInterval);
    }
    /**
     * Stop autocompaction (do nothing if autocompaction was not running)
     */
    stopAutocompaction() {
        if (this.autocompactionIntervalId) {
            clearInterval(this.autocompactionIntervalId);
        }
    }
    persistByAppendNewIndex(newDocs) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < newDocs.length; i++) {
                const doc = newDocs[i];
                yield this.appendIndex(this.afterSerialization(model.serialize(doc)));
            }
        });
    }
    persistByAppendNewData(newDocs) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < newDocs.length; i++) {
                const doc = newDocs[i];
                yield this.appendData(this.afterSerialization(model.serialize(doc)));
            }
        });
    }
    treatSingleLine(line) {
        let treatedLine;
        try {
            treatedLine = model.deserialize(this.beforeDeserialization(line));
            if (this._model) {
                treatedLine = this._model.new(treatedLine);
            }
        }
        catch (e) {
            return {
                type: "corrupt",
                status: "remove",
                data: false,
            };
        }
        if (treatedLine._id) {
            if (treatedLine.$$deleted === true) {
                return {
                    type: "doc",
                    status: "remove",
                    data: { _id: treatedLine._id },
                };
            }
            else {
                return {
                    type: "doc",
                    status: "add",
                    data: treatedLine,
                };
            }
        }
        else if (treatedLine.$$indexCreated &&
            treatedLine.$$indexCreated.fieldName !== undefined) {
            return {
                type: "index",
                status: "add",
                data: {
                    fieldName: treatedLine.$$indexCreated.fieldName,
                    data: treatedLine.$$indexCreated,
                },
            };
        }
        else if (typeof treatedLine.$$indexRemoved === "string") {
            return {
                type: "index",
                status: "remove",
                data: { fieldName: treatedLine.$$indexRemoved },
            };
        }
        else {
            return {
                type: "corrupt",
                status: "remove",
                data: true,
            };
        }
    }
    /**
     * Load the database
     * 1) Create all indexes
     * 2) Insert all data
     * This means pulling data out of the data file or creating it if it doesn't exist
     */
    loadDatabase() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.db.q.pause();
            this.db.resetIndexes();
            const indexesEmitter = new PersistenceEvent();
            let corrupt = 0;
            let processed = 0;
            let err;
            indexesEmitter.on("readLine", (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                processed++;
                const treatedLine = this.treatSingleLine(line);
                if (treatedLine.type === "index") {
                    if (treatedLine.status === "add") {
                        this.db.indexes[treatedLine.data.fieldName] = new indexes_1.Index(treatedLine.data.data);
                    }
                    if (treatedLine.status === "remove") {
                        delete this.db.indexes[treatedLine.data.fieldName];
                    }
                }
                else if (!treatedLine.data) {
                    corrupt++;
                }
            }));
            yield this.readIndexes(indexesEmitter);
            const dataEmitter = new PersistenceEvent();
            dataEmitter.on("readLine", (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                processed++;
                const treatedLine = this.treatSingleLine(line);
                if (treatedLine.type === "doc") {
                    if (treatedLine.status === "add") {
                        try {
                            this.db.addToIndexes(treatedLine.data);
                        }
                        catch (e) {
                            // hacky way of dealing with updates
                            if (e.toString().indexOf(treatedLine.data._id) !== -1) {
                                this.db.removeFromIndexes(treatedLine.data);
                                this.db.addToIndexes(treatedLine.data);
                            }
                            else {
                                err = e;
                            }
                        }
                    }
                    if (treatedLine.status === "remove") {
                        this.db.removeFromIndexes(treatedLine.data);
                    }
                }
                else if (!treatedLine.data) {
                    corrupt++;
                }
            }));
            yield this.readData(dataEmitter);
            if (processed > 0 && corrupt / processed > this.corruptAlertThreshold) {
                throw new Error(`More than ${Math.floor(100 * this.corruptAlertThreshold)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start Datastore to prevent dataloss`);
            }
            else if (err) {
                throw err;
            }
            this.db.q.start();
            return true;
        });
    }
    init() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
    readIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < this._memoryIndexes.length; index++) {
                const line = this._memoryIndexes[index];
                event.emit("readLine", line);
            }
        });
    }
    readData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < this._memoryData.length; index++) {
                const line = this._memoryData[index];
                event.emit("readLine", line);
            }
        });
    }
    rewriteIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryIndexes = [];
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                this._memoryIndexes.push(data);
            }));
        });
    }
    rewriteData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryData = [];
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                this._memoryData.push(data);
            }));
        });
    }
    appendIndex(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryIndexes.push(data);
        });
    }
    appendData(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryData.push(data);
        });
    }
}
exports.Persistence = Persistence;
