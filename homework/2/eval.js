const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Identifier':
      return env[node.name];
    case 'Literal':
      return node.value;
    case 'RegExpLiteral':
      return new RegExp(node.pattern, node.flags);
    case 'Program':
      return evaluate(node.body, env);
    case 'Function':
      return function (...args) {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((acc, param, index) => {
            acc[param.name] = args[index];
            return acc;
          }, {}),
        });
      };
    case 'UnaryExpression':
      switch (node.operator) {
        case '+':
          return +evaluate(node.argument, env);
        case '-':
          return -evaluate(node.argument, env);
        case '!':
          return !evaluate(node.argument, env);
        case '~':
          return ~evaluate(node.argument, env);
        case 'typeof':
          return typeof evaluate(node.argument, env);
        case 'void':
          return void evaluate(node.argument, env);
        case 'delete':
          return delete evaluate(node.argument, env);
      }
    case 'FunctionExpression':
      return function (...args) {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((acc, param, index) => ({ ...acc, [param.name]: args[index] }), {}),
        });
      };
    case 'ArrowFunctionExpression':
      return (...args) => {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((acc, param, index) => ({ ...acc, [param.name]: args[index] }), {}),
        });
      };
    case 'ArrayExpression':
      return node.elements.map(element => evaluate(element, env));
    case 'ObjectExpression':
      return node.properties.reduce((acc, property) => ({ ...acc, [property.key.name]: evaluate(property.value, env) }), {});
    case 'BinaryExpression':
      switch (node.operator) {
        case '+':
          return evaluate(node.left, env) + evaluate(node.right, env)
        case '-':
          return evaluate(node.left, env) - evaluate(node.right, env)
        case '*':
          return evaluate(node.left, env) * evaluate(node.right, env)
        case '/':
          return evaluate(node.left, env) / evaluate(node.right, env)
        case '%':
          return evaluate(node.left, env) % evaluate(node.right, env)
        case '<':
          return evaluate(node.left, env) < evaluate(node.right, env)
        case '>':
          return evaluate(node.left, env) > evaluate(node.right, env)
        case '<=':
          return evaluate(node.left, env) <= evaluate(node.right, env)
        case '>=':
          return evaluate(node.left, env) >= evaluate(node.right, env)
        case '==':
          return evaluate(node.left, env) == evaluate(node.right, env)
        case '===':
          return evaluate(node.left, env) === evaluate(node.right, env)
        case '!=':
          return evaluate(node.left, env) != evaluate(node.right, env)
        case '!==':
          return evaluate(node.left, env) !== evaluate(node.right, env)
        case '&':
          return evaluate(node.left, env) & evaluate(node.right, env)
        case '|':
          return evaluate(node.left, env) | evaluate(node.right, env)
        case '^':
          return evaluate(node.left, env) ^ evaluate(node.right, env)
        case 'in':
          return evaluate(node.left, env) in evaluate(node.right, env)
        case 'instanceof':
          return evaluate(node.left, env) instanceof evaluate(node.right, env)
        case '>>':
          return evaluate(node.left, env) >> evaluate(node.right, env)
        case '<<':
          return evaluate(node.left, env) << evaluate(node.right, env)
        case '>>>':
          return evaluate(node.left, env) >>> evaluate(node.right, env)
      }
    case 'LogicalExpression':
      switch (node.operator) {
        case '&&':
          return evaluate(node.left, env) && evaluate(node.right, env)
        case '||':
          return evaluate(node.left, env) || evaluate(node.right, env)
      }
    case 'ConditionalExpression':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case 'CallExpression':
      const callee = evaluate(node.callee, env);
      const args = node.arguments.map(arg => evaluate(arg, env));
      return callee(...args);
    case 'MemberExpression':
      const object = evaluate(node.object, env);
      const property = node.computed ? evaluate(node.property, env) : node.property.name;
      return object[property];
    case 'AssignmentExpression':
      const left = evaluate(node.left, env);
      const right = evaluate(node.right, env);
      return left = right;
    case 'UpdateExpression':
      const argument = evaluate(node.argument, env);
      switch (node.operator) {
        case '++':
          return argument++;
        case '--':
          return argument--;
      }
    case 'SequenceExpression':
      return node.expressions.reduce((acc, expression) => evaluate(expression, env), undefined);
    case 'YieldExpression':
      return evaluate(node.argument, env);
    case 'AwaitExpression':
      return evaluate(node.argument, env);
    case 'ExpressionStatement':
      return evaluate(node.expression, env);
    case 'BlockStatement':
      return node.body.reduce((acc, statement) => evaluate(statement, env), undefined);
    case 'IfStatement':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      }
      if (node.alternate) {
        return evaluate(node.alternate, env);
      }
    case 'WhileStatement':
      while (evaluate(node.test, env)) {
        evaluate(node.body, env);
      }
    case 'DoWhileStatement':
      do {
        evaluate(node.body, env);
      } while (evaluate(node.test, env));  
    case 'ThisExpression':
      return env.this;
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