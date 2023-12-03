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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const Graph = __importStar(require("ts-directed-graph"));
const types_1 = require("./types");
function joinId(prefix, name) {
    return [prefix, name].join('_');
}
/**
 * Technically mustache supports cyclic resolution at runtime. This library
 * isn't subtle enough to deal with it (at least for now)
 */
class Parser extends Graph.DirectedAcyclicGraph {
    constructor() {
        super(...arguments);
        this._templates = [];
    }
    get templates() {
        return Object.freeze([...this._templates]);
    }
    ensureChild(parentNode, node) {
        const { id } = node;
        if (!this.has(id)) {
            this.addNode(node);
        }
        this.addEdge(parentNode.id, id);
        return this.getNode(id);
    }
    ensureValue(parentNode, name) {
        return this.ensureChild(parentNode, {
            id: joinId(parentNode.id, name),
            type: 'VALUE',
            propertyKey: name,
        });
    }
    /**
     * @todo handle bracket notation (`foo['bar']`) as well?
     * @todo handle lambdas
     */
    mergeValue(parentNode, fullName) {
        if (fullName === '.' && parentNode.type === 'SECTION') {
            this.ensureValue(parentNode, '.');
            return;
        }
        const [name, ...parts] = fullName.split('.');
        const node = this.ensureValue(parentNode, name);
        if (parts.length > 0) {
            this.mergeValue(node, parts.join('.'));
        }
    }
    /**
     * @todo handle case of partial merged inside section. The current approach
     *       depends on ambient data feeding the partial (which will work for
     *       many templates data/models) but `{{#users}}{>_profile}}{{/users}}`
     *       may not resolve correctly
     */
    mergePartial(parentNode, name) {
        this.ensureChild(parentNode, {
            id: name,
            type: 'TEMPLATE',
            propertyKey: name,
        });
    }
    mergeSection(parentNode, fullName, spans) {
        const [name, ...parts] = fullName.split('.');
        if (parts.length > 0) {
            const node = this.ensureValue(parentNode, name);
            this.mergeSection(node, parts.join('.'), spans);
            return;
        }
        const node = this.ensureChild(parentNode, {
            id: joinId(parentNode.id, name),
            type: 'SECTION',
            propertyKey: name,
        });
        this.mergeSpans(node, spans);
    }
    mergeSpans(parentNode, spans) {
        for (const span of spans) {
            const [type, name, ...params] = span;
            const t = type;
            switch (t) {
                case types_1.SpanType.ESCAPED_VALUE:
                case types_1.SpanType.UNESCAPED_VALUE:
                    this.mergeValue(parentNode, name);
                    break;
                case types_1.SpanType.PARTIAL:
                    this.mergePartial(parentNode, name);
                    break;
                case types_1.SpanType.SECTION:
                case types_1.SpanType.INVERTED:
                    if (!Array.isArray(params[2])) {
                        // We're really just coercing types. If you're hitting this,
                        // Mustache's parsing API has been updated in an unexpected way.
                        throw new Error('Missing spans for section');
                    }
                    this.mergeSection(parentNode, name, params[2]);
                    break;
                case types_1.SpanType.COMMENT:
                case types_1.SpanType.EQUAL:
                case types_1.SpanType.RAW_VALUE:
                    break;
            }
        }
    }
    addTemplate(templateName, spans) {
        const root = {
            type: 'TEMPLATE',
            id: templateName,
            propertyKey: templateName,
        };
        // a `TemplateNode` may already exist from a `PARTIAL` seen previously in
        // another template
        if (!this.has(root.id)) {
            this.addNode(root);
        }
        this.mergeSpans(root, spans);
        this._templates.push(templateName);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map