#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import minimist from 'minimist'

// Shim for internal compatibility
import { DefaultLoader, Declarer } from '../facilities'

const args = minimist(process.argv.slice(2))

function usage() {
  console.log(
    `usage: ${process.argv[1]} --dir=<template dir> -o ./templates.ts

options:
  --dir        the path to the mustache template directory
  -h           print these instructions and exit
  -o           the output path to write the decalaration file
  --node       optionally configure declaration file for use with node.js
`,
  )
  process.exit(2)
}

if (args.h || !args.dir) {
  usage()
}

const loader = new DefaultLoader({ dir: args.dir })
const declarer = new Declarer(loader)

function stripHeader(content: string) {
  return content.substring(content.indexOf('*/\n') + 3)
}

function hasDeclarationChanged(filename: string, declarations: string): boolean {
  let existing = ''
  try {
    existing = fs.readFileSync(filename, 'utf8')
  } catch (e) {}

  return stripHeader(declarations) !== stripHeader(existing)
}

declarer.declare().then((declarations) => {
  const header = [
    `/**
*  Generated by ts-mustache at ${new Date().toISOString()}
*
*  @see {@link https://github.com/rjz/ts-mustache/}
*/`,
  ]

  const footer = []

  if (args.node) {
    header.push("import path from 'path'")
    footer.push(
      `export const TEMPLATE_DIR = path.resolve(__dirname, '${path.relative(
        path.dirname(args.o ?? '.'),
        path.resolve(args.dir),
      )}')`,
    )
  }

  const output = [...header, declarations, ...footer]
    .filter(Boolean)
    .join('\n\n')

  if (args.o) {
    if (hasDeclarationChanged(args.o, output)) {
      fs.writeFileSync(args.o, output, 'utf8')
    }
  } else {
    console.log(output)
  }
  process.exit(0)
})
