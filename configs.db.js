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
	 * you can define multiple database
	 * to be exposed over the network
	 */
	databases: {
		// "mydb" will be used as a namespace for
		// the database connection URL
		// (e.g. nedb://http://localhost:3000/mydb)
		mydb: {
			// "workspace/external" is the file
			// path that the database
			// data will be saved to
			ref: "workspace/external",
			// a model that your documents
			// will confirm to
			model: MyModel,
			afterSerialization: (string) => {
				// if you want to do any
				// special encoding/encryption
				return string;
			},
			beforeDeserialization: (string) => {
				// if you want to do any
				// special decoding/decryption
				return string;
			},
			// no tolerance for corruption
			corruptAlertThreshold: 0,
			// add createdAt & updatedAt fields
			timestampData: true,
			// use a persistence adapter
			// (defaults to file system)
			persistence_adapter: FS_Persistence_Adapter,
			// set an interval for auto compaction
			// defaults to 0 = no auto compaction
			autoCompaction: 0,
		},
	},

	/**
	 * fastify server configurations
	 */
	fastify: {
		// listening options
		// more: https://www.fastify.io/docs/latest/Server/#listen
		listen: {
			port: 3000,
			host: "127.0.0.1",
		},
		// server options
		// more: https://www.fastify.io/docs/latest/Server/
		server: {
			logger: false,
		},
		// set this to undefined to disable cors
		// more: https://github.com/fastify/fastify-cors
		cors: {},
	},
};
