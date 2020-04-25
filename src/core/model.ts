interface ModifierGroup {
	[key: string]: (obj: keyedObjectG<any>, field: string, value: any) => void;
}

interface keyedObject {
	[key: string]: Value;
}

interface keyedObjectG<G> {
	[key: string]: G;
}

type PrimitiveValue = number | string | boolean | undefined | null | Date;
type Value = keyedObject | Array<PrimitiveValue | keyedObject> | PrimitiveValue;

/**
 * Check a key throw an error if the key is non valid
 * Non-treatable edge cases here: if part of the object if of the form { $$date: number } or { $$deleted: true }
 * Its serialized-then-deserialized version it will transformed into a Date object
 * But you really need to want it to trigger such behaviour, even when warned not to use '$' at the beginning of the field names...
 */
function checkKey(k: string | number, v: Value) {
	if (typeof k === "number") {
		k = k.toString();
	}
	if (
		k[0] === "$" &&
		!(k === "$$date" && typeof v === "number") &&
		!(k === "$$deleted" && v === true) &&
		!(k === "$$indexCreated") &&
		!(k === "$$indexRemoved")
	) {
		throw new Error("Field names cannot begin with the $ character");
	}
	if (k.indexOf(".") !== -1) {
		throw new Error("Field names cannot contain a .");
	}
}

/**
 * Check a DB object and throw an error if it's not valid
 * Works by applying the above checkKey function to all fields recursively
 */
function checkObject(obj: Value) {
	if (Array.isArray(obj)) {
		obj.forEach((o) => checkObject(o));
	} else if (
		typeof obj === "object" &&
		obj !== null &&
		!(obj instanceof Date)
	) {
		Object.keys(obj).forEach(function (k) {
			checkKey(k, obj[k]);
			checkObject(obj[k]);
		});
	}
}

/**
 * Serialize an object to be persisted to a one-line string
 * For serialization/deserialization, we use the native JSON parser and not eval or Function
 * That gives us less freedom but data entered in the database may come from users
 * so eval and the like are not safe
 * Accepted primitive types: Number, String, Boolean, Date, null
 * Accepted secondary types: Objects, Arrays
 */
function serialize<T>(obj: T) {
	var res;
	res = JSON.stringify(obj, function (this: any, k, v) {
		checkKey(k, v);

		if (v === undefined) {
			return undefined;
		}
		if (v === null) {
			return null;
		}
		// Hackish way of checking if object is Date.
		// We can't use value directly because for dates it is already string in this function (date.toJSON was already called), so we use this
		if (typeof this[k].getTime === "function") {
			return { $$date: this[k].getTime() };
		}
		return v;
	});
	return res;
}

/**
 * From a one-line representation of an object generate by the serialize function
 * Return the object itself
 */
function deserialize(rawData: string) {
	return JSON.parse(rawData, function (k, v) {
		if (k === "$$date") {
			return new Date(v);
		}
		if (
			typeof v === "string" ||
			typeof v === "number" ||
			typeof v === "boolean" ||
			v === null
		) {
			return v;
		}
		if (v && v.$$date) {
			return v.$$date;
		}
		return v;
	});
}

/**
 * Deep copy a DB object
 * The optional strictKeys flag (defaulting to false) indicates whether to copy everything or only fields
 * where the keys are valid, i.e. don't begin with $ and don't contain a .
 */
function deepCopy<T>(
	obj: T,
	model: (new () => any) & {
		new: (json: any) => any;
	},
	strictKeys?: boolean
): T {
	let res: Value = undefined;
	if (
		typeof obj === "boolean" ||
		typeof obj === "number" ||
		typeof obj === "string" ||
		obj === null ||
		obj instanceof Date
	) {
		return obj;
	}

	if (Array.isArray(obj)) {
		res = [];
		obj.forEach((o) =>
			(res as Value[]).push(deepCopy(o, model, strictKeys))
		);
		return res as any;
	}

	if (typeof obj === "object") {
		res = {};
		Object.keys(obj).forEach((k) => {
			if (!strictKeys || (k[0] !== "$" && k.indexOf(".") === -1)) {
				(res as keyedObject)[k] = deepCopy(
					((obj as unknown) as keyedObject)[k],
					model,
					strictKeys
				);
			}
		});
		if (res.hasOwnProperty("_id")) {
			return model.new(res);
		} else {
			return res as any;
		}
	}

	return JSON.parse(JSON.stringify({ temp: obj })).temp;
}

