const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name];
    case 'BinaryExpression':
      if (node.operator === '+') {
        return evaluate(node.left, env) + evaluate(node.right, env);
      } else if (node.operator === '-') {
        return evaluate(node.left, env) - evaluate(node.right, env);
      } else if (node.operator === '/') {
        return evaluate(node.left, env) / evaluate(node.right, env);
      } else if (node.operator === '*') {
        return evaluate(node.left, env) * evaluate(node.right, env);
      } else if (node.operator === '<=') {
        return evaluate(node.left, env) <= evaluate(node.right, env);
      }
      break;
    case 'ConditionalExpression':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case 'LogicalExpression':
      if (node.operator === '||') {
        return evaluate(node.left, env) || evaluate(node.right, env);
      } else if (node.operator === '&&') {
        return evaluate(node.left, env) && evaluate(node.right, env);
      }
      break;
    case 'ExpressionStatement':
      return evaluate(node.expression, env);
    case 'CallExpression':
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    case 'ArrowFunctionExpression':
      return function(...args) {
        const argEnv = {};
        for (const i in node.params) {
          console.log(node.params[i].name, args[i])
          argEnv[node.params[i].name] = args[i];
        }
        return evaluate(node.body, {...env, ...argEnv})
      }
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function myeval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

console.log(myeval('{ a: 8, b: 9, c: [1, 2, 3] }'))
module.exports = myeval