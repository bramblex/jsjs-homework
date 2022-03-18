const acorn = require('acorn');

function evaluate(node, env) {
  console.log(node.type, node.value)
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name];
    case 'Program':
      return evaluate(node.body[0], env);
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
      } else if (node.operator === '<') {
        return evaluate(node.left, env) < evaluate(node.right, env);
      } else if (node.operator === '>') {
        return evaluate(node.left, env) > evaluate(node.right, env);
      } else if (node.operator === '>=') {
        return evaluate(node.left, env) >= evaluate(node.right, env);
      } else if (node.operator === '==') {
        return evaluate(node.left, env) == evaluate(node.right, env);
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
      return function (...args) {
        const argEnv = {};
        for (const i in node.params) {
          argEnv[node.params[i].name] = args[i];
        }
        return evaluate(node.body, { ...env, ...argEnv });
      }
    case 'ObjectExpression':
      const obj = {};
      for (const prop of node.properties) {
        obj[prop.key.name] = evaluate(prop.value, env);
      }
      return obj;
    case 'ArrayExpression':
      const arr = [];
      for (const element of node.elements) {
        arr.push(evaluate(element, env));
      }
      return arr;
    case 'BlockStatement':
      return evaluateBody(node.body, env);
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function evaluateBody(body, env) {
  for (const statement of body) {
    console.log(statement)
    const result = evaluateStatement(statement, env)
    if (result) {
      return result;
    }
  }
  return;
}
function evaluateStatement(statement, env) {
  switch (statement.type) {
    case 'VariableDeclaration':
      for (const declaration of statement.declarations) {
        env[declaration.id.name] = evaluate(declaration.init, env);
      }
      break;
    case 'IfStatement':
      if (statement.test) {
        return evaluateBody(statement.consequent.body, env);
      } else {
        return evaluateBody(statement.alternate.body, env);
      }
    case 'ForStatement':
      evaluateStatement(statement.init, env);
      if (evaluate(statement.test, env)) {
          if (evaluateBody(statement.body, env)) {

          }
      }
    case 'ReturnStatement':
      return evaluate(statement.argument, env);
  }
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval