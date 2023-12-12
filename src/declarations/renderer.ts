import { ParserNode, TemplateNode, assertExhaustiveCheck } from './types'
import { Parser } from './parser'

/**
 *  Types referenced in generated type definitions.
 */
export const utilityTypes = {
  /**
   *  We can't infer type from an untyped template, but we can allow the full
   *  range of valid mustache values
   */
  VALUE:
    'type MustacheValue = string | number | boolean | (() => MustacheValue)',

  /**
   *  Properties in a `RECORD` may be nullable but the record itself must be
   *  passed to the template
   */
  RECORD: 'type MustacheRecord<T> = T',

  /**
   *  @todo type the `render()` method in terms of the section type `T`
   */
  SECTION_LAMBDA: `/**
 *  Placeholder for evaluating a lambda invoked as a Section value.
 *
 *  @see {@link https://github.com/mustache/spec/blob/master/specs/~lambdas.yml}
 */
interface MustacheSectionLambda<T> {
  (template: string, render: (...args: any[]) => string): string
}`,

  SECTION_OPTIONAL:
    'type MustacheSectionOptional = MustacheValue | MustacheSectionLambda<any>',

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
  SECTION: `type MustacheSection<T> = T[] | T | () => MustacheSectionLambda<T>`,
}

type UtilityType = keyof typeof utilityTypes

type ResolutionCandidate =
  | { type: 'VALUE' }
  | { type: 'OPTIONAL' }
  | { type: 'RECORD'; typeName: string }
  | { type: 'SECTION'; typeName: string }
  | { type: 'SELF'; typeName: string }

export type Resolution = {
  typeName: string
  candidates: Record<string, ResolutionCandidate[]>
}

export type ResolutionMap = Map<ParserNode['id'], Resolution>

function upperFirst(str: string): string {
  return str[0].toUpperCase() + str.slice(1)
}

function namespaceFor(t: TemplateNode): string {
  return upperFirst(t.propertyKey).replace(/[^a-z0-9_]+/gi, '_')
}

export class Renderer {
  protected resolutions: ResolutionMap = new Map()
  protected utilityTypesUsed = new Set<UtilityType>()

  constructor(protected parsed: Parser) {}

  protected addCandidate(
    resolution: Resolution,
    propertyKey: string,
    candidate: ResolutionCandidate,
  ): void {
    if (!resolution.candidates[propertyKey]) {
      resolution.candidates[propertyKey] = []
    }

    resolution.candidates[propertyKey].push(candidate)
  }

  protected resolveNode(
    id: ParserNode['id'],
    ns: string,
    children: Set<ParserNode>,
  ) {
    let resolution = this.resolutions.get(id)
    if (!resolution) {
      resolution = {
        typeName: ns,
        candidates: {},
      }

      // Make this immediately available to recursive calls
      this.resolutions.set(id, resolution)
    }

    for (const c of children) {
      switch (c.type) {
        case 'SECTION': {
          this.resolveNode(
            c.id,
            [ns, upperFirst(c.propertyKey)].join(''),
            this.parsed.edgesFrom(c.id),
          )

          const section = this.resolutions.get(c.id)!
          if (Object.keys(section.candidates).length === 0) {
            this.addCandidate(resolution, c.propertyKey, { type: 'OPTIONAL' })
            this.resolutions.delete(c.id)
          } else {
            this.addCandidate(resolution, c.propertyKey, {
              type: 'SECTION',
              typeName: section.typeName,
            })
          }

          break
        }
        case 'VALUE': {
          const edges = this.parsed.edgesFrom(c.id)
          if (edges.size === 0) {
            if (c.propertyKey === '.') {
              this.addCandidate(resolution, c.propertyKey, {
                type: 'SELF',
                typeName: c.id,
              })
            } else {
              this.addCandidate(resolution, c.propertyKey, { type: 'VALUE' })
            }
          } else {
            this.resolveNode(
              c.id,
              [ns, upperFirst(c.propertyKey)].join(''),
              edges,
            )

            this.addCandidate(resolution, c.propertyKey, {
              type: 'RECORD',
              typeName: this.resolutions.get(c.id)!.typeName,
            })
          }
          break
        }
        case 'TEMPLATE': {
          // We're just going to merge it right into the current node.
          const partialEdges = this.parsed.edgesFrom(c.id)
          this.resolveNode(id, ns, partialEdges)
          break
        }
        default:
          assertExhaustiveCheck(c)
      }
    }

    this.resolutions.set(id, resolution)
  }

