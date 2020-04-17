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
const compress = require("./compress");
const operations_1 = require("./operations");
const _core_1 = require("@core");
const path = require("path");
class Database extends operations_1.Operations {
    constructor(options) {
        if (typeof options === "string") {
            options = {
                ref: options,
            };
        }
        const db = new _core_1.Datastore(Object.assign(options, { timestampData: true }));
        super(db);
        this._database = db;
        this.name = options.ref;
        this.filePath = path.resolve(this.name);
        if (options.autoCompaction === undefined)
            options.autoCompaction = 0;
        if (options.autoCompaction > 0) {
            this._database.persistence.setAutocompactionInterval(options.autoCompaction);
        }
    }
    compact() {
        this._database.persistence.compactDatafile();
    }
    stopAutoCompaction() {
        this._database.persistence.stopAutocompaction();
    }
    resetAutoCompaction(interval) {
        this._database.persistence.setAutocompactionInterval(interval);
    }
    backup(path) {
        return __awaiter(this, void 0, void 0, function* () {
            yield compress.gzip(this.filePath, path);
        });
    }
    restore(path) {
        return __awaiter(this, void 0, void 0, function* () {
            yield compress.unzip(path, this.filePath);
        });
    }
}
exports.Database = Database;
