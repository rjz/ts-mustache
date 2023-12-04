import * as M from 'mustache'
import * as Graph from 'ts-directed-graph'
import { SpanType, ParserNode, ValueNode } from './types'

function joinId(prefix: string, name: string): string {
  return [prefix, name].join('_')
}

/**
 * Technically mustache supports cyclic resolution at runtime. This library
 * isn't subtle enough to deal with it (at least for now)
 */
export class Parser extends Graph.DirectedAcyclicGraph<ParserNode> {
  protected _templates: string[] = []

  get templates(): readonly string[] {
    return Object.freeze([...this._templates])
  }

  protected ensureChild<T extends ParserNode>(
    parentNode: ParserNode,
    node: T,
  ): T {
    const { id } = node
    if (!this.has(id)) {
      this.addNode(node)
    }

    this.addEdge(parentNode.id, id)

    return this.getNode(id) as T
  }

  protected ensureValue(parentNode: ParserNode, name: string): ValueNode {
    return this.ensureChild(parentNode, {
      id: joinId(parentNode.id, name),
      type: 'VALUE',
      propertyKey: name,
    })
  }

  /**
   * @todo handle bracket notation (`foo['bar']`) as well?
   * @todo handle lambdas
   */
  protected mergeValue(parentNode: ParserNode, fullName: string): void {
    if (fullName === '.' && parentNode.type === 'SECTION') {
      this.ensureValue(parentNode, '.')
      return
    }

    const [name, ...parts] = fullName.split('.')

    const node = this.ensureValue(parentNode, name)

    if (parts.length > 0) {
      this.mergeValue(node, parts.join('.'))
    }
  }

  /**
   * @todo handle case of partial merged inside section. The current approach
   *       depends on ambient data feeding the partial (which will work for
   *       many templates data/models) but `{{#users}}{>_profile}}{{/users}}`
   *       may not resolve correctly
   */
  protected mergePartial(parentNode: ParserNode, name: string) {
    this.ensureChild(parentNode, {
      id: name,
      type: 'TEMPLATE',
      propertyKey: name,
    })
  }

  protected mergeSection(
    parentNode: ParserNode,
    fullName: string,
    spans: M.TemplateSpans,
  ): void {
    const [name, ...parts] = fullName.split('.')

    if (parts.length > 0) {
      const node = this.ensureValue(parentNode, name)
      this.mergeSection(node, parts.join('.'), spans)
      return
    }

    const node = this.ensureChild(parentNode, {
      id: joinId(parentNode.id, name),
      type: 'SECTION',
      propertyKey: name,
    })

    this.mergeSpans(node, spans)
  }

  protected mergeSpans(parentNode: ParserNode, spans: M.TemplateSpans) {
    for (const span of spans) {
      const [type, name, ...params] = span

      const t: M.TemplateSpanType = type
      switch (t) {
        case SpanType.ESCAPED_VALUE:
        case SpanType.UNESCAPED_VALUE:
          this.mergeValue(parentNode, name)
          break
        case SpanType.PARTIAL:
          this.mergePartial(parentNode, name)
          break
        case SpanType.SECTION:
        case SpanType.INVERTED:
          if (!Array.isArray(params[2])) {
            // We're really just coercing types. If you're hitting this,
            // Mustache's parsing API has been updated in an unexpected way.
            throw new Error('Missing spans for section')
          }

          this.mergeSection(parentNode, name, params[2])
          break
        case SpanType.COMMENT:
        case SpanType.EQUAL:
        case SpanType.RAW_VALUE:
          break
      }
    }
  }

  addTemplate(templateName: string, spans: M.TemplateSpans) {
    const root = {
      type: 'TEMPLATE',
      id: templateName,
      propertyKey: templateName,
    } as const

    // a `TemplateNode` may already exist from a `PARTIAL` seen previously in
    // another template
    if (!this.has(root.id)) {
      this.addNode(root)
    }

    this.mergeSpans(root, spans)

    this._templates.push(templateName)
  }
}
