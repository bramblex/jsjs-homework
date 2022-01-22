const acorn = require("acorn");
const Scope = require("./scope");

/**
 * @param {Scope} env
 */
function evaluate(node, env) {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "Identifier":
      return env.get(node.name);
    case "MemberExpression":
      return evaluate(node.object, env)[node.property.name];
    case "VariableDeclaration":
      return node.declarations.forEach(({ id, init }) => {
        env.declare(id.name, node.kind, init && evaluate(init, env));
      });
    case "AssignmentExpression": {
      switch (node.operator) {
        case "=":
          if (node.left.object) {
            return (evaluate(node.left.object, env)[node.left.property.name] =
              evaluate(node.right, env));
          }
          return env.set(node.left.name, evaluate(node.right, env));
        case "+=":
          return env.set(
            node.left.name,
            evaluate(node.left, env) + evaluate(node.right, env)
          );
        case "-=":
          return env.set(
            node.left.name,
            evaluate(node.left, env) - evaluate(node.right, env)
          );
        case "*=":
          return env.set(
            node.left.name,
            evaluate(node.left, env) * evaluate(node.right, env)
          );
        case "/=":
          return env.set(
            node.left.name,
            evaluate(node.left, env) / evaluate(node.right, env)
          );
        // TODO
        case "%=":
        case "<<=":
        case ">>=":
        case ">>>=":
        case "^=":
        case "&=":
      }
    }
    case "BlockStatement": {
      const blockEnv = new Scope(env);
      let result;
      for (const statement of node.body) {
        result = evaluate(statement, blockEnv);
        if (result?.type) {
          return result;
        }
      }
      return result;
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
    case "UpdateExpression": {
      let oldValue, newValue;
      switch (node.operator) {
        case "++":
          oldValue = evaluate(node.argument, env);
          newValue = env.set(node.argument.name, oldValue + 1);
          break;
        case "--":
          oldValue = evaluate(node.argument, env);
          newValue = env.set(node.argument.name, oldValue - 1);
          break;
      }
      return node.prefix ? newValue : oldValue;
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
        const fnEnv = new Scope(env, "function");
        node.params.forEach((p, i) => {
          fnEnv.declare(p.name);
          fnEnv.set(p.name, args[i]);
        });
        return evaluate(node.body, fnEnv);
      };
    }
    case "FunctionExpression": {
      const fn = function (...args) {
        const fnEnv = new Scope(env, "function");
        if (node.id?.name) {
          fnEnv.declare(node.id.name, "let", fn);
          Object.defineProperty(fn, "name", {
            value: node.id.name,
            configurable: true,
          });
        }
        node.params.forEach((p, i) => {
          fnEnv.declare(p.name);
          fnEnv.set(p.name, args[i]);
        });
        return evaluate(node.body, fnEnv);
      };

      return fn;
    }
    case "CallExpression": {
      const result = evaluate(node.callee, env);
      const fn = result?.type === "return" ? result.value : result;
      return fn.call(
        // bind this
        node.callee?.object && evaluate(node.callee.object, env),
        ...node.arguments.map((arg) => evaluate(arg, env))
      );
    }
    case "SequenceExpression":
      return node.expressions.reduce((_, exp) => evaluate(exp, env), undefined);
    case "ExpressionStatement":
      return evaluate(node.expression, env);
    case "IfStatement": {
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return node.alternate ? evaluate(node.alternate, env) : undefined;
      }
    }
    case "SwitchStatement": {
      const test = evaluate(node.discriminant, env);
      const blockEnv = new Scope(env);
      for (const $case of node.cases) {
        // not default
        if ($case.test && test === evaluate($case.test, env)) {
          for (const c of $case.consequent) {
            const result = evaluate(c, blockEnv);
            if (result) {
              return result;
            }
          }
        }
      }
      let isAfterDefault = false;
      for (const $case of node.cases) {
        if (!$case.test || isAfterDefault) {
          isAfterDefault = true;
          for (const c of $case.consequent) {
            const result = evaluate(c, blockEnv);
            if (result) {
              return result;
            }
          }
        }
      }
      return;
    }
    case "ForStatement": {
      const loopEnv = new Scope(env);
      let result;
      for (
        node.init && evaluate(node.init, loopEnv);
        node.test && evaluate(node.test, loopEnv);
        node.update && evaluate(node.update, loopEnv)
      ) {
        try {
          result = evaluate(node.body, loopEnv);
        } catch (abruptResult) {
          if (abruptResult?.target) {
            if (abruptResult?.target !== node.label) {
              throw abruptResult
            } else {
              if (abruptResult.type === 'break') {
                break;
              }
            }
          }
        }
      }
      return result?.type === "return" ? result : undefined;
    }
    case "WhileStatement": {
      let result;
      while (evaluate(node.test, env)) {
        result = evaluate(node.body, env);
      }
      return result?.type === "return" ? result : undefined;
    }
    case "ReturnStatement":
      return {
        type: "return",
        value: evaluate(node.argument, env),
      };
    case "ContinueStatement":
      if (node.label?.name) {
        throw {
          type: "continue",
          target: node.label?.name,
        };
      } else {
        return {
          type: "continue",
        };
      }
    case "ThrowStatement":
      throw evaluate(node.argument, env);
    case 'NewExpression':
      return new evaluate(node.callee, env)(...node.arguments.map((arg) => evaluate(arg, env)));
    case "BreakStatement":
      if (node.label?.name) {
        throw {
          type: "break",
          target: node.label?.name,
        };
      } else {
        return {
          type: "break",
        };
      }
    case "TryStatement": {
      let B, C, F;
      try {
        B = evaluate(node.block, env);
      } catch (error) {
        const catchEnv = new Scope(env);
        catchEnv.declare(node.handler.param.name, "let", error);
        C = evaluate(node.handler.body, catchEnv);
      } finally {
        F = evaluate(node.finalizer, env);
      }
      // see https://tc39.es/ecma262/#sec-try-statement-runtime-semantics-evaluation
      return F || C || B;
    }
    case "LabeledStatement": {
      node.body.label = node.label.name;
      return evaluate(node.body, env);
    }
    case "Program": {
      const globalEnv = new Scope(null, "global");
      globalEnv.declare('Error', 'let', Error);
      Object.entries(env).forEach(([k, v]) => {
        globalEnv.declare(k);
        globalEnv.set(k, v);
      });
      let result;
      for (const statement of node.body) {
        result = evaluate(statement, globalEnv);
        if (result?.type === "return") {
          return result.value;
        }
      }
      return result;
    }
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, {
    ecmaVersion: 6,
  });
  return evaluate(node, env);
}

module.exports = customerEval;
