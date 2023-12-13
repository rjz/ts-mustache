import mustache from 'mustache'
import { Parser } from './parser'
import { Resolution, Renderer } from './renderer'

class TestWriter extends Renderer {
  get resolutionMap() {
    return this.resolutions
  }

  findTypeName(typeName: string): Resolution {
    for (const [k, v] of this.resolutions) {
      if (v.typeName === typeName) {
        return v
      }
    }

    throw new Error(`Type "${typeName}" isn't resolved`)
  }

  static resolve(templates: Record<string, string>): TestWriter {
    const parsed = new Parser()

    Object.entries(templates).forEach(([name, template]) => {
      parsed.addTemplate(name, mustache.parse(template))
    })

    const w = new TestWriter(parsed)

    for (const n of parsed.nodes()) {
      if (n.type === 'TEMPLATE') {
        w.resolveTemplate(n)
      }
    }

    return w
  }
}

describe('Parser', function () {
  describe('references', function () {
    it('resolves scalar', function () {
      const template = 'Hello, {{ name }}'
      const w = TestWriter.resolve({ template })
      const templateResolution = w.findTypeName('Template')
      expect(templateResolution.candidates).toEqual({
        name: [{ type: 'VALUE' }],
      })
    })

    it('resolves object reference', function () {
      const template = 'Hello, {{ person.name }}'
      const w = TestWriter.resolve({ template })
      const templateResolution = w.findTypeName('Template')
      expect(templateResolution.candidates).toEqual({
        person: [{ type: 'RECORD', typeName: 'TemplatePerson' }],
      })

      const personResolution = w.findTypeName('TemplatePerson')
      expect(personResolution.candidates).toEqual({
        name: [{ type: 'VALUE' }],
      })
    })
  })

  describe('sections', function () {
    it('resolves object reference', function () {
      const template = '{{#users}}{{name}}{{/users}}'

      const w = TestWriter.resolve({ template })
      const templateResolution = w.findTypeName('Template')

      expect(templateResolution.candidates).toEqual({
        users: [{ type: 'SECTION', typeName: 'TemplateUsers' }],
      })

      const usersResolution = w.findTypeName('TemplateUsers')
      expect(usersResolution.candidates).toEqual({
        name: [{ type: 'VALUE' }],
      })
    })

    it('treats empty sections as SECTIONs', function () {
      const template = '{{#lambda}}nothing to see here but content{{/lambda}}'

      const w = TestWriter.resolve({ template })
      const templateResolution = w.findTypeName('Template')

      expect(templateResolution.candidates).toEqual({
        lambda: [{ type: 'OPTIONAL' }],
      })
    })

    it('resolves conflicting hints', function () {
      const template = `
        {{^users.length}}no users{{/users.length}}
        {{#users}}
          Hello, {{name}}
        {{/users}}
      `

      const w = TestWriter.resolve({ template })
      const templateResolution = w.findTypeName('Template')

      expect(templateResolution.candidates).toEqual({
        users: [{ type: 'RECORD', typeName: 'TemplateUsers' }],
      })

      const usersResolution = w.findTypeName('TemplateUsers')
      expect(usersResolution.candidates).toEqual({
        length: [{ type: 'OPTIONAL' }],
        name: [{ type: 'VALUE' }],
      })
    })
  })

  describe('partials', function () {
    it('resolves partial at root', function () {
      const _profile = '{{person.name}}'
      const template = '{{>_profile}}'

      const w = TestWriter.resolve({ template, _profile })

      const templateResolution = w.findTypeName('Template')
      w.findTypeName('_profile') // no throw == passing test!

      expect(templateResolution.candidates).toEqual({
        person: [{ type: 'RECORD', typeName: 'TemplatePerson' }],
      })
    })

    /**
     * @todo decide how (whether?) to merge nested partials into section and/or
     *       top-level types
     */
    xit('resolves partial inside nested sections', function () {
      const _profile = '{{person.name}}'
      const template =
        '{{#org}}{{#users}}{{>_profile}}{{foo.bar}}{{/users}}{{/org}}'

      const w = TestWriter.resolve({ template, _profile })
      const templateResolution = w.findTypeName('Template')

      // Hoists to top level, too?
      expect(templateResolution.candidates).toEqual({
        org: [{ type: 'SECTION', typeName: 'TemplateOrg' }],
        person: [{ type: 'RECORD', typeName: 'TemplatePerson' }],
      })
    })

    it('throws before generating type with broken reference', function () {
      const template = '{{> missing_partial}}'
      const w = TestWriter.resolve({ template })
      expect(() => w.toString()).toThrow()
    })
  })

  describe('full tests', function () {
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
  })
})
