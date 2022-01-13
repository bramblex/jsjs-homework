const acorn = require('acorn');

function evaluate(node, env) {
  let res;
  switch (node.type) {
    case 'Literal': 
      return node.value;
    case 'LogicalExpression':
      if (node.operator === '||') return evaluate(node.left, env) || evaluate(node.right, env)
      if (node.operator === '&&') return evaluate(node.left, env) && evaluate(node.right, env)
    case 'UnaryExpression':
      return !evaluate(node.argument, env)
    case 'BinaryExpression':
      switch (node.operator) {
        case "+": return evaluate(node.left, env) + evaluate(node.right, env);
        case "-": return evaluate(node.left, env) - evaluate(node.right, env);
        case "*": return evaluate(node.left, env) * evaluate(node.right, env);
        case "/": return evaluate(node.left, env) / evaluate(node.right, env);
        case "<=": return evaluate(node.left, env) <= evaluate(node.right, env);
      }
      throw new Error(`Unsupported BinaryExpression ${node.type} at Location ${node.start}:${node.end}`);
    case 'ObjectExpression':
      res = {}
      for (const item of node.properties) {
        res[item.key.name] = evaluate(item.value, env);
      }
      return res;
    // case 'ObjectExpression':
    //   return node.properties.reduce((acc, property) => ({ ...acc, [property.key.name]: evaluate(property.value, env) }), {});
    case 'ConditionalExpression':
      let condition = evaluate(node.test, env)
      if (condition) return evaluate(node.consequent, env)
      else return evaluate(node.alternate, env)
    case 'ArrayExpression':
      res = []
      for (let item of node.elements) {
        res.push(evaluate(item, env))
      }
      return res;
    case 'CallExpression':
      const callee = evaluate(node.callee, env);
      const args = node.arguments.map(arg => evaluate(arg, env));
      return callee(...args);
    case 'ArrowFunctionExpression':
      return (...args) => {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((acc, param, index) => ({ ...acc, [param.name]: args[index] }), {}),
        });
      };
    case 'Identifier':
      return env[node.name];
  }
  return node.type
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval