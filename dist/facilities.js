"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Declarer = exports.Renderer = exports.DefaultLoader = void 0;
const assert_1 = __importDefault(require("assert"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mustache_1 = __importDefault(require("mustache"));
const glob_1 = require("glob");
const Declarations = __importStar(require("./declarations"));
const MUSTACHE_EXTENSION = '.mustache';
class DefaultLoader {
    constructor(opts) {
        this.opts = { ...DefaultLoader.DefaultOptions, ...opts };
    }
    async fsLoad() {
        const { dir, files: fileGlob } = this.opts;
        const files = await (0, glob_1.glob)(path_1.default.join(dir, fileGlob));
        const contents = await Promise.all(files.map((f) => fs_1.default.promises.readFile(f, { encoding: 'utf8' })));
        return Object.fromEntries(files.map((f, i) => [DefaultLoader.templateKey(dir, f), contents[i]])) /* We could validate these, but don't */;
    }
    load() {
        const { cacheTemplates } = this.opts;
        if (cacheTemplates && this.cache) {
            return this.cache;
        }
        const state = this.fsLoad();
        if (cacheTemplates) {
            this.cache = state;
        }
        return state;
    }
    static templateKey(dir, filename) {
        return path_1.default.relative(dir, filename).replace(MUSTACHE_EXTENSION, '');
    }
}
exports.DefaultLoader = DefaultLoader;
DefaultLoader.DefaultOptions = {
    files: `**/*${MUSTACHE_EXTENSION}`,
    cacheTemplates: false,
};
class Renderer {
    constructor(loader) {
        this.loader = loader;
    }
    async render(templateName, params) {
        const templates = await this.loader.load();
        const template = templates[templateName];
        (0, assert_1.default)(template, `Unknown template '${String(templateName)}'`);
        return mustache_1.default.render(template, params, templates);
    }
}
exports.Renderer = Renderer;
class Declarer {
    constructor(loader) {
        this.loader = loader;
    }
    async declare() {
        const templates = await this.loader.load();
        const p = new Declarations.Parser();
        for (const [k, t] of Object.entries(templates)) {
            try {
                p.addTemplate(k, mustache_1.default.parse(t));
            }
            catch (e) {
                console.log(`Failed parsing template "${k}"`);
                throw e;
            }
        }
        const t = new Declarations.Renderer(p);
        return t.toString();
    }
}
exports.Declarer = Declarer;
//# sourceMappingURL=facilities.js.map