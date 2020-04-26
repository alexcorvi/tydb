"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const path_1 = require("path");
const stream_1 = require("stream");
const util_1 = require("util");
const zlib_1 = require("zlib");
const pipe = util_1.promisify(stream_1.pipeline);
function tryInput(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        if (yield util_1.promisify(fs_1.exists)(path)) {
            return path;
        }
        else if (yield util_1.promisify(fs_1.exists)(path_1.resolve(path))) {
            return path;
        }
        else {
            throw new Error(`File ${path} does not exist`);
        }
    });
}
function tryOutput(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        let dir1 = path_1.dirname(path);
        let dir2 = path_1.dirname(path_1.resolve(path));
        if (yield util_1.promisify(fs_1.exists)(dir1)) {
            return path_1.resolve(dir1, path_1.basename(path));
        }
        else if (yield util_1.promisify(fs_1.exists)(path_1.resolve(dir2))) {
            return path_1.resolve(dir2, path_1.basename(path));
        }
        else {
            throw new Error(`Directory ${dir1} does not exist`);
        }
    });
}
function tryFiles(input, output) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return {
            input: yield tryInput(input),
            output: yield tryOutput(output),
        };
    });
}
function gzip(i, o) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { input, output } = yield tryFiles(i, o);
        const gzip = zlib_1.createGzip();
        const source = fs_1.createReadStream(input);
        const destination = fs_1.createWriteStream(output);
        yield pipe(source, gzip, destination);
    });
}
exports.gzip = gzip;
function unzip(i, o) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const { input, output } = yield tryFiles(i, o);
        const unzip = zlib_1.createUnzip();
        const source = fs_1.createReadStream(input);
        const destination = fs_1.createWriteStream(output);
        yield pipe(source, unzip, destination);
    });
}
exports.unzip = unzip;
