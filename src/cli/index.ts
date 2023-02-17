#!/usr/bin/env node
import chalk from 'chalk'
import globby from 'globby'
import inquirer from 'inquirer'
import meow from 'meow'
import updateNotifier from 'update-notifier'

import { executeTransformations } from './transformers'

const cli = meow(
  `
Usage:      npx jest-codemods <path> [options]

Examples:   npx jest-codemods src
            npx jest-codemods src/**/*.test.js

Options:
  -f, --force       Bypass Git safety checks and force codemods to run
  -d, --dry         Dry run (no changes are made to files)`,
  {
    flags: {
      force: {
        type: 'boolean',
        alias: 'f',
      },
      dry: {
        type: 'boolean',
        alias: 'd',
      },
    },
  }
)

function getValidPackage() {
  const { name, version } = cli.pkg
  if (!name) {
    throw new Error('Did not find name in package.json')
  }
  if (!version) {
    throw new Error('Did not find version in package.json')
  }
  return { name, version }
}

updateNotifier({ pkg: getValidPackage() }).notify({ defer: false })

const TRANSFORMER_MOCHA = 'mocha'

function expandFilePathsIfNeeded(filesBeforeExpansion) {
  const shouldExpandFiles = filesBeforeExpansion.some((file) => file.includes('*'))
  return shouldExpandFiles ? globby.sync(filesBeforeExpansion) : filesBeforeExpansion
}

const parser = 'ts'
const transformer = TRANSFORMER_MOCHA
inquirer
  .prompt([
    {
      type: 'input',
      name: 'files',
      message: 'On which files or directory should the codemods be applied?',
      when: () => !cli.input.length,
      default: '.',
      filter: (files) =>
        files
          .trim()
          .split(/\s+/)
          .filter((v) => v),
    },
  ])
  .then((answers) => {
    const { files } = answers

    const skipImportDetection = false
    const standaloneMode = false

    const transformers = [transformer]

    const filesBeforeExpansion = cli.input.length ? cli.input : files
    const filesExpanded = expandFilePathsIfNeeded(filesBeforeExpansion)

    if (!filesExpanded.length) {
      console.log(`No files found matching ${filesBeforeExpansion.join(' ')}`)
      return
    }

    const transformerArgs = []
    if (standaloneMode) {
      transformerArgs.push('--standaloneMode=true')
      console.log(
        chalk.yellow('\nNOTICE: You need to manually install expect@21+ and jest-mock')
      )
    }

    if (skipImportDetection) {
      transformerArgs.push('--skipImportDetection=true')
      console.log(
        chalk.yellow('\nNOTICE: Skipping import detection, you might get false positives')
      )
    }

    return executeTransformations({
      files: filesExpanded,
      flags: cli.flags,
      parser,
      transformers,
      transformerArgs,
    })
  })