/**
 * Tells if an object is a primitive type or a "real" object
 * Arrays are considered primitive
 */
function isPrimitiveType(obj: Value) {
	return (
		typeof obj === "boolean" ||
		typeof obj === "number" ||
		typeof obj === "string" ||
		obj === null ||
		obj instanceof Date ||
		Array.isArray(obj)
	);
}

/**
 * Utility functions for comparing things
 * Assumes type checking was already done (a and b already have the same type)
 * compareNSB works for numbers, strings and booleans
 */
type NSB = number | string | boolean;
function compareNSB<T extends NSB>(a: T, b: T) {
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}

function compareArrays(a: Value[], b: Value[]): 0 | 1 | -1 {
	for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
		let comp = compareThings(a[i], b[i]);
		if (comp !== 0) {
			return comp;
		}
	}

	// Common section was identical, longest one wins
	return compareNSB(a.length, b.length);
}

/**
 * Compare { things U undefined }
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * We need to compare with undefined as it will be used in indexes
 * In the case of objects and arrays, we deep-compare
 * If two objects don't have the same type, the (arbitrary) type hierarchy is: undefined, null, number, strings, boolean, dates, arrays, objects
 * Return -1 if a < b, 1 if a > b and 0 if a = b (note that equality here is NOT the same as defined in areThingsEqual!)
 *
 */
function compareThings<V>(
	a: V,
	b: V,
	_compareStrings?: typeof compareNSB
): 0 | 1 | -1 {
	const compareStrings = _compareStrings || compareNSB;

	// undefined
	if (a === undefined) {
		return b === undefined ? 0 : -1;
	}
	if (b === undefined) {
		return a === undefined ? 0 : 1;
	}

	// null
	if (a === null) {
		return b === null ? 0 : -1;
	}
	if (b === null) {
		return a === null ? 0 : 1;
	}

	// Numbers
	if (typeof a === "number") {
		return typeof b === "number" ? compareNSB(a, b) : -1;
	}
	if (typeof b === "number") {
		return typeof a === "number" ? compareNSB(a, b) : 1;
	}

	// Strings
	if (typeof a === "string") {
		return typeof b === "string" ? compareStrings(a, b) : -1;
	}
	if (typeof b === "string") {
		return typeof a === "string" ? compareStrings(a, b) : 1;
	}

	// Booleans
	if (typeof a === "boolean") {
		return typeof b === "boolean" ? compareNSB(a, b) : -1;
	}
	if (typeof b === "boolean") {
		return typeof a === "boolean" ? compareNSB(a, b) : 1;
	}

	// Dates
	if (a instanceof Date) {
		return b instanceof Date ? compareNSB(a.getTime(), b.getTime()) : -1;
	}
	if (b instanceof Date) {
		return a instanceof Date ? compareNSB(a.getTime(), b.getTime()) : 1;
	}

	// Arrays (first element is most significant and so on)
	if (Array.isArray(a)) {
		return Array.isArray(b) ? compareArrays(a, b) : -1;
	}
	if (Array.isArray(b)) {
		return Array.isArray(a) ? compareArrays(a, b) : 1;
	}

	// Objects
	let aKeys = Object.keys(a).sort();
	let bKeys = Object.keys(b).sort();

	for (let i = 0; i < Math.min(aKeys.length, bKeys.length); i += 1) {
		let comp = compareThings(
			((a as unknown) as keyedObject)[aKeys[i]],
			((b as unknown) as keyedObject)[bKeys[i]]
		);

		if (comp !== 0) {
			return comp;
		}
	}

	return compareNSB(aKeys.length, bKeys.length);
}

