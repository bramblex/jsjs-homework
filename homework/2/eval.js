const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal': {
      return node.value;
    }
    case 'Identifier': {
      return env[node.name];
    }
    case 'BinaryExpression': {
      switch (node.operator) {
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
      }
    }
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env);
        case '||': return evaluate(node.left, env) || evaluate(node.right, env);
      }
    }
    //注意参数
    case 'CallExpression': {
      return evaluate(node.callee, env)(...node.arguments.map((arg) => {
        return evaluate(arg, env)
      }));
    }
    case 'ConditionalExpression': {
      return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
    }
    case 'ExpressionStatement': {
      return evaluate(node.expression, env);
    }
    case 'ObjectExpression': {
      let obj = {};
      //注意key
      node.properties.forEach(p => {
        obj[p.key.name] = evaluate(p.value, env);
      })
      return obj;
    }
    case 'ArrayExpression': {
      return node.elements.map(e => {
        return evaluate(e, env);
      })
    }
    case 'ArrowFunctionExpression': {
      const a = function (...args) {
        let para = {};
        node.params.forEach((p, i) => {
          para[p.name] = args[i];
        })
        return evaluate(node.body, { ...para, ...env });
      };
      return a;
    }
    // TODO: 补全作业代码
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