const acorn = require("acorn");

function evaluate(
  /** @type { import('acorn').Node } */
  node,
  env
) {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier": {
      let currentEnv = env;
      while (currentEnv) {
        if (currentEnv.hasOwnProperty(node.name)) {
          return currentEnv[node.name];
        } else {
          currentEnv = currentEnv.__outer__;
        }
      }
      return void 0;
    }
    case "AssignmentExpression": {
      let currentEnv = env;
      while (currentEnv) {
        if (currentEnv.hasOwnProperty(node.left.name)) {
          const newValue = evaluate(node.right, env);
          return currentEnv[node.left.name] = newValue;
        } else {
          currentEnv = currentEnv.__outer__;
        }
      }
      return;
    }
    case "ObjectExpression":
      return Object.fromEntries(
        Object.values(node.properties).map((property) => {
          return [
            property.computed ? evaluate(property.key, env) : property.key.name,
            evaluate(property.value, env),
          ];
        })
      );
    case "ArrayExpression":
      return node.elements.map((el) => evaluate(el, env));
    case "BinaryExpression": {
      return eval(
        `${JSON.stringify(evaluate(node.left, env))} ${
          node.operator
        } ${JSON.stringify(evaluate(node.right, env))}`
      );
    }
    case "LogicalExpression": {
      switch (node.operator) {
        case "&&":
          return evaluate(node.left, env) && evaluate(node.right, env);
        case "||":
          return evaluate(node.left, env) || evaluate(node.right, env);
      }
    }
    case "ConditionalExpression": {
      return evaluate(node.test, env)
        ? evaluate(node.consequent, env)
        : evaluate(node.alternate, env);
    }
    case "ArrowFunctionExpression": {
      return (...args) => {
        const fnEnv = {
          // ...env,
          // scope chain
          __outer__: env,
          // override
          ...Object.fromEntries(
            node.params.map((p, i) => {
              return [p.name, args[i]];
            })
          ),
        };
        return evaluate(node.body, fnEnv);
      };
    }
    case "CallExpression": {
      return evaluate(
        node.callee,
        env
      )(...node.arguments.map((arg) => evaluate(arg, env)));
    }
    case "SequenceExpression":
      return node.expressions.reduce((_, exp) => evaluate(exp, env), undefined);
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
