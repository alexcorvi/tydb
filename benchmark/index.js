const Benchmark = require("benchmark");
const lib = require("../dist/index");
const suite = new Benchmark.Suite();

const memoryDB = new lib.Database({ ref: "ref", model: lib.BaseModel });
const persistentDB = new lib.Database({
	ref: "workspace/benchmark",
	model: lib.BaseModel,
	persistence_adapter: lib.FS_Persistence_Adapter,
});
const reload = new lib.Database({
	ref: "workspace/benchmark2",
	model: lib.BaseModel,
	persistence_adapter: lib.FS_Persistence_Adapter,
	reloadBeforeOperations: true,
});

let id = "";

suite
	.add("memory | create | ", {
		defer: true,
		fn: async function (deferred) {
			const res = await memoryDB.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("memory | update | ", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.update({
				filter: { _id: id },
				update: { name: "alex" },
			});
			deferred.resolve();
		},
	})
	.add("memory | lookup | ", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("memory | remove | ", {
		defer: true,
		fn: async function (deferred) {
			await memoryDB.delete({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("fs-adp | create | ", {
		defer: true,
		fn: async function (deferred) {
			const res = await persistentDB.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("fs-adp | update | ", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.update({
				filter: { _id: id },
				update: { name: "alex" },
			});
			deferred.resolve();
		},
	})
	.add("fs-adp | lookup | ", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("fs-adp | delete | ", {
		defer: true,
		fn: async function (deferred) {
			await persistentDB.delete({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("reload | create | ", {
		defer: true,
		fn: async function (deferred) {
			const res = await reload.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("reload | update | ", {
		defer: true,
		fn: async function (deferred) {
			await reload.update({
				filter: { _id: id },
				update: { name: "alex" },
			});
			deferred.resolve();
		},
	})
	.add("reload | lookup | ", {
		defer: true,
		fn: async function (deferred) {
			await reload.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.add("reload | delete | ", {
		defer: true,
		fn: async function (deferred) {
			await reload.delete({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.on("cycle", function (event) {
		console.log(" >>> ", String(event.target));
	})
	.run({ async: true });
