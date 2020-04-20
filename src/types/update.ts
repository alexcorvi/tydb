import { Keys, Partial } from "./common";
import { FieldLevelQueryOperators } from "./filter";

export interface UpdateOperatorsModifiers<S> {
	/**
	 * Modifies the $push and $addToSet operators to append multiple items for array updates.
	 * { ($addToSet|$push): { <field>: { $each: [ <value1>, <value2> ... ] } } }
	 */
	$each: any[];

	/**
	 * Modifies the $push operator to limit the size of updated arrays.
	 * {$push: {<field>: {$each: [ <value1>, <value2>, ... ],$slice: <num>}}}
	 */
	$slice: number;

	/**
	 * The $sort modifier orders the elements of an array during a $push operation. To use the $sort modifier, it must appear with the $each modifier.
	 * You can pass an empty array [] to the $each modifier such that only the $sort modifier has an effect.
	 * {$push: {<field>: {$each: [ <value1>, <value2>, ... ],$sort: <sort specification>}}}
	 */
	$sort: 1 | -1 | UpdateOperatorsOnSchema<S, 1 | -1>;

	/**
	 * The $position modifier specifies the location in the array at which the $push operator insert elements. Without the $position modifier, the $push operator inserts elements to the end of the array.
	 */
	$position: number;
}

export interface UpdateOperators<S> {
	/**
	 * Increments the value of the field by the specified amount.
	 * { $inc: { <field1>: <amount1>, <field2>: <amount2>, ... } }
	 */
	$inc?: UpdateOperatorsOnSchema<S, number>;
	/**
	 * Multiplies the value of the field by the specified amount.
	 * { $mul: { field: <number> } }
	 */
	$mul?: UpdateOperatorsOnSchema<S, number>;
	/**
	 * Renames a field.
	 * {$rename: { <field1>: <newName1>, <field2>: <newName2>, ... } }
	 */
	$rename?: UpdateOperatorsOnSchema<S, string>;
	/**
	 * If an update operation with upsert: true results in an insert of a document, then $setOnInsert assigns the specified values to the fields in the document. If the update operation does not result in an insert, $setOnInsert does nothing.
	 * { $setOnInsert: { <field1>: <value1>, ... } },
	 *
	 */
	$setOnInsert?: Partial<S>;
	/**
	 * Sets the value of a field in a document.
	 * { $set: { <field1>: <value1>, ... } }
	 */
	$set?: Partial<
		S & {
			$deep: {
				[key: string]: any;
			};
		}
	>;
	/**
	 * Removes the specified field from a document.
	 * { $unset: { <field1>: "", ... } }
	 */
	$unset?: Partial<S>;
	/**
	 * Only updates the field if the specified value is less than the existing field value.
	 * { $min: { <field1>: <value1>, ... } }
	 */
	$min?: Partial<S>;
	/**
	 * Only updates the field if the specified value is greater than the existing field value.
	 * { $max: { <field1>: <value1>, ... } }
	 */
	$max?: Partial<S>;
	/**
	 * Sets the value of a field to current date, either as a Date or a Timestamp.
	 * { $currentDate: { <field1>: <typeSpecification1>, ... } }
	 */
	$currentDate?: UpdateOperatorsOnSchema<
		S,
		boolean | { $type: "timestamp" | "date" }
	>;
	/**
	 * Adds elements to an array only if they do not already exist in the set.
	 * { $addToSet: { <field1>: <value1>, ... } }
	 */
	$addToSet?: UpdateOperatorsOnSchema<
		S,
		Array<any> | UpdateOperatorsModifiers<S>
	>;
	/**
	 * The $pop operator removes the first or last element of an array. Pass $pop a value of -1 to remove the first element of an array and 1 to remove the last element in an array.
	 * { $pop: { <field>: <-1 | 1>, ... } }
	 */
	$pop?: UpdateOperatorsOnSchema<S, -1 | 1>;
	/**
	 * The $pullAll operator removes all instances of the specified values from an existing array. Unlike the $pull operator that removes elements by specifying a query, $pullAll removes elements that match the listed values.
	 * { $pullAll: { <field1>: [ <value1>, <value2> ... ], ... } }
	 */
	$pullAll?: UpdateOperatorsOnSchema<S, Array<any>>;
	/**
	 * Removes all array elements that match a specified query.
	 * { $pull: { <field1>: <value|condition>, <field2>: <value|condition>, ... } }
	 */
	$pull?: UpdateOperatorsOnSchema<S, FieldLevelQueryOperators<any>>;
	/**
	 * The $push operator appends a specified value to an array.
	 * { $push: { <field1>: <value1>, ... } }
	 */
	$push?: UpdateOperatorsOnSchema<S, UpdateOperatorsModifiers<S> | {}>;
}

export type UpdateOperatorsOnSchema<S, V> = Partial<{ [key in Keys<S>]: V }>;