// ==============================================================
// Updating documents
// ==============================================================

/**
 * The signature of modifier functions is as follows
 * Their structure is always the same: recursively follow the dot notation while creating
 * the nested documents if needed, then apply the "last step modifier"
 */

const lastStepModifierFunctions: ModifierGroup = {
	$set: function (obj: keyedObject, field: string, value: Value) {
		if (!obj) {
			return;
		}
		obj[field] = value;
	},

	$mul: function (obj: keyedObjectG<number>, field: string, value: Value) {
		let base = obj[field];
		if (typeof value !== "number" || typeof base !== "number") {
			throw new Error("Multiply operator works only on numbers");
		}
		obj[field] = base * value;
	},

	$unset: function (obj: keyedObject, field: string) {
		delete obj[field];
	},

	/**
	 * Push an element to the end of an array field
	 * Optional modifier $each instead of value to push several values
	 * Optional modifier $slice to slice the resulting array, see https://docs.mongodb.org/manual/reference/operator/update/slice/
	 * Differences with MongoDB: if $slice is specified and not $each, we act as if value is an empty array
	 */
	$push: function (obj: keyedObjectG<Value[]>, field: string, value: Value) {
		// Create the array if it doesn't exist
		if (!obj.hasOwnProperty(field)) {
			obj[field] = [];
		}

		if (!Array.isArray(obj[field])) {
			throw new Error("Can't $push an element on non-array values");
		}

		if (
			value !== null &&
			typeof value === "object" &&
			((value as unknown) as keyedObject)["$slice"] &&
			((value as unknown) as keyedObject)["$each"] === undefined
		) {
			((value as unknown) as keyedObject).$each = [];
		}

		if (
			value !== null &&
			typeof value === "object" &&
			((value as unknown) as keyedObject)["$each"]
		) {
			const eachVal = ((value as unknown) as keyedObject)["$each"];
			const sliceVal = ((value as unknown) as keyedObject)["$slice"];
			if (
				Object.keys(value).length >= 3 ||
				(Object.keys(value).length === 2 && sliceVal === undefined)
			) {
				throw new Error(
					"Can only use $slice in conjunction with $each when $push to array"
				);
			}

			if (!Array.isArray(eachVal)) {
				throw new Error("$each requires an array value");
			}

			eachVal.forEach((v) => obj[field].push(v));

			if (sliceVal === undefined) {
				return;
			}

			if (sliceVal !== undefined && typeof sliceVal !== "number") {
				throw new Error("$slice requires a number value");
			}

			if (sliceVal === 0) {
				obj[field] = [];
			} else {
				let start = 0;
				let end = 0;
				let n = obj[field].length;
				if (sliceVal < 0) {
					start = Math.max(0, n + sliceVal);
					end = n;
				} else if (sliceVal > 0) {
					start = 0;
					end = Math.min(n, sliceVal);
				}
				obj[field] = obj[field].slice(start, end);
			}
		} else {
			obj[field].push(value);
		}
	},

	/**
	 * Add an element to an array field only if it is not already in it
	 * No modification if the element is already in the array
	 * Note that it doesn't check whether the original array contains duplicates
	 */
	$addToSet: function (
		obj: keyedObjectG<Value[]>,
		field: string,
		value: Value
	) {
		// Create the array if it doesn't exist
		if (!obj.hasOwnProperty(field)) {
			obj[field] = [];
		}

		if (!Array.isArray(obj[field])) {
			throw new Error("Can't $addToSet an element on non-array values");
		}

		const eachVal = ((value as unknown) as keyedObject)["$each"];

		if (value !== null && typeof value === "object" && eachVal) {
			if (Object.keys(value).length > 1) {
				throw new Error(
					"Can't use another field in conjunction with $each on $addToSet modifier"
				);
			}
			if (!Array.isArray(eachVal)) {
				throw new Error("$each requires an array value");
			}

			eachVal.forEach((v) =>
				lastStepModifierFunctions.$addToSet(obj, field, v)
			);
		} else {
			let addToSet = true;
			for (let index = 0; index < obj[field].length; index++) {
				const element = obj[field][index];
				if (compareThings(element, value) === 0) {
					addToSet = false;
					break;
				}
			}
			if (addToSet) {
				obj[field].push(value);
			}
		}
	},

	/**
	 * Remove the first or last element of an array
	 */
	$pop: function (obj: keyedObjectG<Value[]>, field: string, value: Value) {
		if (!Array.isArray(obj[field])) {
			throw new Error("Can't $pop an element from non-array values");
		}
		if (typeof value !== "number") {
			throw new Error(
				value + " isn't an integer, can't use it with $pop"
			);
		}
		if (value === 0) {
			return;
		}

		if (value > 0) {
			obj[field] = obj[field].slice(0, obj[field].length - 1);
		} else {
			obj[field] = obj[field].slice(1);
		}
	},

	/**
	 * Removes all instances of a value from an existing array
	 */
	$pull: function (obj: keyedObjectG<Value[]>, field: string, value: Value) {
		if (!Array.isArray(obj[field])) {
			throw new Error("Can't $pull an element from non-array values");
		}

		let arr = obj[field];
		for (let i = arr.length - 1; i >= 0; i -= 1) {
			if (match(arr[i], value)) {
				arr.splice(i, 1);
			}
		}
	},

	/**
	 * Removes all instances of a value from an existing array
	 */
	$pullAll: function (
		obj: keyedObjectG<Value[]>,
		field: string,
		value: Array<any>
	) {
		if (!Array.isArray(obj[field])) {
			throw new Error("Can't $pull an element from non-array values");
		}

		let arr = obj[field];
		for (let i = arr.length - 1; i >= 0; i -= 1) {
			for (let j = 0; j < value.length; j++) {
				if (match(arr[i], value[j])) {
					arr.splice(i, 1);
				}
			}
		}
	},

	/**
	 * Increment a numeric field's value
	 */
	$inc: function (obj: keyedObjectG<number>, field: string, value: Value) {
		if (typeof value !== "number") {
			throw new Error(value + " must be a number");
		}

		if (typeof obj[field] !== "number") {
			if (!obj.hasOwnProperty(field)) {
				obj[field] = value;
			} else {
				throw new Error(
					"Can't use the $inc modifier on non-number fields"
				);
			}
		} else {
			obj[field] = obj[field] + value;
		}
	},

	/**
	 * Updates the value of the field, only if specified field is greater than the current value of the field
	 */
	$max: function (obj: keyedObjectG<NSB>, field: string, value: NSB) {
		if (typeof obj[field] === "undefined") {
			obj[field] = value;
		} else if (value > obj[field]) {
			obj[field] = value;
		}
	},

	/**
	 * Updates the value of the field, only if specified field is smaller than the current value of the field
	 */
	$min: function (obj: keyedObjectG<NSB>, field: string, value: NSB) {
		if (typeof obj[field] === "undefined") {
			obj[field] = value;
		} else if (value < obj[field]) {
			obj[field] = value;
		}
	},

	$currentDate: function (obj: keyedObjectG<any>, field: string, value: any) {
		if (value === true) {
			obj[field] = new Date();
		} else if (value.$type && value.$type === "timestamp") {
			obj[field] = Date.now();
		} else if (value.$type && value.$type === "date") {
			obj[field] = new Date();
		}
	},

	$rename: function (obj: keyedObjectG<any>, field: string, value: any) {
		obj[value] = obj[field];
		delete obj[field];
	},

	$setOnInsert: function () {
		// if the operator reached here
		// it means that the update was not actually an insertion.
		// this operator is being dealt with at the datastore.ts file
	},
};

