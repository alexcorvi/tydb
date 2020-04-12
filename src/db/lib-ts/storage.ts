import {
	appendFile,
	exists,
	readFile,
	rename,
	unlink,
	writeFile
	} from "fs";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const storage = {
	appendFile: promisify(appendFile),
	exists: promisify(exists),
	readFile: promisify(readFile),
	rename: promisify(rename),
	unlink: promisify(unlink),
	writeFile: promisify(writeFile),
	mkdirp: function (targetDir: string) {
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
		const fileExists = await storage.exists(file);
		if (fileExists) {
			await storage.unlink(file);
		}
	},

	/**
	 * Flush data in OS buffer to storage if corresponding option is set
	 * @param {String} options.filename
	 * @param {Boolean} options.isDir Optional, defaults to false
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
	 * @param {String} filename
	 * @param {String} data
	 * @param {Function} cb Optional callback, signature: err
	 */

	crashSafeWriteFile: async function (filename: string, data: string) {
		var tempFilename = filename + "~";

		await storage.flushToStorage({
			isDir: true,
			filename: path.dirname(filename),
		});
		if (await storage.exists(filename)) {
			await storage.flushToStorage(filename);
		}
		await storage.writeFile(tempFilename, data);
		await storage.flushToStorage(tempFilename);
		await storage.rename(tempFilename, filename);
		await storage.flushToStorage({
			isDir: true,
			filename: path.dirname(filename),
		});
	},

	/**
	 * Ensure the data file contains all the data, even if there was a crash during a full file write
	 * @param {String} filename
	 * @param {Function} callback signature: err
	 */
	ensureDataFileIntegrity: async function (filename: string) {
		const tempFilename = filename + "~";
		// write was successful
		if (await storage.exists(filename)) {
			return;
		}
		// new DB
		else if (!(await storage.exists(tempFilename))) {
			return await storage.writeFile(filename, "", "utf8");
		}
		// write failed, use old version
		else {
			return await storage.rename(tempFilename, filename);
		}
	},
};

export default storage;
