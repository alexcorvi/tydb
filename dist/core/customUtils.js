"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lut = [];
for (let i = 0; i < 256; i++) {
    lut[i] = (i < 16 ? "0" : "") + i.toString(16);
}
function uid() {
    let d0 = (Math.random() * 0xffffffff) | 0;
    let d1 = (Math.random() * 0xffffffff) | 0;
    let d2 = (Math.random() * 0xffffffff) | 0;
    let d3 = (Math.random() * 0xffffffff) | 0;
    return (lut[d0 & 0xff] +
        lut[(d0 >> 8) & 0xff] +
        lut[(d0 >> 16) & 0xff] +
        lut[(d0 >> 24) & 0xff] +
        "-" +
        lut[d1 & 0xff] +
        lut[(d1 >> 8) & 0xff] +
        "-" +
        lut[((d1 >> 16) & 0x0f) | 0x40] +
        lut[(d1 >> 24) & 0xff] +
        "-" +
        lut[(d2 & 0x3f) | 0x80] +
        lut[(d2 >> 8) & 0xff] +
        "-" +
        lut[(d2 >> 16) & 0xff] +
        lut[(d2 >> 24) & 0xff] +
        lut[d3 & 0xff] +
        lut[(d3 >> 8) & 0xff] +
        lut[(d3 >> 16) & 0xff] +
        lut[(d3 >> 24) & 0xff]);
}
exports.uid = uid;
function randomString(len) {
    return Array.from(new Uint8Array(120))
        .map((x) => Math.random().toString(36))
        .join("")
        .split("0.")
        .join("")
        .substr(0, len);
}
exports.randomString = randomString;
/**
 * Return an array with the numbers from 0 to n-1, in a random order
 */
function getRandomArray(n) {
    let res = [];
    for (let index = 0; index < n; index++) {
        res.push(index);
    }
    res.sort(() => Math.random());
    return res;
}
exports.getRandomArray = getRandomArray;