// Given its name, create the complete modifier function
function createModifierFunction(modifier: string) {
	return function (obj: keyedObjectG<any>, field: string, value: any) {
		var fieldParts = typeof field === "string" ? field.split(".") : field;

		if (fieldParts.length === 1) {
			lastStepModifierFunctions[modifier](obj, field, value);
		} else {
			if (obj[fieldParts[0]] === undefined) {
				if (modifier === "$unset") {
					return;
				} // Bad looking specific fix, needs to be generalized modifiers that behave like $unset are implemented
				obj[fieldParts[0]] = {};
			}
			modifierFunctions[modifier](
				obj[fieldParts[0]],
				fieldParts.slice(1).join("."),
				value
			);
		}
	};
}

const modifierFunctions: ModifierGroup = {};

// Actually create all modifier functions
Object.keys(lastStepModifierFunctions).forEach(function (modifier) {
	modifierFunctions[modifier] = createModifierFunction(modifier);
});

/**
 * Modify a DB object according to an update query
 */
function modify<G extends { _id?: string }>(
	obj: G,
	updateQuery: any,
	model: (new () => G) & {
		new: (json: G) => G;
	}
): G {
	var keys = Object.keys(updateQuery);
	let firstChars = keys.map((x) => x.charAt(0));
	let dollarFirstChars = firstChars.filter((x) => x === "$");

	if (
		keys.indexOf("_id") !== -1 &&
		(updateQuery as keyedObject)["_id"] !== obj._id
	) {
		throw new Error("You cannot change a document's _id");
	}

	if (
		dollarFirstChars.length !== 0 &&
		dollarFirstChars.length !== firstChars.length
	) {
		throw new Error("You cannot mix modifiers and normal fields");
	}

	let newDoc: G;

	if (dollarFirstChars.length === 0) {
		// Simply replace the object with the update query contents
		newDoc = deepCopy(updateQuery, model);
		newDoc._id = obj._id;
	} else {
		// Apply modifiers
		let modifiers = Array.from(new Set(keys));
		newDoc = deepCopy(obj, model);
		modifiers.forEach(function (modifier) {
			let modArgument = (updateQuery as keyedObjectG<keyedObject>)[
				modifier
			];

			if (!modifierFunctions[modifier]) {
				throw new Error("Unknown modifier " + modifier);
			}

			// Can't rely on Object.keys throwing on non objects since ES6
			// Not 100% satisfying as non objects can be interpreted as objects but no false negatives so we can live with it
			if (typeof modArgument !== "object") {
				throw new Error(
					"Modifier " + modifier + "'s argument must be an object"
				);
			}

			let keys = Object.keys(modArgument);
			keys.forEach(function (k) {
				modifierFunctions[modifier](newDoc, k, modArgument[k]);
			});
		});
	}

	// Check result is valid and return it
	checkObject(newDoc);

	if (obj._id !== newDoc._id) {
		throw new Error("You can't change a document's _id");
	}
	return newDoc;
}

