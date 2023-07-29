import * as M from 'mustache';
export type FileMap = Record<string, string>;
export declare const SpanType: Record<string, M.TemplateSpanType>;
export type TemplateNode = {
    type: 'TEMPLATE';
    id: string;
    propertyKey: string;
};
export type ValueNode = {
    type: 'VALUE';
    id: string;
    propertyKey: string;
};
export type SectionNode = {
    type: 'SECTION';
    id: string;
    propertyKey: string;
};
export type ParserNode = ValueNode | SectionNode | TemplateNode;
export declare class ExhaustiveCheckError<T> extends TypeError {
    instance: T;
    readonly isUnexpected = true;
    constructor(msg: string, instance: T);
}
export declare function assertExhaustiveCheck(x: never): never;
