const acorn = require("acorn");

function evaluate(node, env) {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier":
      return env[node.name];
    /*
      enum BinaryOperator {
        "==" | "!=" | "===" | "!=="
            | "<" | "<=" | ">" | ">="
            | "<<" | ">>" | ">>>"
            | "+" | "-" | "*" | "/" | "%"
            | "|" | "^" | "&" | "in"
            | "instanceof"
      } 
     */
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
        case "%":
          return evaluate(node.left, env) % evaluate(node.right, env);
        case "|":
          return evaluate(node.left, env) | evaluate(node.right, env);
        case "&":
          return evaluate(node.left, env) & evaluate(node.right, env);
        case "^":
          return evaluate(node.left, env) ^ evaluate(node.right, env);
        case "==":
          return evaluate(node.left, env) == evaluate(node.right, env);
        case "!=":
          return evaluate(node.left, env) != evaluate(node.right, env);
        case "===":
          return evaluate(node.left, env) === evaluate(node.right, env);
        case "!==":
          return evaluate(node.left, env) !== evaluate(node.right, env);
        case "<":
          return evaluate(node.left, env) < evaluate(node.right, env);
        case ">":
          return evaluate(node.left, env) > evaluate(node.right, env);
        case "<<":
          return evaluate(node.left, env) << evaluate(node.right, env);
        case ">>":
          return evaluate(node.left, env) >> evaluate(node.right, env);
        case ">>>":
          return evaluate(node.left, env) >>> evaluate(node.right, env);
        case "<=":
          return evaluate(node.left, env) <= evaluate(node.right, env);
        case ">=":
          return evaluate(node.left, env) <= evaluate(node.right, env);
        case "in":
          return evaluate(node.left, env) in evaluate(node.right, env);
        case "instanceof":
          return evaluate(node.left, env) instanceof evaluate(node.right, env);
      }
    /*
      enum LogicalOperator {
        "||" | "&&"
      }
    */
    case "LogicalExpression":
      switch (node.operator) {
        case "&&":
          return evaluate(node.left, env) && evaluate(node.right, env);
        case "||":
          return evaluate(node.left, env) || evaluate(node.right, env);
      }
    case "ArrowFunctionExpression":
      // console.log(node);
      return function (...args) {
        const argsEnv = {};
        node.params.forEach((param, _i) => {
          argsEnv[param.name] = args[_i];
        });
        return evaluate(node.body, { ...env, ...argsEnv });
      };
    case "CallExpression":
      return evaluate(
        node.callee,
        env
      )(...node.arguments.map((subNode) => evaluate(subNode, env)));
    case "ConditionalExpression":
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case "ObjectExpression":
      let obj = {};
      node.properties.forEach((property) => {
        obj[property.key.name] = evaluate(property.value, env);
      });
      return obj;
    case "ArrayExpression":
      return node.elements.map((element) => evaluate(element, env));
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
