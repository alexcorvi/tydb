"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const customUtils = require("../core/customUtils");
class BaseModel {
    constructor() {
        this._id = customUtils.uid();
    }
    static new(data) {
        const instance = new this();
        const keys = Object.keys(data);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            instance[key] = data[key];
        }
        return instance;
    }
}
exports.BaseModel = BaseModel;
