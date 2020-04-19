import { Persistence, PersistenceEvent } from "../core/persistence";
import { FSWatcher, watch } from "chokidar";
import * as fs from "fs";
import { appendFile, exists, readFile, rename, unlink, writeFile } from "fs";
import { lock, unlock } from "lockfile";
import Q from "p-queue";
import * as path from "path";
import * as readline from "readline";
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
				if (err) _storage.lock(filename);
				else resolve(true);
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

	createWriteableStream: function (
		filename: string
	): Promise<fs.WriteStream> {
		return new Promise((resolve, reject) => {
			const write = fs.createWriteStream(filename, { flags: "a" });
			write.on("open", () => {
				resolve(write);
			});
		});
	},

	writeSingleLine: function (stream: fs.WriteStream, line: string) {
		return new Promise((resolve, reject) => {
			stream.write(line, (err) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
	},

	endStream: function (stream: fs.WriteStream) {
		return new Promise((resolve) => {
			stream.end(() => {
				resolve();
			});
		});
	},

	readByLine: async function (
		filename: string,
		onLine: (line: string) => void,
		onClose: () => void
	) {
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

	beforeWriteFile: async function (filename: string) {
		const lockFilename = filename + ".lock";
		await _storage.lock(lockFilename);
		await _storage.flushToStorage({
			isDir: true,
			filename: path.dirname(filename),
		});
		if (await _storage.exists(filename)) {
			await _storage.flushToStorage(filename);
		}
	},

	afterWritingFile: async function (filename: string) {
		const tempFilename = filename + "~";
		const lockFilename = filename + ".lock";
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

const watchers: { [key: string]: FSWatcher[] } = {};

export class FS_Persistence_Adapter extends Persistence {
	indexesFilenameExtension = ".idx.db";

	readFileByLine(event: PersistenceEvent, filename: string) {
		return new Promise((resolve, reject) => {
			storage
				.mkdirp(path.dirname(filename))
				.then(() => storage.ensureDataFileIntegrity(filename))
				.then(() => {
					storage.readByLine(
						filename,
						async (line) => {
							await event.emit("readLine", line);
						},
						async () => {
							resolve();
						}
					);
				})
				.catch((e) => reject(e));
		});
	}

	writeFileByLine(event: PersistenceEvent, filename: string) {
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
					event.on("writeLine", async (line) => {
						if (line) {
							await storage.writeSingleLine(stream, `${line}\n`);
						}
					});
					event.on("end", async () => {
						await storage.endStream(stream);
						await storage.afterWritingFile(filename);
						this.startWatchingSingleFile(filename);
					});
					resolve();
				})
				.catch((e) => {
					reject(e);
				});
		});
	}

	async init() {
		this.startWatchingSingleFile(this.ref);
		this.startWatchingSingleFile(this.ref + ".idx.db");
	}

	startWatchingSingleFile(fileName: string) {
		if (!watchers[fileName]) {
			watchers[fileName] = [];
		}
		watchers[fileName].push(watch(fileName));
		watchers[fileName][watchers[fileName].length - 1].on(
			"change",
			async () => {
				await this.loadDatabase();
			}
		);
	}

	async stopWatchingSingleFile(fileName: string) {
		if (watchers[fileName]) {
			// we do everything in our power
			// to make sure that the watch
			// event will not be triggered
			for (let i = 0; i < watchers[fileName].length; i++) {
				watchers[fileName][i].unwatch(fileName);
				await watchers[fileName][i].close();
				watchers[fileName].splice(i, 1);
			}
			watchers[fileName] = [];
		}
	}
	async readIndexes(event: PersistenceEvent) {
		const filename = this.ref + this.indexesFilenameExtension;
		await this.readFileByLine(event, filename);
	}

	async readData(event: PersistenceEvent) {
		await this.readFileByLine(event, this.ref);
	}

	async writeIndexes(event: PersistenceEvent) {
		const filename = this.ref + this.indexesFilenameExtension;
		await this.stopWatchingSingleFile(filename);
		await this.writeFileByLine(event, filename);
	}

	async writeData(event: PersistenceEvent) {
		await this.stopWatchingSingleFile(this.ref);
		await this.writeFileByLine(event, this.ref);
	}

	async appendIndex(data: string) {
		await this.stopWatchingSingleFile(
			this.ref + this.indexesFilenameExtension
		);
		await storage.appendFile(
			this.ref + this.indexesFilenameExtension,
			`${data}\n`,
			"utf8"
		);
		this.startWatchingSingleFile(this.ref + this.indexesFilenameExtension);
	}

	async appendData(data: string) {
		await this.stopWatchingSingleFile(this.ref);
		await storage.appendFile(this.ref, `${data}\n`, "utf8");
		this.startWatchingSingleFile(this.ref);
	}
}