// ==============================================================
// Finding documents
// ==============================================================

/**
 * Get a value from object with dot notation
 */
function getDotValue(obj: any, field: string): any {
	const fieldParts = typeof field === "string" ? field.split(".") : field;

	if (!obj) {
		return undefined;
	} // field cannot be empty so that means we should return undefined so that nothing can match

	if (fieldParts.length === 0) {
		return obj;
	}

	if (fieldParts.length === 1) {
		return obj[fieldParts[0]];
	}

	if (Array.isArray(obj[fieldParts[0]])) {
		// If the next field is an integer, return only this item of the array
		let i = parseInt(fieldParts[1], 10);
		if (typeof i === "number" && !isNaN(i)) {
			return getDotValue(
				obj[fieldParts[0]][i],
				fieldParts.slice(2) as any
			);
		}

		// Return the array of values
		let objects = new Array();
		for (let i = 0; i < obj[fieldParts[0]].length; i += 1) {
			objects.push(
				getDotValue(obj[fieldParts[0]][i], fieldParts.slice(1) as any)
			);
		}
		return objects;
	} else {
		return getDotValue(obj[fieldParts[0]], fieldParts.slice(1) as any);
	}
}

/**
 * Check whether 'things' are equal
 * Things are defined as any native types (string, number, boolean, null, date) and objects
 * In the case of object, we check deep equality
 * Returns true if they are, false otherwise
 */
