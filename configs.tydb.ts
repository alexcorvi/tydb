import {
	BaseModel,
	FS_Persistence_Adapter,
	DatabaseConfigurations,
} from "./src";

class MyModel extends BaseModel {
	name: string = "";
	male: boolean = false;

	get female() {
		return !this.male;
	}
}

/**
 * you can define multiple database
 * to be exposed over the network
 */
export const databases: { [key: string]: DatabaseConfigurations<any> } = {
	// "mydb" will be used as a namespace for
	// the database connection URL
	// (e.g. tydb://http://localhost:3000/mydb)
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
};

/**
 * fastify server configurations
 */
export const fastify = {
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
};
