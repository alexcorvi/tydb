import Nedb from "../lib/datastore";
import async from "async";
import fs from "fs";
let db = new Nedb({ ref: "./workspace/openfds.db" });
db.loadDatabase();

let i = -1;
let N = 64;

let fds: any[] = [];

function multipleOpen(
	filename: string,
	N: number,
	callback: (err: any) => void
) {
	async.whilst(
		() => i < N,
		(cb) => {
			fs.open(filename, "r", (err, fd) => {
				i += 1;
				if (fd) {
					fds.push(fd);
				}
				return cb(err);
			});
		},
		callback
	);
}

async.waterfall([
	// Check that ulimit has been set to the correct value
	(cb: any) => {
		i = 0;
		fds = [];
		multipleOpen("./test_lac/openFdsTestFile", 2 * N + 1, (err) => {
			if (!err) {
				console.log(
					"No error occured while opening a file too many times"
				);
			}
			fds.forEach((fd) => {
				fs.closeSync(fd);
			});
			return cb();
		});
	},
	(cb: any) => {
		i = 0;
		fds = [];
		multipleOpen("./src/db/test_lac/openFdsTestFile2", N, (err) => {
			if (err) {
				console.log(
					`An unexpected error occured when opening file not too many times: ${err}`
				);
			}
			fds.forEach((fd) => {
				fs.closeSync(fd);
			});
			return cb();
		});
	},
	// Then actually test NeDB persistence
	() => {
		db.remove({}, { multi: true }).then((err) => {
			if (err) {
				console.log(err);
			}
			db.insert({ hello: "world" }).then((err) => {
				if (err) {
					console.log(err);
				}

				i = 0;
				async.whilst(
					() => i < 2 * N + 1,
					(cb) => {
						db.persistence
							.persistCachedDatabase()
							.then((err) => {
								i += 1;
								return cb();
							})
							.catch((e) => cb(e));
					},
					(err) => {
						if (err) {
							console.log(
								`Got unexpected error during one peresistence operation: ${err}`
							);
						}
					}
				);
			});
		});
	},
]);
