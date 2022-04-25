const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier': {
      if (node.name in env) {
        return env[node.name];
      } else {
        return node.name;
      }
    }
    case 'ArrayExpression': {
      const arr = [];
      const elements = node.elements;
      for (var i = 0; i < elements.length; i++) {
        arr.push(evaluate(elements[i], env));
      }
      return arr;
    }
    case 'ObjectExpression': {
      const properties = node.properties;
      const obj = {};
      for (var i = 0; i < properties.length; i++) {
        const key = evaluate(properties[i].key, env);
        const value = evaluate(properties[i].value, env);
        
        obj[key] = value;
      }
      return obj;
    }
    case 'BinaryExpression': {
      const operator = node.operator;
      const left = evaluate(node.left, env);
      const right = evaluate(node.right, env);
      if (operator === '+') {
        return left + right;
      } else if (operator === '-') {
        return left - right;
      } else if (operator === '*') {
        return left * right;
      } else if (operator === '/') {
        return left / right;
      } else if (operator === '<=') {
        return left <= right;
      }
    }
    case 'LogicalExpression': {
      const operator = node.operator;
      if (operator === '||') {
        return evaluate(node.left, env) || evaluate(node.right, env);
      } else if (operator === '&&') {
        return evaluate(node.left, env) && evaluate(node.right, env);
      }
    }
    case 'ConditionalExpression': {
      const test = evaluate(node.test, env);

      if (test) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    }
    case 'CallExpression': {
      // 调用 evaluate(node.callee, env) 来得到 callee 所表示的方法，然后使用 node.arguments 中的参数（解析过的）来调用该方法
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    }
    case 'ArrowFunctionExpression': {
      return function(...args) {
        // node.params 中有参数名，和 args 中的每一项相互对应
        const argsEnv = {};
        const params = node.params;
        for (var i = 0; i < params.length; i++) {
          argsEnv[params[i].name] = args[i];
        }
        // node.body 中存放代码（当前已经被解析为节点）
        // 调用方法时传入的参数当前已经存放在 argsEnv 中，箭头函数可以使用外围参数，所以同时将 env 传入，但 argsEnv 要覆盖掉 env 中同名的参数（局部替换全局）
        return evaluate(node.body, {...env, ...argsEnv});
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