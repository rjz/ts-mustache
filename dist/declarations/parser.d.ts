import * as M from 'mustache';
import * as Graph from 'ts-directed-graph';
import { ParserNode, ValueNode } from './types';
/**
 * Technically mustache supports cyclic resolution at runtime. This library
 * isn't subtle enough to deal with it (at least for now)
 */
export declare class Parser extends Graph.DirectedAcyclicGraph<ParserNode> {
    protected _templates: string[];
    get templates(): readonly string[];
    protected ensureChild<T extends ParserNode>(parentNode: ParserNode, node: T): T;
    protected ensureValue(parentNode: ParserNode, name: string): ValueNode;
    /**
     * @todo handle bracket notation (`foo['bar']`) as well?
     */
    protected mergeValue(parentNode: ParserNode, fullName: string): void;
    /**
     * @todo handle case of partial merged inside section. The current approach
     *       depends on ambient data feeding the partial (which will work for
     *       many templates data/models) but `{{#users}}{>_profile}}{{/users}}`
     *       may not resolve correctly
     */
    protected mergePartial(parentNode: ParserNode, name: string): void;
    protected mergeSection(parentNode: ParserNode, fullName: string, spans: M.TemplateSpans): void;
    protected mergeSpans(parentNode: ParserNode, spans: M.TemplateSpans): void;
    addTemplate(templateName: string, spans: M.TemplateSpans): void;
}
