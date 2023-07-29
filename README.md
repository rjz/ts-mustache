# ts-mustache

[Mustache][mustache] is a pretty good templating libary, but it doesn't play
well with TypeScript. `ts-mustache` makes it better, adding:

1. type inference from existing Mustache templates
2. facilities for declaring types and rendering templates

## Test

```sh
$ npm i
$ npm test
```

## Usage

```ts
import { DefaultLoader, Definer, Renderer } from 'ts-mustache'

const loader = new DefaultLoader({
dir: './templates',
})

// Generate typedefs
const declarer = new Declarer(loader)
declarer.declare()
.then(types => fs.writeFileSync('./mustacheTypes.ts', types)
```

Once types exist, the `Renderer` class provides a convenient way to use them:

```ts
import { TemplateMap } from './mustacheTypes'

const renderer = new Renderer<TemplateMap>(loader)

renderer.render('post', { title: 'Foobar' })
```

## Philosophy

Mustache goes to heroic efforts to resolve and/or handle missing data at
runtime, recursing through previously-seen context to attempt to fill in
references with _something_. Further, a template like `{{ x }}` implies that
a variable called `name` is expected, but nothing about its type (integer?
string? vegetable? mineral?) or nullability. Clearly, indeterminate behavior
makes inference a challenge.

The `Definer` class in this library attempts an imperfect balancing act between
overly-restrictive and so-broad-as-to-be-functionally-useless type declarations
based on the [Mustache spec][mustache] and common usage patterns seen in the
wild.

Using `ts-mustache` with an existing template library is likely to turn
up some cases where types can't be neatly inferred.

```
{{#items.length}}
<ul>
  {{#items}}
  <li>{{name}}</li>
  {{/items}}
</ul>
{{/items.length}}
```

A JavaScript programmer will easily recognize that the `{{ items }}` referenced
in the template likely correspond to an array, and that the template is using
type coercion from `items.length` to skip rendering an empty array.

This library isn't that smart.

Fortunately, most of these cases can be resolved by tweaking how data are
prepared--and type-checking will make these changes relatively safe to enact!

```ts
const templateData = {
  arr: items.length ? items : undefined
}
```

```
{{#arr}}
<ul>
  {{#items}}
  <li>{{name}}</li>
  {{/items}}
</ul>
{{/arr}}
```

There are likely many other cases that can/should be resolved by this library,
too--if you find one, please [submit an issue or pull request][contributing]!

## License

ISC

[mustache]: http://mustache.github.io/mustache.5.html
[contributing]: ./CONTRIBUTING.md
