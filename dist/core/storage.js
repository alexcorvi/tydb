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
const fs_1 = require("fs");
const fs = require("fs");
const p_queue_1 = require("p-queue");
const path = require("path");
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
    appendFile: util_1.promisify(fs_1.appendFile),
    exists: util_1.promisify(fs_1.exists),
    readFile: util_1.promisify(fs_1.readFile),
    rename: util_1.promisify(fs_1.rename),
    unlink: util_1.promisify(fs_1.unlink),
    writeFile: util_1.promisify(fs_1.writeFile),
    mkdirp: function (targetDir) {
        return __awaiter(this, void 0, void 0, function* () {
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
        return __awaiter(this, void 0, void 0, function* () {
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
    /**
     * Fully write or rewrite the datafile, immune to crashes during the write operation (data will not be lost)
     */
    crashSafeWriteFile: function (filename, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var tempFilename = filename + "~";
            yield _storage.flushToStorage({
                isDir: true,
                filename: path.dirname(filename),
            });
            if (yield _storage.exists(filename)) {
                yield _storage.flushToStorage(filename);
            }
            yield _storage.writeFile(tempFilename, data);
            yield _storage.flushToStorage(tempFilename);
            yield _storage.rename(tempFilename, filename);
            yield _storage.flushToStorage({
                isDir: true,
                filename: path.dirname(filename),
            });
        });
    },
    /**
     * Ensure the data file contains all the data, even if there was a crash during a full file write
     */
    ensureDataFileIntegrity: function (filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFilename = filename + "~";
            // write was successful
            if (yield _storage.exists(filename)) {
                return;
            }
            // new DB
            else if (!(yield _storage.exists(tempFilename))) {
                return yield _storage.writeFile(filename, "", "utf8");
            }
            // write failed, use old version
            else {
                return yield _storage.rename(tempFilename, filename);
            }
        });
    },
};
const storage = {};
exports.storage = storage;
Object.keys(_storage).forEach((key) => {
    storage[key] = (...args) => sq.add(() => _storage[key](...args));
});
