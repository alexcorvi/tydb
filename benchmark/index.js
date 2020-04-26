const Benchmark = require("benchmark");
const lib = require("../dist/index");
const suite = new Benchmark.Suite();

const db = new lib.Database({ ref: "ref", model: lib.BaseModel });

let id = "";

suite
	.add("Insertion single", {
		defer: true,
		fn: async function (deferred) {
			const res = await db.insert([{ name: "john", age: 22 }]);
			id = res.docs[0]._id;
			deferred.resolve();
		},
	})
	.add("Finding with a non-indexed field", {
		defer: true,
		fn: async function (deferred) {
			await db.find({ filter: { name: "john" } });
			deferred.resolve();
		},
	})
	.add("Finding with an indexed field", {
		defer: true,
		fn: async function (deferred) {
			await db.find({ filter: { _id: id } });
			deferred.resolve();
		},
	})
	.on("cycle", function (event) {
		console.log(" >>> ", String(event.target));
	})
	.run({ async: true });
