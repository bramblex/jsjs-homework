const acorn = require("acorn");
const Scope = require("./scope");
const InterruptBlock = require("./interruptBlock");

/**
 * 实现完整的ES5解释器
 * @param {Node} node
 * @param {Scope} scope
 * @returns 返回JS表达式运算结果
 */
function evaluate(node, scope) {
  switch (node.type) {
    case "Program": {
      let res;
      for (statement of node.body) {
        res = evaluate(statement, scope);
      }
      return res;
    }
    case "Literal": {
      return node.value;
    }
    case "Identifier": {
      return scope.get(node.name);
    }
    case "ExpressionStatement": {
      return evaluate(node.expression, scope);
    }
    case "CallExpression": {
      let callee = evaluate(node.callee, scope);
      let args = node.arguments.map((arg) => evaluate(arg, scope));
      return callee(...args);
    }
    case "ArrowFunctionExpression": {
      return function (...args) {
        let functionScope = new Scope("Function", scope);
        node.params.map((param, index) => {
          functionScope.declare("let", param.name, args[index]);
        });
        return evaluate(node.body, functionScope);
      };
    }
    case "BlockStatement": {
      let blockScope = new Scope("Block", scope);
      let res;
      for (const expression of node.body) {
        res = evaluate(expression, blockScope);
        if (InterruptBlock.isReturn(res)) return res.value;
        if (InterruptBlock.isContinue(res)) return res;
        if (InterruptBlock.isBreak(res)) return res;
      }
      return res;
    }
    case "VariableDeclaration": {
      node.declarations.forEach((variableDeclarator) => {
        const result = evaluate(variableDeclarator, scope);
        scope.declare(node.kind, result.name, result.value);
      });
      return;
    }
    case "VariableDeclarator": {
      const name = node.id.name;
      const value = node.init ? evaluate(node.init, scope) : undefined;
      return {
        name: name,
        value: value,
      };
    }
    case "IfStatement": {
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      } else {
        if (node.alternate) {
          return evaluate(node.alternate, scope);
        }
      }
      return;
    }
    case "BinaryExpression": {
      const left = evaluate(node.left, scope);
      const right = evaluate(node.right, scope);

      switch (node.operator) {
        case ">":
          return left > right;
        case "<":
          return left < right;
        case "===":
          return left === right;
      }
    }
    case "ReturnStatement": {
      return new InterruptBlock("return", evaluate(node.argument, scope));
    }
    case "BreakStatement": {
      return new InterruptBlock("break");
    }
    case "ContinueStatement": {
      return new InterruptBlock("continue");
    }
    case "ForStatement": {
      // 循环定义索引的作用域
      let forScope = new Scope("Block", scope);
      const label = scope.label;
      let res;
      for (
        evaluate(node.init, forScope);
        evaluate(node.test, forScope);
        evaluate(node.update, forScope)
      ) {
        // 每次遍历内部作用域
        let forInScope = new Scope("Block", forScope);
        res = evaluate(node.body, forInScope);
        if (res?.type) {
          if (res.type === "continue") {
            if (!res?.label || res?.label === label) {
              continue;
            } else {
              return res;
            }
          }

          if (res.type === "break") {
            if (!res?.label || res?.label === label) {
              break;
            } else {
              return res;
            }
          }

          if (res.type === "return") {
            return res.value;
          }
        }
      }
      return;
    }
    case "WhileStatement": {
      const label = scope.label;
      while (evaluate(node.test, scope)) {
        let whileScope = new Scope("Block", scope);
        const res = evaluate(node.body, whileScope);

        if (res?.type) {
          if (res.type === "continue") {
            if (!res?.label || res.label === label) {
              continue;
            } else {
              return res;
            }
          } else if (res.type === "break") {
            if (!res?.label || res.label === label) {
              break;
            } else {
              return res;
            }
          } else if (res.type === "return") {
            console.log("res.value: ", res.value);
            return res.value;
          }
        }
      }
      return;
    }
    case "UpdateExpression": {
      switch (node.operator) {
        case "++":
          let argVal = scope.get(node.argument.name);
          scope.set(node.argument.name, argVal + 1);
      }
      return;
    }
    case "AssignmentExpression": {
      let leftVal = evaluate(node.left, scope);
      let rightVal = evaluate(node.right, scope);
      switch (node.operator) {
        case "+=":
          scope.set(node.left.name, leftVal + rightVal);
          break;
        case "*=":
          scope.set(node.left.name, leftVal * rightVal);
          break;
        case "=":
          scope.set(node.left.name, rightVal);
          break;
        default:
          break;
      }
      return;
    }
    case "LabeledStatement": {
      scope.label = node.label.name;
      return evaluate(node.body, scope);
    }
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customerEval(code, scope) {
  scope = new Scope("Block", null);
  const node = acorn.parse(code, 0, {
    ecmaVersion: 5,
  });
  return evaluate(node, scope);
}

module.exports = customerEval;