function areThingsEqual<A, B>(a: A, b: B): boolean {
	var aKeys, bKeys, i;

	// Strings, booleans, numbers, null
	if (
		a === null ||
		typeof a === "string" ||
		typeof a === "boolean" ||
		typeof a === "number" ||
		b === null ||
		typeof b === "string" ||
		typeof b === "boolean" ||
		typeof b === "number"
	) {
		return a === (b as any);
	}

	// Dates
	if (a instanceof Date || b instanceof Date) {
		return (
			a instanceof Date &&
			b instanceof Date &&
			a.getTime() === b.getTime()
		);
	}

	// Arrays (no match since arrays are used as a $in)
	// undefined (no match since they mean field doesn't exist and can't be serialized)
	if (
		(!(Array.isArray(a) && Array.isArray(b)) &&
			(Array.isArray(a) || Array.isArray(b))) ||
		a === undefined ||
		b === undefined
	) {
		return false;
	}

	// General objects (check for deep equality)
	// a and b should be objects at this point
	try {
		aKeys = Object.keys(a);
		bKeys = Object.keys(b);
	} catch (e) {
		return false;
	}

	if (aKeys.length !== bKeys.length) {
		return false;
	}
	for (i = 0; i < aKeys.length; i += 1) {
		if (bKeys.indexOf(aKeys[i]) === -1) {
			return false;
		}
		if (
			!areThingsEqual(
				((a as unknown) as keyedObject)[aKeys[i]],
				((b as unknown) as keyedObject)[aKeys[i]]
			)
		) {
			return false;
		}
	}
	return true;
}

/**
 * Check that two values are comparable
 */
function areComparable<T, D>(a: T, b: D): boolean {
	if (
		typeof a !== "string" &&
		typeof a !== "number" &&
		!(a instanceof Date) &&
		typeof b !== "string" &&
		typeof b !== "number" &&
		!(b instanceof Date)
	) {
		return false;
	}

	if (typeof a !== typeof b) {
		return false;
	}

	return true;
}

interface ComparisonGroup {
	[key: string]: <A, B>(a: A, b: B | A) => boolean;
}

const comparisonFunctions: ComparisonGroup = {};

/**
 * Arithmetic and comparison operators
 */

comparisonFunctions.$type = function (a, b: any) {
	if (["number", "boolean", "string", "undefined"].indexOf(b) > -1) {
		return typeof a === b;
	} else if (b === "array") {
		return Array.isArray(a);
	} else if (b === "null") {
		return a === null;
	} else if (b === "date") {
		return a instanceof Date;
	} else if (b === "object") {
		return (
			typeof a === "object" &&
			!(a instanceof Date) &&
			!(a === null) &&
			!Array.isArray(a)
		);
	} else return false;
};

comparisonFunctions.$not = function (a, b) {
	return !match({ k: a }, { k: b });
};

comparisonFunctions.$eq = function (a, b) {
	return areThingsEqual(a, b);
};

comparisonFunctions.$lt = function (a, b) {
	return areComparable(a, b) && a < b;
};

comparisonFunctions.$lte = function (a, b) {
	return areComparable(a, b) && a <= b;
};

comparisonFunctions.$gt = function (a, b) {
	return areComparable(a, b) && a > b;
};

comparisonFunctions.$gte = function (a, b) {
	return areComparable(a, b) && a >= b;
};

comparisonFunctions.$mod = function (a: any, b: any) {
	if (!Array.isArray(b)) {
		throw new Error("malformed mod, must be supplied with an array");
	}
	if (b.length !== 2) {
		throw new Error(
			"malformed mod, array length must be exactly two, a divisor and a remainder"
		);
	}
	return a % b[0] === b[1];
};

comparisonFunctions.$ne = function (a, b) {
	if (a === undefined) {
		return true;
	}
	return !areThingsEqual(a, b);
};

comparisonFunctions.$in = function (a, b) {
	var i;

	if (!Array.isArray(b)) {
		throw new Error("$in operator called with a non-array");
	}

	for (i = 0; i < b.length; i += 1) {
		if (areThingsEqual(a, b[i])) {
			return true;
		}
	}

	return false;
};

