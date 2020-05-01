import { Keys, Partial } from "./common";

export interface AnyFieldOperators<V> {
	$type?:
		| "string"
		| "number"
		| "boolean"
		| "undefined"
		| "array"
		| "null"
		| "date"
		| "object";

	/**
	 * Specifies equality condition. The $eq operator matches documents where the value of a field equals the specified value.
	 * {field: { $eq: <value> }}
	 */
	$eq?: V;

	/**
	 * The $in operator selects the documents where the value of a field equals any value in the specified array.
	 * { field: { $in: [<value1>, <value2>, ... <valueN> ] } }
	 */
	$in?: V[];

	/**
	 * $ne selects the documents where the value of the field is not equal (i.e. !=) to the specified value. This includes documents that do not contain the field.
	 * {field: {$ne:value}}
	 */
	$ne?: V;

	/**
	 * $nin selects the documents where: the field value is not in the specified array or the field does not exist.
	 * { field: { $nin: [ <value1>, <value2> ... <valueN> ]} }
	 */
	$nin?: V[];

	/**
	 * $not performs a logical NOT operation on the specified <operator-expression> and selects the documents that do not match the <operator-expression>. This includes documents that do not contain the field.
	 * { field: { $not: { <operator-expression> } } }
	 */
	$not?: FieldLevelQueryOperators<V>;

	/**
	 * When <boolean> is true, $exists matches the documents that contain the field, including documents where the field value is null. If <boolean> is false, the query returns only the documents that do not contain the field.
	 * { field: { $exists: <boolean> } }
	 */
	$exists?: boolean;
}

export interface StringOperators<V> extends AnyFieldOperators<V> {
	/**
	 * Provides regular expression capabilities for pattern matching strings in queries. MongoDB uses Perl compatible regular expressions (i.e. “PCRE” ) version 8.41 with UTF-8 support.
	 * {field:{$regex: /pattern/<options>}}
	 */
	$regex?: RegExp;
}

export interface NumberOperators<V> extends AnyFieldOperators<V> {
	/**
	 * $gt selects those documents where the value of the field is greater than (i.e. >) the specified value.
	 * {field: {$gt:value}}
	 */
	$gt?: V;

	/**
	 * $gte selects the documents where the value of the field is greater than or equal to (i.e. >=) a specified value
	 * {field: {$gte:value}}
	 */
	$gte?: V;
	/**
	 * $lt selects the documents where the value of the field is less than (i.e. <) the specified value.
	 * {field: {$lt:value}}
	 */
	$lt?: V;

	/**
	 * $lte selects the documents where the value of the field is less than or equal to (i.e. <=) the specified value.
	 * {field: {$lte:value}}
	 */
	$lte?: V;
	/**
	 * Select documents where the value of a field divided by a divisor has the specified remainder (i.e. perform a modulo operation to select documents). To specify a $mod expression, use the following syntax:
	 * { field: { $mod: [ divisor, remainder ] } }
	 */
	$mod?: [number, number];
}

export type InnerArrayOperators<V> = V extends Date
	? NumberOperators<V>
	: V extends number
	? NumberOperators<V>
	: V extends string
	? StringOperators<V>
	: AnyFieldOperators<V>;

export interface TotalArrayOperators<V> extends AnyFieldOperators<V> {
	/**
	 * The $all operator selects the documents where the value of a field is an array that contains all the specified elements.
	 *{ field: { $all: [ <value1> , <value2> ... ] } }
	 */
	$all?: Array<V>;

	/**
	 * The $elemMatch operator matches documents that contain an array field with at least one element that matches all the specified query criteria.
	 * { <field>: { $elemMatch: { <query1>, <query2>, ... } } }
	 */
	$elemMatch?: FieldLevelQueryOperators<V>;

	/**
	 * The $size operator matches any array with the number of elements specified by the argument. For example:{ field: { $size: 2 } }
	 */
	$size?: number;
}

export type ArrayOperators<V> = TotalArrayOperators<V> & InnerArrayOperators<V>;

export interface TopLevelQueryOperators<S> {
	/**
	 * $and performs a logical AND operation on an array of two or more expressions (e.g. <expression1>, <expression2>, etc.) and selects the documents that satisfy all the expressions in the array. The $and operator uses short-circuit evaluation. If the first expression (e.g. <expression1>) evaluates to false, MongoDB will not evaluate the remaining expressions.
	 * { $and: [ { <expression1> }, { <expression2> } , ... , { <expressionN> } ] }
	 */
	$and?: SchemaKeyFilters<S>[];

	/**
	 * $nor performs a logical NOR operation on an array of one or more query expression and selects the documents that fail all the query expressions in the array. The $nor has the following syntax:
	 * { $nor: [ { <expression1> }, { <expression2> }, ...  { <expressionN> } ] }
	 */
	$nor?: SchemaKeyFilters<S>[];

	/**
	 * The $or operator performs a logical OR operation on an array of two or more expressions and selects the documents that satisfy at least one of the expressions. The $or has the following syntax:
	 * { $or: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ] }
	 */
	$or?: SchemaKeyFilters<S>[];

	/**
	 * Use the $where operator to pass either a string containing a JavaScript function to the query system. The $where provides greater flexibility, but requires that the database processes the JavaScript expression or function for each document in the collection. Reference the document in the JavaScript expression or function using this.
	 */
	$where?: (this: S) => boolean;

	/**
	 * Use this operator when trying to apply filter on a deeply nested properties, like: "employee.address.street".
	 * {$deep: {"employee.address.street": {$eq: "Bedford Mount"}}}
	 */
	$deep?: {
		[key: string]: SchemaKeyFilters<any>;
	};
}

export type FieldLevelQueryOperators<V> = V extends Array<any>
	? ArrayOperators<V[0]>
	: V extends Date
	? NumberOperators<V>
	: V extends number
	? NumberOperators<V>
	: V extends string
	? StringOperators<V>
	: AnyFieldOperators<V>;

export type SchemaKeyFilters<S> = Partial<
	{
		[key in Keys<S>]: FieldLevelQueryOperators<S[key]> | S[key];
	}
>;

export type Filter<S> = SchemaKeyFilters<S> | TopLevelQueryOperators<S>;

export type SchemaKeySort<S> = Partial<
	{ [key in Keys<S>]: -1 | 1 } & { $deep: { [key: string]: -1 | 1 } }
>;

export type SchemaKeyProjection<S> = Partial<
	{ [key in Keys<S>]: 0 | 1 } & { $deep: { [key: string]: 0 | 1 } }
>;
