/*
 * Default compareKeys function will work for numbers, strings and dates
 */
export function defaultCompareKeysFunction<NSD>(a: NSD, b: NSD) {
	const diff = (a as any) - (b as any);

	if (!isNaN(diff)) {
		return diff;
	}

	const err = new Error(`Couldn't compare elements "${a}" "${b}"`);
	throw err;
}

/**
 * Check whether two values are equal (used in non-unique deletion)
 */
export function defaultCheckValueEquality<T>(a: T, b: T) {
	return a === b;
}

export function isDef(v: any) {
	return v !== undefined;
}
