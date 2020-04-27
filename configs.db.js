const { BaseModel, FS_Persistence_Adapter } = require("./dist/index");

class MyModel extends BaseModel {
	constructor() {
		super();
		this.name = "";
		this.age = 9;
		this.male = false;
		this.arr = [];
	}

	isFemale() {
		return !this.male;
	}

	get female() {
		return !this.male;
	}
}

module.exports = {
	/**
	 * Database configurations
	 */
	ref: "workspace/external",
	model: MyModel,
	afterSerialization: (string) => {
		// if you want to do any special encoding/encryption
		return string;
	},
	beforeDeserialization: (string) => {
		// if you want to do any special decoding/decryption
		return string;
	},
	// no tolerance for corruption
	corruptAlertThreshold: 0,
	// add createdAt & updatedAt fields
	timestampData: true,
	// use a persistence adapter (defaults to file system)
	persistence_adapter: FS_Persistence_Adapter,
	// set an interval for auto compaction
	// defaults to 0 = no auto compaction
	autoCompaction: 0,

	/**
	 * fastify server configurations
	 */

	fastify: {
		// listening options: https://www.fastify.io/docs/latest/Server/#listen
		listen: {
			port: 3000,
			host: "127.0.0.1",
		},
		// server options: https://www.fastify.io/docs/latest/Server/
		server: {
			disableRequestLogging: true,
		},
		// more options: https://github.com/fastify/fastify-cors
		// set this to undefined to disable cors
		cors: {},
	},
};
