import * as M from 'mustache'

export type FileMap = Record<string, string>

export const SpanType: Record<string, M.TemplateSpanType> = Object.freeze({
  RAW_VALUE: 'text',
  ESCAPED_VALUE: 'name',
  UNESCAPED_VALUE: '&',
  SECTION: '#',
  INVERTED: '^',
  COMMENT: '!',
  PARTIAL: '>',
  EQUAL: '=',
})

export type TemplateNode = {
  type: 'TEMPLATE'
  id: string
  propertyKey: string
}

export type ValueNode = {
  type: 'VALUE'
  id: string
  propertyKey: string
}

export type SectionNode = {
  type: 'SECTION'
  id: string
  propertyKey: string
}

export type ParserNode = ValueNode | SectionNode | TemplateNode

export class ExhaustiveCheckError<T> extends TypeError {
  public instance: T

  public readonly isUnexpected = true

  constructor(msg: string, instance: T) {
    super(msg)
    this.instance = instance
  }
}

export function assertExhaustiveCheck(x: never): never {
  throw new ExhaustiveCheckError('Variation unhandled', x)
}
