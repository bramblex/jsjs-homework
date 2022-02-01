const acorn = require('acorn');
const Scope = require('./scope')
function evaluate(node, scope) {
  switch (node.type) {
    case 'Program': {
      let arr = node.body.map(n => evaluate(n, scope))
      return arr.length ? arr[arr.length - 1] : undefined
    }
    case 'Literal':
      // TODO: 补全作业代码
      return node.value;
    case 'Identifier': {
      return scope[node.name] || global[node.name];
    }
    // case 'FunctionDeclaration': {
    //   scope.declare
    // }
    case 'ExpressionStatement': {
      return evaluate(node.expression, scope)
    }
    case 'AssignmentExpression': {
      return scope.set(node.left.name, evaluate(node.right))
    }
    case 'BlockStatement': {
      const childScope = new Scope("Block", scope)
      for (const state of node.body) {
        evaluate(node, childScope)
      }
    }
    case 'VariableDeclaration': {
      return node.declarations.forEach(v => scope.declare(node.kind, v.id.name, evaluate(v.init, scope)))
    }
    case 'IfStatement': {
      if (node.test) return evaluate(node.consequent, scope)
    }
    case 'WhileStatement': {
      while (node.test) {
        evaluate(node.body)
      }
    } break
    case 'ForStatement': {

    }
    // 逻辑运算符
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate(node.left, scope) && evaluate(node.right, scope)
        case '||': return evaluate(node.left, scope) || evaluate(node.right, scope)
      }
    }
    // 基本运算符
    /**
     * 
      enum BinaryOperator {
            "==" | "!=" | "===" | "!=="
          | "<" | "<=" | ">" | ">="
          | "<<" | ">>" | ">>>"
          | "+" | "-" | "*" | "/" | "%"
          | "|" | "^" | "&" | "in"
          | "instanceof"
          }
     */
    case 'BinaryExpression': {
      const left = evaluate(node.left, scope)
      const right = evaluate(node.right, scope)
      switch (node.operator) {
        case '==': return left == right
        case '!=': return left != right
        case '===': return left === right
        case '!==': return left !== right
        case '<': return left < right;
        case '<=': return left <= right
        case '>': return left > right
        case '>=': return left >= right
        case '<<': return left << right
        case '>>': return left >> right
        case '>>>': return left >>> right
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return left / right
        case '%': return left % right
        case '|': return left | right
        case '^': return left ^ right
        case '&': return left & right
        case 'in': return left in right
        case 'instanceof': return left instanceof right
      }
    }
    // enum UnaryOperator {"-" | "+" | "!" | "~" | "typeof" | "void" | "delete"}
    case 'UnaryExpression': {
      switch (node.operator) {
        case '-': return -evaluate(node.argument, scope)
        case '+': return +evaluate(node.argument, scope)
        case '!': return !evaluate(node.argument, scope)
        case '~': return ~evaluate(node.argument, scope)
        case 'typeof': return typeof evaluate(node.argument, scope)
          Array
      }
    }
    // 三目运算符
    case 'ConditionalExpression':
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope)
    //对象
    case 'ObjectExpression':
      {
        let props = node.properties
        const obj = {}
        props.forEach(p => {
          obj[p.key.name] = evaluate(p.value)
        });
        return obj
      }

    // 数组
    case 'ArrayExpression': {
      return node.elements.map(e => e.value) || []
    }
    case 'CallExpression': {
      // 调用 evaluate(node.callee, env) 来得到 callee 所表示的方法，然后使用 node.arguments 中的参数（解析过的）来调用该方法
      return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)));
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const argsEnv = {};
        node.params.forEach((param, i) => {
          argsEnv[param.name] = args[i]
        })
        return evaluate(node.body, { ...scope, ...argsEnv });
      }
    }


  }
  console.log(node)
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = new Scope()) {
  const node = acorn.parse(code, {
    ecmaVersion: 2020
  })
  return evaluate(node, env)
}

module.exports = customerEval