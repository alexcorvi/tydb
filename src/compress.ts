import { createReadStream, createWriteStream, exists } from "fs";
import { basename, dirname, resolve } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import { createGzip, createUnzip } from "zlib";

const pipe = promisify(pipeline);

async function tryInput(path: string) {
	if (await promisify(exists)(path)) {
		return path;
	} else if (await promisify(exists)(resolve(path))) {
		return path;
	} else {
		throw new Error(`File ${path} does not exist`);
	}
}

async function tryOutput(path: string) {
	let dir1 = dirname(path);
	let dir2 = dirname(resolve(path));
	if (await promisify(exists)(dir1)) {
		return resolve(dir1, basename(path));
	} else if (await promisify(exists)(resolve(dir2))) {
		return resolve(dir2, basename(path));
	} else {
		throw new Error(`Directory ${dir1} does not exist`);
	}
}

async function tryFiles(input: string, output: string) {
	return {
		input: await tryInput(input),
		output: await tryOutput(output),
	};
}

export async function gzip(i: string, o: string) {
	const { input, output } = await tryFiles(i, o);
	const gzip = createGzip();
	const source = createReadStream(input);
	const destination = createWriteStream(output);
	await pipe(source, gzip, destination);
}

export async function unzip(i: string, o: string) {
	const { input, output } = await tryFiles(i, o);
	const unzip = createUnzip();
	const source = createReadStream(input);
	const destination = createWriteStream(output);
	await pipe(source, unzip, destination);
}
