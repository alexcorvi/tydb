import { Persistence } from "../core/persistence";
import {
	appendFile,
	exists,
	readFile,
	rename,
	unlink,
	writeFile
	} from "fs";
import * as fs from "fs";
import { lock, unlock } from "lockfile";
import Q from "p-queue";
import * as path from "path";
import { promisify } from "util";

/**
 * To avoid bugs and corruption we created a queue for all file system related methods.
 * All calls to the storage must go through this queue.
 * N.B. also, to avoid deadlocks, make sure that all calls to the {storage} object are made to {_storage}
 */

const sq = new Q({
	concurrency: 1,
	autoStart: true,
});

const _storage = {
	lock: function (filename: string) {
		return new Promise((resolve) => {
			lock(filename, { retries: 5, retryWait: 1 }, function (err) {
				if (err) {
					_storage.lock(filename).then(() => {
						resolve(true);
					});
				}
				resolve(true);
			});
		});
	},
	unlock: function (filename: string) {
		return new Promise((resolve) => {
			unlock(filename, () => resolve());
		});
	},
	appendFile: promisify(appendFile),
	exists: promisify(exists),
	readFile: promisify(readFile),
	rename: promisify(rename),
	unlink: promisify(unlink),
	writeFile: promisify(writeFile),
	mkdirp: async function (targetDir: string) {
		const sep = path.sep;
		const initDir = path.isAbsolute(targetDir) ? sep : "";
		const baseDir = ".";

		return targetDir.split(sep).reduce((parentDir, childDir) => {
			const curDir = path.resolve(baseDir, parentDir, childDir);
			try {
				fs.mkdirSync(curDir);
			} catch (err) {
				if (err.code === "EEXIST") {
					// curDir already exists!
					return curDir;
				}

				// To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
				if (err.code === "ENOENT") {
					// Throw the original parentDir error on curDir `ENOENT` failure.
					throw new Error(
						`EACCES: permission denied, mkdir '${parentDir}'`
					);
				}

				const caughtErr =
					["EACCES", "EPERM", "EISDIR"].indexOf(err.code) > -1;
				if (
					!caughtErr ||
					(caughtErr && curDir === path.resolve(targetDir))
				) {
					throw err; // Throw if it's just the last created dir.
				}
			}

			return curDir;
		}, initDir);
	},

	ensureFileDoesntExist: async function (file: string) {
		const fileExists = await _storage.exists(file);
		if (fileExists) {
			await _storage.unlink(file);
		}
	},

	/**
	 * Flush data in OS buffer to storage if corresponding option is set
	 * If options is a string, it is assumed that the flush of the file (not dir) called options was requested
	 */
	flushToStorage: function (
		options: string | { filename: string; isDir: boolean }
	) {
		return new Promise((resolve, reject) => {
			let filename, flags;
			if (typeof options === "string") {
				filename = options;
				flags = "r+";
			} else {
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
							return reject(
								Object.assign(e, {
									errorOnFsync: errFS,
									errorOnClose: errC,
								})
							);
						} else {
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

	crashSafeWriteFile: async function (filename: string, data: string) {
		const tempFilename = filename + "~";
		const lockFilename = filename + ".lock";
		await _storage.lock(lockFilename);
		await _storage.flushToStorage({
			isDir: true,
			filename: path.dirname(filename),
		});
		if (await _storage.exists(filename)) {
			await _storage.flushToStorage(filename);
		}
		await _storage.writeFile(tempFilename, data);
		await _storage.flushToStorage(tempFilename);
		await _storage.rename(tempFilename, filename);
		await _storage.flushToStorage({
			isDir: true,
			filename: path.dirname(filename),
		});
		await _storage.unlock(lockFilename);
	},

	/**
	 * Ensure the data file contains all the data, even if there was a crash during a full file write
	 */
	ensureDataFileIntegrity: async function (filename: string) {
		const tempFilename = filename + "~";
		const lockFilename = filename + ".lock";
		await _storage.lock(lockFilename);
		// write was successful
		if (await _storage.exists(filename)) {
			return await _storage.unlock(lockFilename);
		}
		// new DB
		else if (!(await _storage.exists(tempFilename))) {
			await _storage.writeFile(filename, "", "utf8");
		}
		// write failed, use old version
		else {
			await _storage.rename(tempFilename, filename);
		}
		await _storage.unlock(lockFilename);
	},
};

const storage: typeof _storage = {} as typeof _storage;

interface KO {
	[key: string]: any;
}
Object.keys(_storage).forEach((key) => {
	(storage as KO)[key] = (...args: any) =>
		sq.add(() => (_storage as KO)[key](...args));
});

export { storage };

export class FS_Persistence_Adapter extends Persistence {
	async init() {
		// TODO: watcher for files, once you do it: remove load database from operations
		// TODO: implement locking mechanism
		// TODO: stream read & write
	}

	async read() {
		await storage.mkdirp(path.dirname(this.ref));
		await storage.ensureDataFileIntegrity(this.ref);
		return await storage.readFile(this.ref, "utf8");
	}

	async write(data: string) {
		await storage.crashSafeWriteFile(this.ref, data);
	}

	async append(data: string) {
		await storage.appendFile(this.ref, data, "utf8");
	}
}
