const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name];
    case 'BinaryExpression':
      switch (node.operator) {
        case '+':
          return evaluate(node.left, env) + evaluate(node.right, env);
        case '-':
          return evaluate(node.left, env) - evaluate(node.right, env);
        case '*':
          return evaluate(node.left, env) * evaluate(node.right, env);
        case '/':
          return evaluate(node.left, env) / evaluate(node.right, env);
        case '<=':
          return evaluate(node.left, env) <= evaluate(node.right, env);
      }
    case 'LogicalExpression':
      switch (node.operator) {
        case '&&':
          return evaluate(node.left, env) && evaluate(node.right, env);
        case '||':
          return evaluate(node.left, env) || evaluate(node.right, env);
      }
    case 'CallExpression':
      let callee = evaluate(node.callee, env);
      let args = node.arguments.map(arg => evaluate(arg, env));
      return callee(...args);
    case 'ConditionalExpression':
      if(evaluate(node.test, env)){
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case 'ObjectExpression':
      return node.properties.reduce((prev, curPro) => ({...prev, [curPro.key.name]: evaluate(curPro.value, env)}), {});
    case 'ArrayExpression':
      return node.elements.map(element => evaluate(element, env));
    case 'ArrowFunctionExpression':
      return (...args) => {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((prev, param, index) => ({...prev, [param.name]: args[index]}), {})
        });
      };
    case 'AssignmentExpression':
      let left = evaluate(node.left, env);
      const right = evaluate(node.right, env);
      return left = right;
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