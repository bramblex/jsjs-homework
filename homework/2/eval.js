const acorn = require("acorn");

function evaluate(node, env) {
  switch (node.type) {
    case "Literal":
      return node.value;

    case "BinaryExpression":
      const left = evaluate(node.left, env);
      const right = evaluate(node.right, env);

      if (node.operator === "+") {
        return left + right;
      } else if (node.operator === "-") {
        return left - right;
      } else if (node.operator === "*") {
        return left * right;
      } else if (node.operator === "/") {
        return left / right;
      } else if (node.operator === '<=') {
        return left <= right;
      }

    case "LogicalExpression":
      if (node.operator == "||") {
        return evaluate(node.left, env) || evaluate(node.right, env);
      } else if (node.operator == "&&") {
        return evaluate(node.left, env) && evaluate(node.right, env);
      }

    case "CallExpression":
      return evaluate(
        node.callee,
        env
      )(...node.arguments.map(arg => evaluate(arg, env)));

    case "Identifier": 
      if (node.name in env) {
        return env[node.name];
      } else {
        return node.name;
      }
    
    case "ConditionalExpression":
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }

    case "ExpressionStatement":
      return evaluate(node.expression, env);

    case "ObjectExpression":
      return node.properties.reduce((pre, cur) => {
        return { ...pre, [evaluate(cur.key, env)]: evaluate(cur.value, env) };
      }, {})

    case "ArrayExpression":
      return [...node.elements.map(ele => evaluate(ele, env))];

    case "ArrowFunctionExpression":
      return function(...args) {
        const paramsEnv = node.params.reduce((pre, cur, index) => {
          return { ...pre, [cur.name]: args[index]};
        }, {...env});

        return evaluate(node.body, paramsEnv);
      }
    
    default:
      break;
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
