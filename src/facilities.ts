import assert from 'assert'
import fs from 'fs'
import path from 'path'
import Mustache from 'mustache'
import { glob } from 'glob'

import * as Declarations from './declarations'

type MustacheTemplate = any // TODO: Reference utliityTypes here!

type ViewMap = Record<string, MustacheTemplate>

type GlobStr = string

type LoaderOpts = {
  files?: GlobStr
  cacheTemplates?: boolean
  dir: string
}

const MUSTACHE_EXTENSION = '.mustache'

export class DefaultLoader<T extends ViewMap = ViewMap> {
  protected cache?: Promise<T>
  protected opts: Required<LoaderOpts>

  constructor(opts: LoaderOpts) {
    this.opts = { ...DefaultLoader.DefaultOptions, ...opts }
  }

  protected async fsLoad(): Promise<T> {
    const { dir, files: fileGlob } = this.opts
    const files = await glob(path.join(dir, fileGlob))

    const contents = await Promise.all(
      files.map((f) => fs.promises.readFile(f, { encoding: 'utf8' })),
    )

    return Object.fromEntries(
      files.map((f, i) => [DefaultLoader.templateKey(dir, f), contents[i]]),
    ) /* We could validate these, but don't */ as T
  }

  load(): Promise<T> {
    const { cacheTemplates } = this.opts
    if (cacheTemplates && this.cache) {
      return this.cache
    }

    const state: Promise<T> = this.fsLoad()

    if (cacheTemplates) {
      this.cache = state
    }

    return state
  }

  static templateKey(dir: string, filename: string): string {
    return path.relative(dir, filename).replace(MUSTACHE_EXTENSION, '')
  }

  static DefaultOptions = {
    files: `**/*${MUSTACHE_EXTENSION}`,
    cacheTemplates: false,
  }
}

interface Loader<T> {
  load(): Promise<T>
}

export class Renderer<T extends ViewMap> {
  constructor(protected loader: Loader<T>) {}

  async render<K extends keyof T>(
    templateName: K,
    params: T[K],
  ): Promise<string> {
    const templates = await this.loader.load()
    const template = templates[templateName]

    assert(template, `Unknown template '${String(templateName)}'`)

    return Mustache.render(template, params, templates)
  }
}

export class Declarer {
  constructor(protected loader: Loader<ViewMap>) {}

  async declare(): Promise<string> {
    const templates = await this.loader.load()

    const p = new Declarations.Parser()
    for (const [k, t] of Object.entries(templates)) {
      try {
        p.addTemplate(k, Mustache.parse(t))
      } catch (e) {
        console.log(`Failed parsing template "${k}"`)
        throw e
      }
    }

    const t = new Declarations.Renderer(p)
    return t.toString()
  }
}
