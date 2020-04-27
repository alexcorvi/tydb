import { FS_Persistence_Adapter } from "./adapters/fs-adapter";
import { Database, DatabaseConfigurations } from "./database";
import * as fastify from "fastify";
import * as cors from "fastify-cors";
import * as fs from "fs";
import ow from "ow";
import * as path from "path";

interface ConfigFile extends DatabaseConfigurations<any> {
	fastify: {
		server: fastify.ServerOptions;
		listen: fastify.ListenOptions;
		cors?: any;
	};
}

let configFile = process.argv.find((x) => x.endsWith(".db.js"));
let configs: ConfigFile | null = null;
let db = new Database({ ref: "temp" });

{
	// path & argument
	if (!configFile) {
		console.error(
			`Error: Must be given a single argument, that is a file ending with ".db.js"`
		);
		process.exit(1);
	}
	configFile = path.resolve(configFile);
	if (!fs.existsSync(configFile)) {
		console.error(`Error: file "${configFile}" does not exist`);
		process.exit(1);
	}
}
{
	// file contents
	configs = require(configFile);
	if (!configs) {
		console.error(`Error: Configuration file does not export anything`);
		process.exit(1);
	} else {
		if (!configs.ref || typeof configs.ref !== "string") {
			console.error(
				`Error: "ref" in configuration file is required, and should be a string`
			);
			process.exit(1);
		}
		if (!configs.fastify) {
			console.error(`Error: "fastify" in configuration file is required`);
			process.exit(1);
		}
		if (!configs.fastify.listen) {
			console.error(
				`Error: "fastify.listen" in configuration file is required`
			);
			process.exit(1);
		}
		if (!configs.fastify.server) {
			console.error(
				`Error: "fastify.server" in configuration file is required`
			);
			process.exit(1);
		}

		if (!configs.persistence_adapter) {
			configs.persistence_adapter = FS_Persistence_Adapter;
		}

		db = new Database(configs);
	}
}

const server = fastify(configs.fastify.server);
if (configs.fastify.cors) {
	server.register(cors, configs.fastify.cors);
}
server.post("/insert", async (request, reply) => {
	let res;
	try {
		ow(request.body, ow.array.ofType(ow.object));
		res = await db.insert(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/read", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				filter: ow.optional.object,
				skip: ow.optional.number,
				limit: ow.optional.number,
				sort: ow.optional.object,
				project: ow.optional.object,
			})
		);
		res = await db.find(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/update", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				filter: ow.object,
				update: ow.object,
				multi: ow.optional.boolean,
			})
		);
		res = await db.update(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/upsert", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				filter: ow.object,
				update: ow.object,
				multi: ow.optional.boolean,
			})
		);
		res = await db.upsert(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/count", async (request, reply) => {
	let res;
	try {
		ow(request.body, ow.object);
		res = await db.count(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/delete", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				filter: ow.object,
				multi: ow.optional.boolean,
			})
		);
		res = await db.delete(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/removeIndex", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				fieldName: ow.string,
			})
		);
		res = await db.removeIndex(request.body.fieldName);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/createIndex", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				fieldName: ow.string,
				unique: ow.optional.boolean,
				sparse: ow.optional.boolean,
				expireAfterSeconds: ow.optional.number,
			})
		);
		res = await db.createIndex(request.body);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/reload", async (request, reply) => {
	let res;
	try {
		res = await db.reload();
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/compact", async (request, reply) => {
	let res;
	try {
		res = await db.compact();
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/forcefulUnlock", async (request, reply) => {
	let res;
	try {
		res = await db.forcefulUnlock();
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/stopAutoCompaction", async (request, reply) => {
	let res;
	try {
		res = db.stopAutoCompaction();
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});
server.post("/resetAutoCompaction", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				interval: ow.number,
			})
		);
		res = db.resetAutoCompaction(request.body.interval);
		reply.type("application/json").code(200);
	} catch (e) {
		reply.type("application/json").code(500);
		res = {
			code: e.code || 500,
			errorType: e.errorType || e.toString().replace(/(.*):.*/, "$1"),
			message: e.toString(),
		};
	}
	return res;
});

server.get("/", async (request, reply) => {
	reply.type("application/json").code(200);
	return { dinadb: "welcome", status: "ok", version: "0.5.3" };
});

server.listen(configs.fastify.listen, (err, address) => {
	if (err) throw err;
	server.log.info(`server listening on ${address}`);
});
