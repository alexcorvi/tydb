import {
	BaseModel,
	Database,
	FS_Persistence_Adapter,
	IDB_Persistence_Adapter,
} from "./src";

class MyModel extends BaseModel {
	name: string = "";
	yearBorn: number = 0;
	get age() {
		return new Date().getFullYear() - this.yearBorn;
	}
	toIDCard() {
		let names = this.name.split(/\s/);
		return {
			firstName: names[0],
			lastName: names[names.length - 1],
			age: this.age,
		};
	}
}

{
	// Example 1
	// Embedded database / in-memory
	const db = new Database({
		ref: "myDB.db",
		model: MyModel,
	});
	db.create([MyModel.new({ age: 3, name: "Alex Corvi" })]);
}

{
	// Example 2
	// Embedded database / file-persisted
	const db = new Database({
		ref: "myDB.db",
		model: MyModel,
		persistence_adapter: FS_Persistence_Adapter,
	});
	db.create([MyModel.new({ age: 3, name: "Alex Corvi" })]);
}

{
	// Example 3
	// Embedded database / indexedDB-persisted
	const db = new Database({
		ref: "myDB.db",
		model: MyModel,
		persistence_adapter: IDB_Persistence_Adapter,
	});
	db.create([MyModel.new({ age: 3, name: "Alex Corvi" })]);
}

{
	// Example 4
	// Embedded database / file-persisted
	// multiple instances on the same file
	const db = new Database({
		ref: "myDB.db",
		model: MyModel,
		persistence_adapter: FS_Persistence_Adapter,
		reloadBeforeOperations: true,
	});
	db.create([MyModel.new({ age: 3, name: "Alex Corvi" })]);
}

{
	// Example 5
	// external (over-the-network) database
	const db = new Database({
		ref: "myDB.db",
		model: MyModel,
		persistence_adapter: FS_Persistence_Adapter,
		reloadBeforeOperations: true,
	});
	db.create([MyModel.new({ age: 3, name: "Alex Corvi" })]);
}
