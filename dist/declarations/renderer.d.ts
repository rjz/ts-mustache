import { ParserNode, TemplateNode } from './types';
import { Parser } from './parser';
/**
 *  Types referenced in generated type definitions.
 */
export declare const utilityTypes: {
    /**
     *  We can't infer type from an untyped template, but we can allow the full
     *  range of valid mustache values
     */
    VALUE: string;
    /**
     *  Properties in a `RECORD` may be nullable but the record itself must be
     *  passed to the template
     */
    RECORD: string;
    /**
     *  @todo type the `render()` method in terms of the section type `T`
     */
    SECTION_LAMBDA: string;
    SECTION_OPTIONAL: string;
    /**
     *  A `SECTION` (inverted or otherwise)'s properties are nullable and may or
     *  may not be list types.
     *
     *  Note that mustache.js@4.2.0 (current at time of writing) deviates from
     *  the official spec in that lambdas must _return_ a rendering function
     *  (i.e., they will be first invoked as an "empty" lambda supplied as a
     *  `MustacheValue`) rather than implementing it themselves directly.
     *
     *  @see {@link https://github.com/rjz/ts-mustache/issues/8}
     *  @see {@link https://github.com/janl/mustache.js?tab=readme-ov-file#functions}
     *  @see {@link https://github.com/mustache/spec/blob/master/specs/~lambdas.yml}
     */
    SECTION: string;
};
type ResolutionCandidate = {
    type: 'VALUE';
} | {
    type: 'OPTIONAL';
} | {
    type: 'RECORD';
    typeName: string;
} | {
    type: 'SECTION';
    typeName: string;
} | {
    type: 'SELF';
    typeName: string;
};
export type Resolution = {
    typeName: string;
    candidates: Record<string, ResolutionCandidate[]>;
};
export type ResolutionMap = Map<ParserNode['id'], Resolution>;
export declare class Renderer {
    protected parsed: Parser;
    protected resolutions: ResolutionMap;
    protected utilityTypesUsed: Set<"VALUE" | "RECORD" | "SECTION" | "SECTION_LAMBDA" | "SECTION_OPTIONAL">;
    constructor(parsed: Parser);
    protected addCandidate(resolution: Resolution, propertyKey: string, candidate: ResolutionCandidate): void;
    protected resolveNode(id: ParserNode['id'], ns: string, children: Set<ParserNode>): void;
    protected resolveTemplate(t: TemplateNode): void;
    protected propertyString(k: string, candidates: ResolutionCandidate[]): string;
    protected resolutionToTypeString(r: Resolution): string;
    toString(): string;
}
export {};
