import { Datastore } from "../../../src/core/datastore";
import * as fs from "fs";
import { promisify } from "util";

let db = new Datastore({ ref: "./workspace/openfds.db" });
db.loadDatabase();

let N = 64;

async function multipleOpen(filename: string, N: number) {
	let fds: number[] = [];
	let i = 0;
	while (i < N) {
		const fd = await promisify(fs.open)(filename, "r");
		i++;
		if (fd) {
			fds.push(fd);
		}
	}
	fds.forEach((fd) => {
		fs.closeSync(fd);
	});
	fds = [];
}

async function persist() {
	let i = 0;
	while (i < 2 * N + 1) {
		await db.persistence.persistCachedDatabase();
		i++;
	}
}

async function test() {
	await multipleOpen("./test/core/test_lac/openFdsTestFile", 2 * N + 1);
	await multipleOpen("./test/core/test_lac/openFdsTestFile2", N);
	await db.remove({}, { multi: true });
	await db.insert({ hello: "world" });
	await persist();
}

test();
