#!/usr/bin/env node

import fs from 'fs'
import minimist from 'minimist'

// Shim for internal compatibility
import { DefaultLoader, Declarer } from '../facilities'

const args = minimist(process.argv.slice(2))

function usage() {
  console.log(
    `usage: ${process.argv[1]} --dir=<template dir> -o ./templates.ts`,
  )
  process.exit(2)
}

if (args.h || !args.dir || args.o) {
  usage()
}

const loader = new DefaultLoader({ dir: args.dir })
const declarer = new Declarer(loader)

declarer.declare().then((d) => {
  if (args.o) {
    fs.promises.writeFile(args.o, d)
  } else {
    console.log(d)
  }
  process.exit(0)
})
