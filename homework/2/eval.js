const acorn = require('acorn')

function evaluate(node, env) {
  let left, right
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      return env[node.name]
    case 'Property':
      return { [node.key.name]: evaluate(node.value, env) }
    case 'ObjectExpression':
      return Object.assign(
        {},
        ...node.properties.map((property) => evaluate(property, env))
      )
    case 'ArrayExpression':
      return node.elements.map((element) => evaluate(element, env))
    case 'BinaryExpression':
      left = evaluate(node.left, env)
      right = evaluate(node.right, env)
      switch (node.operator) {
        case '-':
          return left - right
        case '+':
          return left + right
        case '*':
          return left * right
        case '/':
          return left / right
        case '%':
          return left % right
        case '<':
          return left < right
        case '>':
          return left > right
        case '<=':
          return left <= right
        case '>=':
          return left >= right
        case '==':
          return left == right
      }
    case 'LogicalExpression':
      left = evaluate(node.left, env)
      switch (node.operator) {
        case '&&':
          if (left) {
            return evaluate(node.right, env)
          } else {
            return left
          }
        case '||':
          left = evaluate(node.left, env)
          if (left) {
            return left
          } else {
            return evaluate(node.right, env)
          }
      }
    case 'ConditionalExpression':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env)
      } else {
        return evaluate(node.alternate, env)
      }
    case 'AssignmentExpression':
      return (env[node.left.name] = evaluate(node.right, env))
    case 'CallExpression':
      return evaluate(
        node.callee,
        env
      )(...node.arguments.map((arg) => evaluate(arg, env)))
    case 'ArrowFunctionExpression':
      return function (...args) {
        return evaluate(node.body, {
          ...env,
          ...Object.assign(
            {},
            ...node.params.map((param, index) => ({
              [param.name]: args[index],
            }))
          ),
        })
      }
    case 'SequenceExpression':
      let res
      node.expressions.forEach((expression) => {
        res = evaluate(expression, env)
      })
      return res
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  )
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6,
  })
  return evaluate(node, env)
}

module.exports = customerEval
