import mustache from 'mustache'
import { Parser } from './parser'

function parse(template: string) {
  const parser = new Parser()

  parser.addTemplate('test', mustache.parse(template))

  return parser
}

describe('Parser', function () {
  describe('SECTIONs', function () {
    it('an empty section is still resolved as a SECTION', function () {
      const parser = parse('{{#foo}}nothing to see here{{/foo}}')
      expect(parser.getNode('test_foo').type).toEqual('SECTION')
    })
  })
})
