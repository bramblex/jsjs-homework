const acorn = require('acorn');
const traverse = require('../../common/traverse')
const rename = require('./rename')
const sourceCode = require('./sourceCode')

function toStandard(code) {
  const root = acorn.parse(code, { ecmaVersion: 5 })

  const target = traverse((node, ctx, next) => {
    delete node.start
    delete node.end
    return next(node)
  })(root)

  return target
}

const res = rename(sourceCode, 'foo', 'bar');
console.log(res);