const acorn = require('acorn');
function evaluate(node, env) {
  console.log(node.type,env);
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name];
    case 'BinaryExpression': {
      switch (node.operator) {
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '%': return evaluate(node.left, env) % evaluate(node.right, env);
        case '<': return evaluate(node.left, env) < evaluate(node.right, env);
        case '>': return evaluate(node.left, env) > evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
        case '>=': return evaluate(node.left, env) >= evaluate(node.right, env);
        case '<<': return evaluate(node.left, env) << evaluate(node.right, env);
        case '>>': return evaluate(node.left, env) >> evaluate(node.right, env);
        case '^': return evaluate(node.left, env) ^ evaluate(node.right, env);
        case '|': return evaluate(node.left, env) | evaluate(node.right, env);
        case '&': return evaluate(node.left, env) & evaluate(node.right, env);
        case '==': return evaluate(node.left, env) == evaluate(node.right, env);
        case '===': return evaluate(node.left, env) === evaluate(node.right, env);
        case '!=': return evaluate(node.left, env) != evaluate(node.right, env);
        case '!==': return evaluate(node.left, env) !== evaluate(node.right, env);
        case 'in': return evaluate(node.left, env) in evaluate(node.right, env);
        case 'instanceof': return evaluate(node.left, env) instanceof evaluate(node.right, env);
      }
    }
    case 'LogicalExpression': {
      switch(node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env);
        case '||': return evaluate(node.left, env) || evaluate(node.right, env);
      }
    }
    case 'ConditionalExpression': {
      if (evaluate(node.test, env)) return evaluate(node.consequent, env);
      else return evaluate(node.alternate, env);
    }
    case 'ObjectExpression': {
      return node.properties.reduce((argsEnv, property) => ({ ...argsEnv, [property.key.name]: evaluate(property.value, env) }), {});
    }
    case 'ArrayExpression': {
      return node.elements.map(el => evaluate(el, env));
    }
    case 'ArrowFunctionExpression': {
      const args = node.params.map(e => e.name);
      return function (...args) {
        const argsEnv = node.params.reduce((argsEnv, param, idx) => ({ ...argsEnv, [param.name]: args[idx] }), { ...env });
        return evaluate(node.body, { ...argsEnv });
      };
    }
    case 'CallExpression': {
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    }
    //用例三通不过是因为此处，逗号表达式处理过程中对env的改变，没有改变整体的env
    case 'SequenceExpression': {
      return node.expressions.reduce((_, expression) => evaluate(expression, env));
    }
    case 'AssignmentExpression': {
      env[node.left.name] = evaluate(node.right, env);
      console.log(64,node.left.name,env);
      return evaluate(node.right, env);
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