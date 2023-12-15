const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      // TODO: 补全作业代码
      return node.value
    case 'Identifier':
      return env[node.name]
    case 'BinaryExpression': {
      if (node.operator === '+') {
        return evaluate(node.left, env) + evaluate(node.right, env)
      } else if (node.operator === '-') {
        return evaluate(node.left, env) - evaluate(node.right, env)
      } else if (node.operator === '*') {
        return evaluate(node.left, env) * evaluate(node.right, env)
      } else if (node.operator === '/') {
        return evaluate(node.left, env) / evaluate(node.right, env)
      } else if (node.operator === '==') {
        return evaluate(node.left, env) == evaluate(node.right, env)
      } else if (node.operator === '!=') {
        return evaluate(node.left, env) != evaluate(node.right, env)
      } else if (node.operator === '===') {
        return evaluate(node.left, env) === evaluate(node.right, env)
      } else if (node.operator === '!==') {
        return evaluate(node.left, env) !== evaluate(node.right, env)
      } else if (node.operator === '<') {
        return evaluate(node.left, env) < evaluate(node.right, env)
      } else if (node.operator === '<=') {
        return evaluate(node.left, env) <= evaluate(node.right, env)
      } else if (node.operator === '>') {
        return evaluate(node.left, env) > evaluate(node.right, env)
      } else if (node.operator === '>=') {
        return evaluate(node.left, env) >= evaluate(node.right, env)
      } else if (node.operator === '<<') {
        return evaluate(node.left, env) << evaluate(node.right, env)
      } else if (node.operator === '>>') {
        return evaluate(node.left, env) >> evaluate(node.right, env)
      } else if (node.operator === '>>>') {
        return evaluate(node.left, env) >>> evaluate(node.right, env)
      } else if (node.operator === '%') {
        return evaluate(node.left, env) % evaluate(node.right, env)
      } else if (node.operator === '|') {
        return evaluate(node.left, env) | evaluate(node.right, env)
      } else if (node.operator === '^') {
        return evaluate(node.left, env) ^ evaluate(node.right, env)
      } else if (node.operator === '&') {
        return evaluate(node.left, env) & evaluate(node.right, env)
      } else if (node.operator === 'in') {
        return evaluate(node.left, env) in evaluate(node.right, env)
      } else if (node.operator === 'instanceof') {
        return evaluate(node.left, env) instanceof evaluate(node.right, env)
      }
    }
    case 'ConditionalExpression': {
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env)
      } else {
        return evaluate(node.alternate, env)
      }
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const argsenv = {}
        const params = node.params
        for (let i = 0; i < params.length; i++) {
          argsenv[params[i].name] = args[i]
        }
        return evaluate(node.body, {...env, ...argsenv})
      }
    }
    case 'LogicalExpression': {
      if (node.operator === '||') {
        return evaluate(node.left, env) || evaluate(node.right, env)
      } else if (node.operator === '&&') {
        return evaluate(node.left, env) && evaluate(node.right, env)
      }
    }
    case 'CallExpression': {
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)))
    }
    case 'ArrayExpression': {
      return [...node.elements.map(arg => evaluate(arg, env))]
    }
    case 'ObjectExpression': {
      let obj = {}
      node.properties.forEach(property => {
        obj[property.key.name] = evaluate(property.value, env)
      })
      return obj
    }
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

const test = customerEval('(()=> {return 1})()')
module.exports = customerEval
