const acorn = require("acorn");
const Scope = require("./scope");
const Signal = require("./signal");

function evaluate(node, scope) {
  switch (node.type) {
    case "Program": {
      for (const child of node.body) return evaluate(child, scope);
    }

    case "Literal": {
      return node.value;
    }

    case "Identifier": {
      return scope.get(node.name).value;
    }

    case "ExpressionStatement": {
      return evaluate(node.expression, scope);
    }

    case "CallExpression": {
      // 获取函数体
      const func = evaluate(node.callee, scope);
      // 获取参数
      const args = node.arguments.map((arg) => evaluate(arg, scope));

      let obj = null;

      // 处理成员函数表达式，eg: obj.method
      if (node.callee.type === "MemeberExpression") {
        obj = evaluate(node.callee.object, scope);
      }

      return func.apply(obj, args);
    }

    case "ArrowFunctionExpression": {
      return function (...args) {
        const newScope = new Scope("function", scope);

        // 在新作用域中声明参数
        for (let i = 0; i < node.params.length; i++) {
          const { name } = node.params[i];
          newScope.declare("let", name, args[i]);
        }

        return evaluate(node.body, newScope);
      };
    }

    case "BlockStatement": {
      const newScope = new Scope("block", scope);
      
      let res;
      for (let i = 0; i < node.body.length; i++) {
        res = evaluate(node.body[i], newScope);
        if (Signal.isReturn(res)) return res.value;
        if (Signal.isBreak(res)) return res;
        if (Signal.isContinue(res)) return;
      }
      
      return res;
    }

    case "VariableDeclaration": {
      const kind = node.kind;
      node.declarations.forEach((declarator) => {
        const { name } = declarator.id;
        const value = declarator.init
          ? evaluate(declarator.init, scope)
          : undefined;

        scope.declare(kind, name, value);
      });
      return;
    }

    case "IfStatement": {
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      } else if (node.alternate) {
        return evaluate(node.alternate, scope);
      }
    }

    case "BinaryExpression": {
      const left = evaluate(node.left, scope);
      const right = evaluate(node.right, scope);

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "==":
          return left == right;
        case "!=":
          return left != right;
        case "===":
          return left === right;
        case "!==":
          return left !== right;
        case "<":
          return left < right;
        case "<=":
          return left <= right;
        case ">":
          return left > right;
        case ">=":
          return left >= right;
        case "<<":
          return left << right;
        case ">>":
          return left >> right;
        case ">>>":
          return left >>> right;
        case "%":
          return left % right;
        case "|":
          return left | right;
        case "^":
          return left ^ right;
        case "&":
          return left & right;
        case "in":
          return left in right;
        case "instanceof":
          return left instanceof right;

        default:
          break;
      }
    }

    case "BreakStatement": {
      return new Signal("break");
    }

    case "ContinueStatement": {
      return new Signal("continue");
    }

    case "ReturnStatement": {
      return new Signal("return", node.argument ? evaluate(node.argument, scope) : undefined);
    }

    case "SequenceExpression": {
      let last;

      for (const expression of node.expressions) {
        last = evaluate(expression, scope);
      }

      return last;
    }

    case "ConditionalExpression": {
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      } else {
        return evaluate(node.alternate, scope);
      }
    }

    case "AssignmentExpression": {
      const value = evaluate(node.right, scope);
      const name = node.left.name;

      switch (node.operator) {
        case "=": {
          scope.set(name, value);
          return;
        }

        case "+=": {
          let pre = scope.get(name).value;
          scope.set(name, pre + value);
          return;
        }
        
        case "*=": {
          let pre = scope.get(name).value;
          scope.set(name, pre * value);
          return;
        }
      }
    }

    case "ForStatement": {
      let res;
      for (
        const newScope = new Scope("loop", scope),
        init = node.init ? evaluate(node.init, newScope) : null;
        evaluate(node.test, newScope);
        evaluate(node.update, newScope)
      ) {
        res = evaluate(node.body, newScope);
        if (Signal.isReturn(res)) return res.value;
        if (Signal.isBreak(res)) return res;
        if (Signal.isContinue(res)) return;
      }

      return res;
    }

    case "WhileStatement": {
      let res;

      while(evaluate(node.test, scope)) {
        const newScope = new Scope("loop", scope);
        res = evaluate(node.body, newScope);

        if (Signal.isReturn(res)) return res.value;
        if (Signal.isBreak(res)) return res;
        if (Signal.isContinue(res)) return;
      }

      return res;
    }

    case "UpdateExpression": {
      const name = node.argument.name;
      let value = scope.get(name).value;
      const prefix = node.prefix;

      switch (node.operator) {
        case "++": {
          scope.set(name, value + 1);
          return prefix ? ++value : value++;
        }

        case "--": {
          scope.set(name, value - 1);
          return prefix ? --value : value--;
        }
      }
    }
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6,
  });
  const scope = new Scope();

  return evaluate(node, scope);
}

module.exports = customerEval;