comparisonFunctions.$nin = function (a, b) {
	if (!Array.isArray(b)) {
		throw new Error("$nin operator called with a non-array");
	}

	return !comparisonFunctions.$in(a, b);
};

comparisonFunctions.$regex = function (a, b) {
	if (!(b instanceof RegExp)) {
		throw new Error("$regex operator called with non regular expression");
	}

	if (typeof a !== "string") {
		return false;
	} else {
		return b.test(a);
	}
};

comparisonFunctions.$exists = function (value, exists) {
	if (exists || (exists as any) === "") {
		// This will be true for all values of exists except false, null, undefined and 0
		(exists as any) = true; // That's strange behaviour (we should only use true/false) but that's the way Mongo does it...
	} else {
		(exists as any) = false;
	}

	if (value === undefined) {
		return (!exists as unknown) as boolean;
	} else {
		return (exists as unknown) as boolean;
	}
};

// Specific to arrays
comparisonFunctions.$size = function (obj, value) {
	if (!Array.isArray(obj)) {
		return false;
	}
	if (((value as unknown) as number) % 1 !== 0) {
		throw new Error("$size operator called without an integer");
	}

	return (
		((obj as unknown) as any[]).length === ((value as unknown) as number)
	);
};

comparisonFunctions.$elemMatch = function (obj, value) {
	if (!Array.isArray(obj)) {
		return false;
	}
	var i = obj.length;
	var result = false; // Initialize result
	while (i--) {
		if (match(obj[i], value)) {
			// If match for array element, return true
			result = true;
			break;
		}
	}
	return result;
};

comparisonFunctions.$all = function (a, b) {
	if (!Array.isArray(a)) {
		throw new Error("$all must be applied on fields of type array");
	}
	if (!Array.isArray(b)) {
		throw new Error("$all must be supplied with argument of type array");
	}
	for (let i = 0; i < b.length; i++) {
		const elementInArgument = b[i];
		if (a.indexOf(elementInArgument) === -1) {
			return false;
		}
	}
	return true;
};

const arrayComparisonFunctions: { [key: string]: boolean } = {};

arrayComparisonFunctions.$size = true;
arrayComparisonFunctions.$elemMatch = true;
arrayComparisonFunctions.$all = true;

const logicalOperators: keyedObjectG<(obj: any, query: any[]) => boolean> = {};

/**
 * Match any of the subqueries
 */
logicalOperators.$or = function (obj, query) {
	var i;

	if (!Array.isArray(query)) {
		throw new Error("$or operator used without an array");
	}

	for (i = 0; i < query.length; i += 1) {
		if (match(obj, query[i])) {
			return true;
		}
	}

	return false;
};

/**
 * Match all of the subqueries
 */
logicalOperators.$and = function (obj, query) {
	if (!Array.isArray(query)) {
		throw new Error("$and operator used without an array");
	}

	for (let i = 0; i < query.length; i += 1) {
		if (!match(obj, query[i])) {
			return false;
		}
	}

	return true;
};

/**
 * Match non of the subqueries
 */
logicalOperators.$nor = function (obj, query) {
	if (!Array.isArray(query)) {
		throw new Error("$nor operator used without an array");
	}

	for (let i = 0; i < query.length; i += 1) {
		if (match(obj, query[i])) {
			return false;
		}
	}

	return true;
};

/**
 * Use a function to match
 */
logicalOperators.$where = function (obj, fn) {
	var result;

	if (typeof fn !== "function") {
		throw new Error("$where operator used without a function");
	}

	result = (fn as any).call(obj);
	if (typeof result !== "boolean") {
		throw new Error("$where function must return boolean");
	}

	return result;
};

/**
 * Tell if a given document matches a query
 */
