const Benchmark = require("benchmark");
const lib = require("../dist/index");
const suite = new Benchmark.Suite();

const memoryDB = new lib.Database({ ref: "ref", model: lib.BaseModel });
const persistentDB = new lib.Database({
	ref: "workspace/benchmark",
	model: lib.BaseModel,
	persistence_adapter: lib.FS_Persistence_Adapter,
});

let id = "";

suite
	.add("in memory | Creating", {
		defer: true,
		fn: async function (deferred) {
			const res = await memoryDB.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("in memory | Updating", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.update({
				filter: { _id: id },
				update: { name: "alex" },
			});
			deferred.resolve();
		},
	})
	.add("in memory | Reading", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("in memory | Deleting", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.delete({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("persistent | Creating", {
		defer: true,
		fn: async function (deferred) {
			const res = await persistentDB.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("persistent | Updating", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.update({
				filter: { _id: id },
				update: { name: "alex" },
			});
			deferred.resolve();
		},
	})
	.add("persistent | Reading", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("persistent | Deleting", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.delete({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.on("cycle", function (event) {
		console.log(" >>> ", String(event.target));
	})
	.run({ async: true });
