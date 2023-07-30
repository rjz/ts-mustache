#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
// Shim for internal compatibility
const facilities_1 = require("../facilities");
const args = (0, minimist_1.default)(process.argv.slice(2));
function usage() {
    console.log(`usage: ${process.argv[1]} --dir=<template dir> -o ./templates.ts`);
    process.exit(2);
}
if (args.h || !args.dir || !args.o) {
    usage();
}
const loader = new facilities_1.DefaultLoader({ dir: args.dir });
const declarer = new facilities_1.Declarer(loader);
declarer.declare().then((d) => {
    if (args.o) {
        fs_1.default.writeFileSync(args.o, d);
    }
    else {
        console.log(d);
    }
    process.exit(0);
});
//# sourceMappingURL=declarations.js.map