/**
 * Return an array with the numbers from 0 to n-1, in a random order
 */
export function getRandomArray(n: number) {
	let res: number[] = [];
	for (let index = 0; index < n; index++) {
		res.push(index);
	}
	res.sort(() => Math.random());
	return res;
}

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