  protected resolveTemplate(t: TemplateNode) {
    const ns = namespaceFor(t)
    const children = this.parsed.edgesFrom(t.id)
    this.resolveNode(t.id, ns, children)
  }

  protected propertyString(
    k: string,
    candidates: ResolutionCandidate[],
  ): string {
    let isOptional = false
    const cs: string[] = []
    for (const c of candidates) {
      switch (c.type) {
        case 'RECORD':
          cs.push(`MustacheRecord<${c.typeName}>`)
          this.utilityTypesUsed.add(c.type)
          break
        case 'SECTION':
          isOptional = true
          cs.push(`MustacheSection<${c.typeName}>`) // | MustacheValue
          this.utilityTypesUsed.add('SECTION_LAMBDA')
          this.utilityTypesUsed.add('SECTION')
          break
        case 'VALUE':
          cs.push(`MustacheValue`)
          this.utilityTypesUsed.add('VALUE')
          break
        case 'SELF':
          return '  // self-reference ({{.}}) intentionally left blank'
          break
        case 'OPTIONAL':
          isOptional = true
          cs.push(`MustacheSectionOptional`)
          this.utilityTypesUsed.add('VALUE')
          this.utilityTypesUsed.add('SECTION_LAMBDA')
          this.utilityTypesUsed.add('SECTION_OPTIONAL')
          break
        default:
          assertExhaustiveCheck(c)
      }
    }

    return `  ${k}${isOptional ? '?' : ''}: ${Array.from(new Set(cs)).join(
      ' & ',
    )}`
  }

  protected resolutionToTypeString(r: Resolution): string {
    const entries = Object.entries(r.candidates)

    let propStr = ''

    if (entries.length > 0) {
      if (entries.every(([k, ps]) => ps.every((p) => p.type === 'SELF'))) {
        return `type ${r.typeName} = MustacheValue`
      }

      propStr = [
        '',
        ...entries.map(([k, p]) => this.propertyString(k, p)),
        '',
      ].join('\n')
    }

    return `interface ${r.typeName} {${propStr}}`
  }

  toString(): string {
    const templateMap: Record<string, string> = {}

    const templatesVisited = new Set<string>()

    for (const n of this.parsed.nodes()) {
      if (n.type === 'TEMPLATE') {
        this.resolveTemplate(n)
        templateMap[n.id] = this.resolutions.get(n.id)!.typeName
        templatesVisited.add(n.id)
      }
    }

    // Sanity check: ensure that any partials referenced were actually supplied
    // to the parser and rendered
    const parsedTemplates = this.parsed.templates
    for (const t of templatesVisited) {
      if (!parsedTemplates.includes(t)) {
        throw new Error(`Unknown template: ${t}`)
      }
    }

    const output: string[] = []
    for (const r of this.resolutions.values()) {
      output.push(this.resolutionToTypeString(r))
    }

    const utilities: string[] = []
    for (const [k, v] of Object.entries(utilityTypes)) {
      if (this.utilityTypesUsed.has(k as UtilityType)) {
        utilities.push(v)
      }
    }

    output.unshift(...utilities)

    output.push(
      `export type TemplateMap = {\n${Object.entries(templateMap)
        .map(([k, v]) => `  '${k}': ${v},`)
        .join('\n')}\n}`,

      'export type TemplateName = keyof TemplateMap',

      `export const TEMPLATES = [\n${Object.keys(templateMap)
        .map((k) => `  '${k}',`)
        .join('\n')}\n] as const`,
    )

    return output.join('\n\n')
  }
}
