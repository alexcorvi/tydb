import { customUtils } from "../../src/core";
import { should, use } from "chai";
import * as asPromised from "chai-as-promised";
import * as _ from "underscore";
use(asPromised);
should();

describe("customUtils", () => {
	describe("uid", () => {
		// Very small probability of conflict
		it("Generated uids should not be the same", () => {
			customUtils.uid().should.not.equal(customUtils.uid());
		});

		it("Generated random strings should not be the same", () => {
			customUtils
				.randomString(56)
				.should.not.equal(customUtils.randomString(56));
		});
	});
});
