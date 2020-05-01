import { Database, DatabaseConfigurations } from "./database";
import fastify from "fastify";
import cors from "fastify-cors";
import * as fs from "fs";
import ow from "ow";
import * as path from "path";
import { register as tsNodeReg } from "ts-node";
if ((process as any)[Symbol.for("ts-node.register.instance")]) {
	// if we're already in ts-node do not attempt to register
} else {
	// only register if we're running directly on node
	tsNodeReg();
}

interface ConfigFile {
	databases: {
		[key: string]: DatabaseConfigurations<any>;
	};
	fastify: {
		server: fastify.ServerOptions;
		listen: fastify.ListenOptions;
		cors?: any;
	};
}

let configFile = process.argv.find((x) => x.endsWith(".tydb.ts"));
let configs: ConfigFile | null = null;

{
	// path & argument
	if (!configFile) {
		console.error(
			`Error: Must be given a single argument, that is a file ending with ".tydb.ts"`
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
		if (!configs.databases || typeof configs.databases !== "object") {
			console.error(
				`Error: "databases" in configuration file is required, and should be a string`
			);
			process.exit(1);
		}
		if (Object.keys(configs.databases).length === 0) {
			console.error(
				`Error: "databases" in configuration file must have key value property (or properties) that refer to databases`
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
	}
}

const databases: {
	[key: string]: Database<any>;
} = {};

Object.keys(configs.databases).forEach((namespace) => {
	if (!configs!.databases[namespace]) {
		console.error(
			`Error: namespace ${namespace} in configuration file does not have a "ref" property, "ref" property is required for all namespaces`
		);
		process.exit(1);
	}
	databases[namespace] = new Database(configs!.databases[namespace]);
});

const server = fastify(configs.fastify.server);
if (configs.fastify.cors) {
	server.register(cors, configs.fastify.cors);
}
server.post("/:namespace/insert", async (request, reply) => {
	let res;
	try {
		ow(request.body, ow.array.ofType(ow.object));
		res = await databases[request.params["namespace"]].insert(request.body);
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
server.post("/:namespace/read", async (request, reply) => {
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
		res = await databases[request.params["namespace"]].find(request.body);
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
server.post("/:namespace/update", async (request, reply) => {
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
		res = await databases[request.params["namespace"]].update(request.body);
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
server.post("/:namespace/upsert", async (request, reply) => {
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
		res = await databases[request.params["namespace"]].upsert(request.body);
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
server.post("/:namespace/count", async (request, reply) => {
	let res;
	try {
		ow(request.body, ow.object);
		res = await databases[request.params["namespace"]].count(request.body);
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
server.post("/:namespace/delete", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				filter: ow.object,
				multi: ow.optional.boolean,
			})
		);
		res = await databases[request.params["namespace"]].delete(request.body);
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
server.post("/:namespace/removeIndex", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				fieldName: ow.string,
			})
		);
		res = await databases[request.params["namespace"]].removeIndex(
			request.body.fieldName
		);
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
server.post("/:namespace/createIndex", async (request, reply) => {
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
		res = await databases[request.params["namespace"]].createIndex(
			request.body
		);
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
server.post("/:namespace/reload", async (request, reply) => {
	let res;
	try {
		res = await databases[request.params["namespace"]].reload();
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
server.post("/:namespace/compact", async (request, reply) => {
	let res;
	try {
		res = await databases[request.params["namespace"]].compact();
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
server.post("/:namespace/forcefulUnlock", async (request, reply) => {
	let res;
	try {
		res = await databases[request.params["namespace"]].forcefulUnlock();
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
server.post("/:namespace/stopAutoCompaction", async (request, reply) => {
	let res;
	try {
		res = databases[request.params["namespace"]].stopAutoCompaction();
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
server.post("/:namespace/resetAutoCompaction", async (request, reply) => {
	let res;
	try {
		ow(
			request.body,
			ow.object.exactShape({
				interval: ow.number,
			})
		);
		res = databases[request.params["namespace"]].resetAutoCompaction(
			request.body.interval
		);
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
	return { tydb: "welcome", status: "ok", version: "0.5.3" };
});

server.get("/:namespace", async (request, reply) => {
	reply.type("application/json").code(200);
	const namespace = request.params["namespace"];
	return {
		tydb: "welcome",
		dbNamespace: namespace,
		databaseFound: databases.hasOwnProperty(namespace),
		datafile: databases.hasOwnProperty(namespace)
			? path.resolve(configs!.databases[namespace].ref)
			: "",
		indexesFile: databases.hasOwnProperty(namespace)
			? path.resolve(configs!.databases[namespace].ref) + ".idx.db"
			: "",
	};
});

server.listen(configs.fastify.listen, (err, address) => {
	if (err) throw err;
	server.log.info(`Server listening on ${address}`);
	server.log.info(
		`Databases are: ${Object.keys(databases)
			.map((x) => address + "/" + x)
			.join(" ")}`
	);
});
