const acorn = require('acorn');

class Scope {
  constructor(type, parent) {
    this.variables = {}
    this.type = type
    this.parent = parent
  }
  get(name) {
    let root = this
    while (root.variables[name] === undefined && root) root = root.parent
    if (root) {
      return root.variables[name]
    }
  }
  set(name, value) {
    let root = this
    while (root.variables[name] === undefined && root) root = root.parent
    if (root) {
      root.variables[name] = value
    }
  }
}

function evaluate(node, scope) {
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      return scope.get(node.name)
    case 'BinaryExpression':
      switch (node.operator) {
        case '+':
          return evaluate(node.left, scope) + evaluate(node.right, scope)
        case '-':
          return evaluate(node.left, scope) - evaluate(node.right, scope)
        case '*':
          return evaluate(node.left, scope) * evaluate(node.right, scope)
        case '/':
          return evaluate(node.left, scope) / evaluate(node.right, scope)
        case '<=':
          return evaluate(node.left, scope) <= evaluate(node.right, scope)
        case '>=':
          return evaluate(node.left, scope) >= evaluate(node.right, scope)
      }
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return evaluate(node.left, scope) && evaluate(node.right, scope)
      } else
        if (node.operator === '||') {
          return evaluate(node.left, scope) || evaluate(node.right, scope)
        }
    case 'ConditionalExpression':
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope)
      } else {
        return evaluate(node.alternate, scope)
      }
    case 'ObjectExpression':
      let res = {}
      node.properties.map((obj) => {
        res[obj.key.name] = evaluate(obj.value, scope)
      })
      return res
    case 'ArrayExpression':
      let result = []
      node.elements.map((obj) => {
        result.push(evaluate(obj, scope))
      })
      return result
    case 'CallExpression':
      if (typeof evaluate(node.callee, scope) !== 'function') {
      }
      return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)))
    case 'ArrowFunctionExpression':
      // 箭头函数表达式返回的是一个函数
      return function (...args) {
        let argsEnv = new Scope('let', scope)
        node.params.map((arg, index) => {
          argsEnv.variables[arg.name] = args[index]
        })
        return evaluate(node.body, argsEnv)
      }
    case 'SequenceExpression':
      let SequenceResult
      node.expressions.map((exp,index) => {
        if (index === node.expressions.length - 1) {
          SequenceResult = evaluate(exp, scope)
          return
        }
        evaluate(exp, scope)
      })
      return SequenceResult
    case 'AssignmentExpression':
      scope.set(node.left.name, evaluate(node.right, scope))
      return scope.get(node.left.name)
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, scope = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, scope)
}

module.exports = customerEval