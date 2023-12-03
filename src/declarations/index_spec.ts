import mustache from 'mustache'

import { Parser } from './parser'
import { Renderer } from './renderer'

describe('"end-to-end" tests', function () {
  const TEST_PARTIAL = `{{name}} is {{age}} years old`

  const TEST_NAMETAG = `
    {{#person}}{{> _person}}{{/person}} or {{name}} it shouldn't matter
  `

  const TEST_PROFILE = `
  {{> _person}}'s profile
`

  it('works', function () {
    const p = new Parser()
    p.addTemplate('_person', mustache.parse(TEST_PARTIAL))
    p.addTemplate('nametag', mustache.parse(TEST_NAMETAG))
    p.addTemplate('profile', mustache.parse(TEST_PROFILE))

    const t = new Renderer(p)
    const actual = t.toString()

    expect(actual).toMatchSnapshot()
  })

  it('handles nested properties', function () {
    const p = new Parser()
    p.addTemplate('test', mustache.parse('{{ foo.bar }}'))

    const t = new Renderer(p)
    const actual = t.toString()

    expect(actual).toMatchSnapshot()
  })

  it('handles nested properties in sections', function () {
    const p = new Parser()
    p.addTemplate(
      'test',
      mustache.parse('{{# foo.bar }} {{pleaseDontButOk}} {{/ foo.bar}}'),
    )

    const t = new Renderer(p)
    const actual = t.toString()

    expect(actual).toMatchSnapshot()
  })

  describe('self references', function () {
    it('special-cases when an item is _only_ self-referential', function () {
      const p = new Parser()
      p.addTemplate('test', mustache.parse(`{{#items}}{{{.}}}{{/items}}`))

      const t = new Renderer(p)
      const actual = t.toString()

      expect(actual).toMatchSnapshot()
    })

    it('also handles when a self-reference has a sibling property', function () {
      const p = new Parser()
      p.addTemplate(
        'test',
        mustache.parse(`{{#items}}{{length}}{{{.}}}{{/items}}`),
      )

      const t = new Renderer(p)
      const actual = t.toString()

      expect(actual).toMatchSnapshot()
    })
  })
})
