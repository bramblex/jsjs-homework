const acorn = require("acorn");
function evaluate(node, env) {

  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier":
      return env[node.name];
    case "BinaryExpression":
      switch (node.operator) {
        case "+":
          return evaluate(node.left, env) + evaluate(node.right, env);
        case "-":
          return evaluate(node.left, env) - evaluate(node.right, env);
        case "*":
          return evaluate(node.left, env) * evaluate(node.right, env);
        case "/":
          return evaluate(node.left, env) / evaluate(node.right, env);
        case "<=":
          return evaluate(node.left, env) <= evaluate(node.right, env);
      }
      break;
    case "ConditionalExpression":
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case "LogicalExpression":
      if (node.operator === "||") {
        return evaluate(node.left, env) || evaluate(node.right, env);
      } else if (node.operator === "&&") {
        return evaluate(node.left, env) && evaluate(node.right, env);
      }
      break;
    case "ExpressionStatement":
      return evaluate(node.expression, env);
    case "CallExpression":
      return evaluate(
        node.callee,
        env
      )(...node.arguments.map((arg) => evaluate(arg, env)));
    case "ArrowFunctionExpression":
      return function (...args) {
        let argEnv = {};
        for (let i in node.params) {
          argEnv[node.params[i].name] = args[i];
        }
        return evaluate(node.body, { ...env, ...argEnv });
      };
    case "ObjectExpression":
      const obj = {};
      for (const prop of node.properties) {
        obj[prop.key.name] = evaluate(prop.value, env);
      }
      return obj;
    case "ArrayExpression":
      const arr = [];
      for (const element of node.elements) {
        arr.push(evaluate(element, env));
      }
      return arr;
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6,
  });
  return evaluate(node, env);
}

module.exports = customerEval;
