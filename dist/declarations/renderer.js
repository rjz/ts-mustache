"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = exports.utilityTypes = void 0;
const types_1 = require("./types");
exports.utilityTypes = {
    /**
     *  We can't infer type from an untyped template, but we can allow the full
     *  range of valid mustache values
     *
     *  @todo support lambdas (`function` values)
     */
    VALUE: 'type MustacheValue = string | number | boolean',
    /**
     *  Properties in a `RECORD` may be nullable but the record itself must be
     *  passed to the template
     */
    RECORD: 'type MustacheRecord<T> = T',
    /**
     *  A `SECTION` (inverted or otherwise)'s properties are nullable and may or
     *  may not be list types
     */
    SECTION: 'type MustacheSection<T> = T[] | T',
};
function upperFirst(str) {
    return str[0].toUpperCase() + str.slice(1);
}
function namespaceFor(t) {
    return upperFirst(t.propertyKey).replace(/[^a-z0-9_]+/gi, '_');
}
class Renderer {
    constructor(parsed) {
        this.parsed = parsed;
        this.resolutions = new Map();
        this.utilityTypesUsed = new Set();
    }
    addCandidate(resolution, propertyKey, candidate) {
        if (!resolution.candidates[propertyKey]) {
            resolution.candidates[propertyKey] = [];
        }
        resolution.candidates[propertyKey].push(candidate);
    }
    resolveNode(id, ns, children) {
        let resolution = this.resolutions.get(id);
        if (!resolution) {
            resolution = {
                typeName: ns,
                candidates: {},
            };
            // Make this immediately available to recursive calls
            this.resolutions.set(id, resolution);
        }
        for (const c of children) {
            switch (c.type) {
                case 'SECTION': {
                    this.resolveNode(c.id, [ns, upperFirst(c.propertyKey)].join(''), this.parsed.edgesFrom(c.id));
                    const section = this.resolutions.get(c.id);
                    if (Object.keys(section.candidates).length === 0) {
                        this.addCandidate(resolution, c.propertyKey, { type: 'OPTIONAL' });
                        this.resolutions.delete(c.id);
                    }
                    else {
                        this.addCandidate(resolution, c.propertyKey, {
                            type: 'SECTION',
                            typeName: section.typeName,
                        });
                    }
                    break;
                }
                case 'VALUE': {
                    const edges = this.parsed.edgesFrom(c.id);
                    if (edges.size === 0) {
                        this.addCandidate(resolution, c.propertyKey, { type: 'VALUE' });
                    }
                    else {
                        this.resolveNode(c.id, [ns, upperFirst(c.propertyKey)].join(''), edges);
                        this.addCandidate(resolution, c.propertyKey, {
                            type: 'RECORD',
                            typeName: this.resolutions.get(c.id).typeName,
                        });
                    }
                    break;
                }
                case 'TEMPLATE': {
                    // We're just going to merge it right into the current node.
                    const partialEdges = this.parsed.edgesFrom(c.id);
                    this.resolveNode(id, ns, partialEdges);
                    break;
                }
                default:
                    (0, types_1.assertExhaustiveCheck)(c);
            }
        }
        this.resolutions.set(id, resolution);
    }
    resolveTemplate(t) {
        const ns = namespaceFor(t);
        const children = this.parsed.edgesFrom(t.id);
        this.resolveNode(t.id, ns, children);
    }
    propertyString(k, candidates) {
        let isOptional = false;
        const cs = [];
        for (const c of candidates) {
            switch (c.type) {
                case 'RECORD':
                    cs.push(`MustacheRecord<${c.typeName}>`);
                    this.utilityTypesUsed.add(c.type);
                    break;
                case 'SECTION':
                    isOptional = true;
                    cs.push(`MustacheSection<${c.typeName}>`); // | MustacheValue
                    this.utilityTypesUsed.add(c.type);
                    break;
                case 'VALUE':
                    cs.push(`MustacheValue`);
                    this.utilityTypesUsed.add(c.type);
                    break;
                case 'OPTIONAL':
                    isOptional = true;
                    cs.push(`MustacheValue`);
                    this.utilityTypesUsed.add('VALUE');
                    break;
                default:
                    (0, types_1.assertExhaustiveCheck)(c);
            }
        }
        return `  ${k}${isOptional ? '?' : ''}: ${Array.from(new Set(cs)).join(' & ')}`;
    }
    resolutionToTypeString(r) {
        const entries = Object.entries(r.candidates);
        const propStr = entries.length === 0
            ? ''
            : ['', ...entries.map(([k, p]) => this.propertyString(k, p)), ''].join('\n');
        return `interface ${r.typeName} {${propStr}}`;
    }
    toString() {
        const templateMap = {};
        const templatesVisited = new Set();
        for (const n of this.parsed.nodes()) {
            if (n.type === 'TEMPLATE') {
                this.resolveTemplate(n);
                templateMap[n.id] = this.resolutions.get(n.id).typeName;
                templatesVisited.add(n.id);
            }
        }
        // Sanity check: ensure that any partials referenced were actually supplied
        // to the parser and rendered
        const parsedTemplates = this.parsed.templates;
        for (const t of templatesVisited) {
            if (!parsedTemplates.includes(t)) {
                throw new Error(`Unknown template: ${t}`);
            }
        }
        const output = [];
        for (const r of this.resolutions.values()) {
            output.push(this.resolutionToTypeString(r));
        }
        const utilities = [];
        for (const [k, v] of Object.entries(exports.utilityTypes)) {
            if (this.utilityTypesUsed.has(k)) {
                utilities.push(v);
            }
        }
        output.unshift(...utilities);
        output.push(`export type TemplateMap = {\n${Object.entries(templateMap)
            .map(([k, v]) => `  '${k}': ${v},`)
            .join('\n')}\n}`, 'export type TemplateName = keyof TemplateMap', `export const TEMPLATES = [\n${Object.keys(templateMap)
            .map((k) => `  '${k}',`)
            .join('\n')}\n] as const`);
        return output.join('\n\n');
    }
}
exports.Renderer = Renderer;
//# sourceMappingURL=renderer.js.map