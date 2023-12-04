import { ParserNode, TemplateNode } from './types';
import { Parser } from './parser';
export declare const utilityTypes: {
    /**
     *  We can't infer type from an untyped template, but we can allow the full
     *  range of valid mustache values
     *
     *  @todo support lambdas (`function` values)
     */
    VALUE: string;
    /**
     *  Properties in a `RECORD` may be nullable but the record itself must be
     *  passed to the template
     */
    RECORD: string;
    /**
     *  A `SECTION` (inverted or otherwise)'s properties are nullable and may or
     *  may not be list types
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
    protected utilityTypesUsed: Set<"VALUE" | "RECORD" | "SECTION">;
    constructor(parsed: Parser);
    protected addCandidate(resolution: Resolution, propertyKey: string, candidate: ResolutionCandidate): void;
    protected resolveNode(id: ParserNode['id'], ns: string, children: Set<ParserNode>): void;
    protected resolveTemplate(t: TemplateNode): void;
    protected propertyString(k: string, candidates: ResolutionCandidate[]): string;
    protected resolutionToTypeString(r: Resolution): string;
    toString(): string;
}
export {};
