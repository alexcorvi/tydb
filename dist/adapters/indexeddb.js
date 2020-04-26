"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const persistence_1 = require("../core/persistence");
const idb = require("idb-keyval");
const databases = {};
function hash(input) {
    var hash = 0;
    for (let i = 0; i < input.length; i++) {
        let chr = input.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash.toString();
}
class IDB_Persistence_Adapter extends persistence_1.Persistence {
    init() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            databases["data"] = new idb.Store(this.ref, "data");
            databases["indexes"] = new idb.Store(this.ref, "indexes");
        });
    }
    readIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const keys = yield idb.keys(databases["indexes"]);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const line = yield idb.get(key, databases["indexes"]);
                event.emit("readLine", line);
            }
            event.emit("end", "");
        });
    }
    readData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const keys = yield idb.keys(databases["data"]);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const line = yield idb.get(key, databases["data"]);
                event.emit("readLine", line);
            }
            event.emit("end", "");
        });
    }
    rewriteIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const keys = yield idb.keys(databases["indexes"]);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                yield idb.del(key, databases["indexes"]);
            }
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield idb.set(hash(data), data, databases["indexes"]);
            }));
        });
    }
    rewriteData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const keys = yield idb.keys(databases["data"]);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                yield idb.del(key, databases["data"]);
            }
            event.on("writeLine", (data) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                yield idb.set(hash(data), data, databases["data"]);
            }));
        });
    }
    appendIndex(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield idb.set(hash(data), data, databases["indexes"]);
        });
    }
    appendData(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield idb.set(hash(data), data, databases["indexes"]);
        });
    }
}
exports.IDB_Persistence_Adapter = IDB_Persistence_Adapter;
