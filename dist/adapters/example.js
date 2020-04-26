"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const persistence_1 = require("../core/persistence");
/**
 * This file serves solely as the simplest example of how to write adapters
 * follow up with the comments for more
 */
class Memory_Persistence_Adapter extends persistence_1.Persistence {
    constructor() {
        super(...arguments);
        /**
         * You will need two separate storages, e.g. arrays, files, hash maps ... etc
         * one for the documents, and the other for the indexes
         */
        this._memoryIndexes = [];
        this._memoryData = [];
    }
    /**
     * This method will be executed once the database is created,
     * before initialization
     */
    init() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
    /**
     * Reading: two methods, one for indexes and the other for documents
     * each read method should utilize the event parameter,
     * and once a line becomes available it should "emit" it like the examples below
     */
    readIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < this._memoryIndexes.length; index++) {
                const line = this._memoryIndexes[index];
                event.emit("readLine", line);
            }
            event.emit("end", "");
        });
    }
    readData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < this._memoryData.length; index++) {
                const line = this._memoryData[index];
                event.emit("readLine", line);
            }
            event.emit("end", "");
        });
    }
    /**
     * Writing: two methods, one for indexes and the other for documents
     * each read method should utilize the event parameter,
     * and a callback should be provided for when the line is received
     * also a callback should be provided for the end of the database is reached
     * the on.end callback would be utilized for example for closing a database, a connection, a file ...etc
     */
    rewriteIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryIndexes = [];
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                this._memoryIndexes.push(data);
            }));
            event.on("end", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                // code to be executed once we're
                // finished with the last line of the database
            }));
        });
    }
    rewriteData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._memoryData = [];
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                this._memoryData.push(data);
            }));
            event.on("end", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                // code to be executed once we're
                // finished with the last line of the database
            }));
        });
    }
    /**
     * Appending: two methods, one for indexes and the other for documents
     * for quick appending to the persistence layer, like pushing onto an array, appending to a file,
     * adding a record to a hashmap ... etc
     */
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
/**
 * For more elaborated examples, checkout the other adapter files
 */
