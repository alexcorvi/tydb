"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const persistence_1 = require("../core/persistence");
const fs = require("fs");
const fs_1 = require("fs");
const lockfile_1 = require("lockfile");
const p_queue_1 = require("p-queue");
const path = require("path");
const readline = require("readline");
const util_1 = require("util");
/**
 * To avoid bugs and corruption we created a queue for all file system related methods.
 * All calls to the storage must go through this queue.
 * N.B. also, to avoid deadlocks, make sure that all calls to the {storage} object are made to {_storage}
 */
const sq = new p_queue_1.default({
    concurrency: 1,
    autoStart: true,
});
const _storage = {
    lock: function (filename) {
        return new Promise((resolve) => {
            lockfile_1.lock(filename, { retries: 5, retryWait: 1 }, function (err) {
                if (err)
                    _storage.lock(filename);
                else
                    resolve(true);
            });
        });
    },
    unlock: function (filename) {
        return new Promise((resolve) => {
            lockfile_1.unlock(filename, () => resolve());
        });
    },
    appendFile: util_1.promisify(fs_1.appendFile),
    exists: util_1.promisify(fs_1.exists),
    readFile: util_1.promisify(fs_1.readFile),
    rename: util_1.promisify(fs_1.rename),
    unlink: util_1.promisify(fs_1.unlink),
    writeFile: util_1.promisify(fs_1.writeFile),
    mkdirp: function (targetDir) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const sep = path.sep;
            const initDir = path.isAbsolute(targetDir) ? sep : "";
            const baseDir = ".";
            return targetDir.split(sep).reduce((parentDir, childDir) => {
                const curDir = path.resolve(baseDir, parentDir, childDir);
                try {
                    fs.mkdirSync(curDir);
                }
                catch (err) {
                    if (err.code === "EEXIST") {
                        // curDir already exists!
                        return curDir;
                    }
                    // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
                    if (err.code === "ENOENT") {
                        // Throw the original parentDir error on curDir `ENOENT` failure.
                        throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
                    }
                    const caughtErr = ["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
                    if (!caughtErr ||
                        (caughtErr && curDir === path.resolve(targetDir))) {
                        throw err; // Throw if it's just the last created dir.
                    }
                }
                return curDir;
            }, initDir);
        });
    },
    ensureFileDoesntExist: function (file) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const fileExists = yield _storage.exists(file);
            if (fileExists) {
                yield _storage.unlink(file);
            }
        });
    },
    /**
     * Flush data in OS buffer to storage if corresponding option is set
     * If options is a string, it is assumed that the flush of the file (not dir) called options was requested
     */
    flushToStorage: function (options) {
        return new Promise((resolve, reject) => {
            let filename, flags;
            if (typeof options === "string") {
                filename = options;
                flags = "r+";
            }
            else {
                filename = options.filename;
                flags = options.isDir ? "r" : "r+";
            }
            // Windows can't fsync (FlushFileBuffers) directories. We can live with this as it cannot cause 100% dataloss
            // except in the very rare event of the first time database is loaded and a crash happens
            if (flags === "r" && process.platform === "win32") {
                return resolve();
            }
            fs.open(filename, flags, function (err, fd) {
                if (err) {
                    return reject(err);
                }
                fs.fsync(fd, function (errFS) {
                    fs.close(fd, function (errC) {
                        if (errFS || errC) {
                            var e = new Error("Failed to flush to storage");
                            return reject(Object.assign(e, {
                                errorOnFsync: errFS,
                                errorOnClose: errC,
                            }));
                        }
                        else {
                            return resolve();
                        }
                    });
                });
            });
        });
    },
    createWriteableStream: function (filename) {
        return new Promise((resolve, reject) => {
            const write = fs.createWriteStream(filename, { flags: "a" });
            write.on("open", () => {
                resolve(write);
            });
        });
    },
    writeSingleLine: function (stream, line) {
        return new Promise((resolve, reject) => {
            stream.write(line, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    },
    endStream: function (stream) {
        return new Promise((resolve) => {
            stream.end(() => {
                resolve();
            });
        });
    },
    readByLine: function (filename, onLine, onClose) {
        const input = fs.createReadStream(filename);
        var rl = readline.createInterface({
            input: input,
            terminal: false,
        });
        rl.on("line", function (line) {
            onLine(line);
        });
        rl.on("close", function () {
            onClose();
        });
    },
    beforeWriteFile: function (filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const lockFilename = filename + ".lock";
            yield _storage.lock(lockFilename);
            yield _storage.flushToStorage({
                isDir: true,
                filename: path.dirname(filename),
            });
            if (yield _storage.exists(filename)) {
                yield _storage.flushToStorage(filename);
            }
        });
    },
    afterWritingFile: function (filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const tempFilename = filename + "~";
            const lockFilename = filename + ".lock";
            yield _storage.flushToStorage(tempFilename);
            yield _storage.rename(tempFilename, filename);
            yield _storage.flushToStorage({
                isDir: true,
                filename: path.dirname(filename),
            });
            yield _storage.unlock(lockFilename);
        });
    },
    /**
     * Ensure the data file contains all the data, even if there was a crash during a full file write
     */
    ensureDataFileIntegrity: function (filename) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const tempFilename = filename + "~";
            const lockFilename = filename + ".lock";
            yield _storage.lock(lockFilename);
            // write was successful
            if (yield _storage.exists(filename)) {
                return yield _storage.unlock(lockFilename);
            }
            // new DB
            else if (!(yield _storage.exists(tempFilename))) {
                yield _storage.writeFile(filename, "", "utf8");
            }
            // write failed, use old version
            else {
                yield _storage.rename(tempFilename, filename);
            }
            yield _storage.unlock(lockFilename);
        });
    },
};
const storage = {};
exports.storage = storage;
Object.keys(_storage).forEach((key) => {
    storage[key] = (...args) => sq.add(() => _storage[key](...args));
});
class FS_Persistence_Adapter extends persistence_1.Persistence {
    constructor() {
        super(...arguments);
        this.indexesFilenameExtension = ".idx.db";
    }
    readFileByLine(event, filename) {
        return new Promise((resolve, reject) => {
            storage
                .mkdirp(path.dirname(filename))
                .then(() => storage.ensureDataFileIntegrity(filename))
                .then(() => {
                storage.readByLine(filename, (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield event.emit("readLine", line);
                }), () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    resolve();
                }));
            })
                .catch((e) => reject(e));
        });
    }
    writeFileByLine(event, filename) {
        return new Promise((resolve, reject) => {
            storage
                .beforeWriteFile(filename)
                .then(() => {
                return storage.writeFile(filename + "~", "", "utf8");
            })
                .then(() => {
                return storage.createWriteableStream(filename + "~");
            })
                .then((stream) => {
                event.on("writeLine", (line) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    if (line) {
                        yield storage.writeSingleLine(stream, `${line}\n`);
                    }
                }));
                event.on("end", () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    yield storage.endStream(stream);
                    yield storage.afterWritingFile(filename);
                }));
                resolve();
            })
                .catch((e) => {
                reject(e);
            });
        });
    }
    init() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () { });
    }
    readIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const filename = this.ref + this.indexesFilenameExtension;
            yield this.readFileByLine(event, filename);
        });
    }
    readData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.readFileByLine(event, this.ref);
        });
    }
    rewriteIndexes(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const filename = this.ref + this.indexesFilenameExtension;
            yield this.writeFileByLine(event, filename);
        });
    }
    rewriteData(event) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.writeFileByLine(event, this.ref);
        });
    }
    appendIndex(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield storage.appendFile(this.ref + this.indexesFilenameExtension, `${data}\n`, "utf8");
        });
    }
    appendData(data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield storage.appendFile(this.ref, `${data}\n`, "utf8");
        });
    }
}
exports.FS_Persistence_Adapter = FS_Persistence_Adapter;