function match(obj: any, query: any): boolean {
	// Primitive query against a primitive type
	// This is a bit of a hack since we construct an object with an arbitrary key only to dereference it later
	// But I don't have time for a cleaner implementation now
	if (isPrimitiveType(obj) || isPrimitiveType(query)) {
		return matchQueryPart({ needAKey: obj }, "needAKey", query);
	}

	// Normal query
	let queryKeys = Object.keys(query);
	for (let i = 0; i < queryKeys.length; i += 1) {
		let queryKey = queryKeys[i];
		let queryValue = query[queryKey];

		if (queryKey[0] === "$") {
			if (!logicalOperators[queryKey]) {
				throw new Error("Unknown logical operator " + queryKey);
			}
			if (!logicalOperators[queryKey](obj, queryValue as any)) {
				return false;
			}
		} else {
			if (
				Object.keys(queryValue).length &&
				!matchQueryPart(obj, queryKey, queryValue)
			) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Match an object against a specific { key: value } part of a query
 * if the treatObjAsValue flag is set, don't try to match every part separately, but the array as a whole
 */
function matchQueryPart(
	obj: any,
	queryKey: string,
	queryValue: any,
	treatObjAsValue?: boolean
): boolean {
	const objValue = getDotValue(obj, queryKey);

	// Check if the value is an array if we don't force a treatment as value
	if (Array.isArray(objValue) && !treatObjAsValue) {
		// If the queryValue is an array, try to perform an exact match
		if (Array.isArray(queryValue)) {
			return matchQueryPart(obj, queryKey, queryValue, true);
		}

		// Check if we are using an array-specific comparison function
		if (
			queryValue !== null &&
			typeof queryValue === "object" &&
			!(queryValue instanceof RegExp)
		) {
			let keys = Object.keys(queryValue);
			for (let i = 0; i < keys.length; i += 1) {
				if (arrayComparisonFunctions[keys[i]]) {
					return matchQueryPart(obj, queryKey, queryValue, true);
				}
			}
		}

		// If not, treat it as an array of { obj, query } where there needs to be at least one match
		for (let i = 0; i < objValue.length; i += 1) {
			// edge case: using $ne on array
			if (queryValue["$ne"]) {
				if (objValue.indexOf(queryValue["$ne"]) !== -1) {
					return false;
				}
			}
			if (Array.isArray(queryValue["$nin"])) {
				const intersection = queryValue["$nin"].filter(
					(value) => -1 !== objValue.indexOf(value)
				);
				if (intersection.length) {
					return false;
				}
			}
			if (matchQueryPart({ k: objValue[i] }, "k", queryValue)) {
				return true;
			} // k here could be any string
		}
		return false;
	}

	// queryValue is an actual object. Determine whether it contains comparison operators
	// or only normal fields. Mixed objects are not allowed
	if (
		queryValue !== null &&
		typeof queryValue === "object" &&
		!(queryValue instanceof RegExp) &&
		!Array.isArray(queryValue)
	) {
		let keys = Object.keys(queryValue);
		let firstChars = keys.map((item) => item[0]);
		let dollarFirstChars = firstChars.filter((c) => c === "$");

		if (
			dollarFirstChars.length !== 0 &&
			dollarFirstChars.length !== firstChars.length
		) {
			throw new Error("You cannot mix operators and normal fields");
		}

		// queryValue is an object of this form: { $comparisonOperator1: value1, ... }
		if (dollarFirstChars.length > 0) {
			for (let i = 0; i < keys.length; i += 1) {
				if (!comparisonFunctions[keys[i]]) {
					throw new Error("Unknown comparison function " + keys[i]);
				}
				if (
					!comparisonFunctions[keys[i]](objValue, queryValue[keys[i]])
				) {
					return false;
				}
			}
			return true;
		}
	}

	// Using regular expressions with basic querying
	if (queryValue instanceof RegExp) {
		return comparisonFunctions.$regex(objValue, queryValue);
	}

	// queryValue is either a native value or a normal object
	// Basic matching is possible
	if (!areThingsEqual(objValue, queryValue)) {
		return false;
	}

	return true;
}

export {
	serialize,
	deserialize,
	deepCopy,
	checkObject,
	isPrimitiveType,
	modify,
	getDotValue,
	match,
	areThingsEqual,
	compareThings,
};
