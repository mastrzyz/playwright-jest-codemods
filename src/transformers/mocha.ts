// Description: This transformer converts Mocha tests to Playwright Test tests.
import * as jscodeshift from 'jscodeshift'
import finale from '../utils/finale'
const methodMap = {
  describe: 'test.describe',
  beforeAll: 'test.beforeAll',
  afterAll: 'test.afterAll',
  beforeEach: 'test.beforeEach',
  afterEach: 'test.afterEach',
  it: 'test',
}

const jestMethodsWithDescriptionsAllowed = new Set(['test', 'it', 'describe'])

const methodModifiers = ['only', 'skip']

function hasBinding(name, scope) {
  if (!scope) {
    return false
  }

  const bindings = Object.keys(scope.getBindings()) || []
  if (bindings.indexOf(name) >= 0) {
    return true
  }

  return scope.isGlobal ? false : hasBinding(name, scope.parent)
}

const addPlaywrightTestImport = (
  j: jscodeshift.JSCodeshift,
  ast: jscodeshift.Collection<any>
) => {
  const importStatement = 'import { test } from "@playwright/test";'
  const importWithExpectStatement = 'import { test, expect } from "@playwright/test";'

  // Find if we need the `expect` import
  const hasExpect =
    ast.find(j.CallExpression, {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'expect' },
    }).length > 0

  j(ast.find(j.Declaration).at(0).get()).insertBefore(
    hasExpect ? importWithExpectStatement : importStatement
  )
}

const addFileNameIdentifiertoGetTeamsApp = (
  j: jscodeshift.JSCodeshift,
  ast: jscodeshift.Collection<any>
) => {
  ast
    .find(j.CallExpression, {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'getTeamsApp' },
    })
    .replaceWith((path) => {
      return j.callExpression(
        j.identifier('getTeamsApp'),
        path.value.arguments.concat([j.identifier('__filename')])
      )
    })
}

const replaceJestGlobalsWithPlaywrightTestMethods = (
  j: jscodeshift.JSCodeshift,
  ast: jscodeshift.Collection<any>
) => {
  Object.keys(methodMap).forEach((mochaMethod) => {
    const jestMethod = methodMap[mochaMethod]

    ast
      .find(j.CallExpression, {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: mochaMethod },
      })
      .filter(({ scope }) => !hasBinding(mochaMethod, scope))
      .replaceWith((path) => {
        let args = path.value.arguments
        if (!jestMethodsWithDescriptionsAllowed.has(jestMethod)) {
          args = args.filter((a) => a.type !== 'Literal')
        } else if (args.length === 1 && args[0].type === 'Literal') {
          const emptyArrowFunction = j.arrowFunctionExpression(
            [],
            j.blockStatement([j.emptyStatement()])
          )
          return j.callExpression(
            j.memberExpression(j.identifier(jestMethod), j.identifier('skip')),
            args.concat([emptyArrowFunction])
          )
        }
        return j.callExpression(j.identifier(jestMethod), args)
      })

    methodModifiers.forEach((modifier) => {
      ast
        .find(j.CallExpression, {
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: mochaMethod },
            property: { type: 'Identifier', name: modifier },
          },
        })
        .replaceWith((path) =>
          j.callExpression(
            j.memberExpression(j.identifier(jestMethod), j.identifier(modifier)),
            path.value.arguments
          )
        )
    })
  })
}

const mochaToJest: jscodeshift.Transform = (fileInfo, api, options) => {
  const j = api.jscodeshift
  const ast = j(fileInfo.source)

  addPlaywrightTestImport(j, ast)

  replaceJestGlobalsWithPlaywrightTestMethods(j, ast)

  addFileNameIdentifiertoGetTeamsApp(j, ast)

  fileInfo.source = finale(fileInfo, j, ast, options)
  return fileInfo.source
}

export default mochaToJest
