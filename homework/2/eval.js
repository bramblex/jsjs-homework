const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      // TODO: 补全作业代码
      return node.value;
    case 'Identifier': {
      return env[node.name];
    }
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env)
        case '||': return evaluate(node.left, env) || evaluate(node.right, env)
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
      const left = evaluate(node.left, env)
      const right = evaluate(node.right, env)
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
        // instanceof 未能实现
        // case 'instanceof':
        //   return left instanceof right
      }
    }
    // enum UnaryOperator {"-" | "+" | "!" | "~" | "typeof" | "void" | "delete"}
    case 'UnaryExpression': {
      switch (node.operator) {
        case '-': return -evaluate(node.argument, env)
        case '+': return +evaluate(node.argument, env)
        case '!': return !evaluate(node.argument, env)
        case '~': return ~evaluate(node.argument, env)
        case 'typeof': return typeof evaluate(node.argument, env)
      }
    }
    // 三目运算符
    case 'ConditionalExpression':
      return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env)
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
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        // node.params 中有参数名，和 args 中的每一项相互对应
        const argsEnv = {};
        node.params.forEach((param, i) => {
          argsEnv[param.name] = args[i]
        })
        // node.body 中存放代码（当前已经被解析为节点）
        // 调用方法时传入的参数当前已经存放在 argsEnv 中，箭头函数可以使用外围参数，所以同时将 env 传入，但 argsEnv 要覆盖掉 env 中同名的参数（局部替换全局）
        return evaluate(node.body, { ...env, ...argsEnv });
      }
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

module.exports = customerEval