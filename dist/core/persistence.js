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
const customUtils = require("./customUtils");
const indexes_1 = require("./indexes");
const model = require("./model");
const storage_1 = require("./storage");
const path = require("path");
/**
 * Create a new Persistence object for database options.db
 */
class Persistence {
    constructor(options) {
        this.filename = "";
        this.corruptAlertThreshold = 0.1;
        this.afterSerialization = (s) => s;
        this.beforeDeserialization = (s) => s;
        this.db = options.db;
        this.filename = this.db.filename;
        this.corruptAlertThreshold =
            options.corruptAlertThreshold !== undefined
                ? options.corruptAlertThreshold
                : 0.1;
        if (this.filename &&
            this.filename.charAt(this.filename.length - 1) === "~") {
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
        for (let i = 1; i < 30; i += 1) {
            for (let j = 0; j < 10; j += 1) {
                let randomString = customUtils.randomString(i);
                if (this.beforeDeserialization(this.afterSerialization(randomString)) !== randomString) {
                    throw new Error("beforeDeserialization is not the reverse of afterSerialization, cautiously refusing to start data store to prevent dataloss");
                }
            }
        }
    }
    /**
     * Persist cached database
     * This serves as a compaction function since the cache always contains only the actual of documents in the collection
     * while the data file is append-only so it may grow larger
     */
    persistCachedDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            let toPersist = "";
            this.db.getAllData().forEach((doc) => {
                toPersist += `${this.afterSerialization(model.serialize(doc))}\n`;
            });
            Object.keys(this.db.indexes).forEach((fieldName) => {
                if (fieldName != "_id") {
                    // The special _id index is managed by datastore.js, the others need to be persisted
                    toPersist += `${this.afterSerialization(model.serialize({
                        $$indexCreated: {
                            fieldName,
                            unique: this.db.indexes[fieldName].unique,
                            sparse: this.db.indexes[fieldName].sparse,
                        },
                    }))}\n`;
                }
            });
            yield storage_1.storage.crashSafeWriteFile(this.filename, toPersist);
        });
    }
    /**
     * Queue a rewrite of the datafile
     */
    compactDatafile() {
        return __awaiter(this, void 0, void 0, function* () {
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
    /**
     * Persist new state for the given newDocs (can be insertion, update or removal)
     * Use an append-only format
     */
    persistNewState(newDocs) {
        return __awaiter(this, void 0, void 0, function* () {
            let toPersist = "";
            newDocs.forEach((doc) => {
                toPersist += `${this.afterSerialization(model.serialize(doc))}\n`;
            });
            if (toPersist.length === 0) {
                return;
            }
            yield storage_1.storage.appendFile(this.filename, toPersist, "utf8");
        });
    }
    /**
     * From a database's raw data, return the corresponding
     * machine understandable collection
     */
    treatRawData(rawData) {
        const data = rawData.split("\n"); // Last line of every data file is usually blank so not really corrupt
        const dataById = {};
        const tData = [];
        const indexes = {};
        let corruptItems = -1;
        for (let i = 0; i < data.length; i += 1) {
            try {
                let doc = model.deserialize(this.beforeDeserialization(data[i]));
                if (doc._id) {
                    if (doc.$$deleted === true) {
                        delete dataById[doc._id];
                    }
                    else {
                        dataById[doc._id] = doc;
                    }
                }
                else if (doc.$$indexCreated &&
                    doc.$$indexCreated.fieldName !== undefined) {
                    indexes[doc.$$indexCreated.fieldName] = doc.$$indexCreated;
                }
                else if (typeof doc.$$indexRemoved === "string") {
                    delete indexes[doc.$$indexRemoved];
                }
            }
            catch (e) {
                corruptItems += 1;
            }
        }
        // A bit lenient on corruption
        if (data.length > 0 &&
            corruptItems / data.length > this.corruptAlertThreshold) {
            throw new Error(`More than ${Math.floor(100 * this.corruptAlertThreshold)}% of the data file is corrupt, the wrong beforeDeserialization hook may be used. Cautiously refusing to start Datastore to prevent dataloss`);
        }
        Object.keys(dataById).forEach((k) => {
            tData.push(dataById[k]);
        });
        return { data: tData, indexes };
    }
    /**
     * Load the database
     * 1) Create all indexes
     * 2) Insert all data
     * 3) Compact the database
     * This means pulling data out of the data file or creating it if it doesn't exist
     * Also, all data is persisted right away, which has the effect of compacting the database file
     * This operation is very quick at startup for a big collection (60ms for ~10k docs)
     */
    loadDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            this.db.q.pause();
            this.db.resetIndexes();
            yield storage_1.storage.mkdirp(path.dirname(this.filename));
            yield storage_1.storage.ensureDataFileIntegrity(this.filename);
            const rawData = yield storage_1.storage.readFile(this.filename, "utf8");
            let treatedData = this.treatRawData(rawData);
            // Recreate all indexes in the datafile
            Object.keys(treatedData.indexes).forEach((key) => {
                let index = new indexes_1.Index(treatedData.indexes[key]);
                this.db.indexes[key] = index;
            });
            // Fill cached database (i.e. all indexes) with data
            try {
                this.db.resetIndexes(treatedData.data);
            }
            catch (e) {
                this.db.resetIndexes(); // Rollback any index which didn't fail
                throw e;
            }
            yield this.db.persistence.persistCachedDatabase();
            this.db.q.start();
            return;
        });
    }
}
exports.Persistence = Persistence;
