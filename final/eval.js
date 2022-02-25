/* eslint-disable require-yield */
/* eslint-disable no-case-declarations */
/* eslint-disable no-fallthrough */
const acorn = require("acorn");
const Scope = require("./scope");
const { asyncToGenerator, setObjProperty } = require("./libs");

/**
 * 实现eval功能，采用生成器递归
 * @param {*} node
 * @param {Scope} scope
 * @returns String | Object
 */
function* evaluate(node, scope, options = {}) {
  if (!node) return true;
  switch (node.type) {
    // 入口
    case "Program": {
      let res;
      // declare in advance: var/function
      for (const stat of node.body) {
        if (stat?.type === "VariableDeclaration" && stat?.kind === "var") {
          evaluate.call(this, stat, scope, { preprocess: true }).next().value;
        }
        if (stat?.type === "FunctionDeclaration") {
          evaluate.call(this, stat, scope).next().value;
        }
      }

      for (const stat of node.body) {
        if (stat?.type === "FunctionDeclaration") continue;
        res = evaluate.call(this, stat, scope).next().value;
      }
      return res?.type ? res.value : res;
    }
    case "BlockStatement": {
      let res;
      const child = new Scope("Block", scope);

      // declare in advance: var/function
      for (const stat of node.body) {
        if (stat?.type === "VariableDeclaration" && stat?.kind === "var") {
          evaluate.call(this, stat, child, { preprocess: true }).next().value;
        }
        if (stat?.type === "FunctionDeclaration") {
          evaluate.call(this, stat, child).next().value;
        }
      }

      for (const stat of node.body) {
        if (stat?.type === "FunctionDeclaration") continue;
        let gen = evaluate.call(this, stat, child);

        while (true) {
          res = gen.next(res);
          if (!res.done) {
            res = yield res.value;
          } else {
            res = res.value;
            break;
          }
        }

        // Judege three types specially
        if (res && ["return", "break", "continue"].includes(res.type)) {
          return res;
        }
      }

      return res;
    }
    case "Literal": {
      return node.value;
    }
    case "Identifier": {
      switch (node.name) {
        // another way to process module.exports
        // case "module":
        //   return module;
        case "undefined":
          return undefined;
        case "null":
          return null;
        case "Boolean":
          return Boolean;
        case "Number":
          return Number;
        case "String":
          return String;
        case "Array":
          return Array;
        case "Date":
          return Date;
        case "RegExp":
          return RegExp;
        case "JSON":
          return JSON;
        case "Function":
          return Function;
        case "Object":
          return Object;
        case "Promise":
          return Promise;
        default:
          // global property
          if (options.setObj && !scope.has(node.name)) {
            scope.declare("var", node.name, true);
          }
          return scope.get(node.name);
      }
    }
    case "BinaryExpression": {
      let leftG = evaluate.call(this, node.left, scope);
      let rightG = evaluate.call(this, node.right, scope);
      let left, right;

      while (true) {
        left = leftG.next(left);
        if (!left.done) {
          left = yield left.value;
        } else {
          left = left.value;
          break;
        }
      }

      while (true) {
        right = rightG.next(right);
        if (!right.done) {
          right = yield right.value;
        } else {
          right = right.value;
          break;
        }
      }

      left = left?.type ? left?.value : left;
      right = right?.type ? right?.value : right;

      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
          return left % right;
        case "|":
          return left | right;
        case "&":
          return left & right;
        case "^":
          return left ^ right;
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
        case ">":
          return left > right;
        case "<<":
          return left << right;
        case ">>":
          return left >> right;
        case ">>>":
          return left >>> right;
        case "<=":
          return left <= right;
        case ">=":
          return left >= right;
        case "**":
          return left ** right;
        case "in":
          return left in right;
        case "instanceof":
          return left instanceof right;
      }
    }
    case "LogicalExpression": {
      let left = evaluate.call(this, node.left, scope).next().value;
      let right = evaluate.call(this, node.right, scope).next().value;
      left = left?.type ? left?.value : left;
      right = right?.type ? right?.value : right;
      switch (node.operator) {
        case "&&":
          return left && right;
        case "||":
          return left || right;
      }
    }
    case "FunctionDeclaration": {
      let name = node.id.name;
      let func;
      if (node.async) {
        func = asyncToGenerator(function* (...args) {
          // Except: AssignmentPattern
          const child = new Scope("Function", scope);
          node.params.forEach((param, _i) => {
            child.declare("let", param.name);
            child.set(param.name, args[_i]);
          });
          // meta
          child.declare("let", "new.target");
          child.set("new.target", new.target);

          let gen = evaluate.call(this, node.body, child);
          let res;

          while (true) {
            res = gen.next(res);
            if (!res.done) {
              res = yield res.value;
            } else {
              res = res.value;
              return res?.type ? res.value : res;
            }
          }
        });
      } else if (node.generator) {
        func = function* (...args) {
          // Except: AssignmentPattern
          const child = new Scope("Function", scope);
          node.params.forEach((param, _i) => {
            child.declare("let", param.name);
            child.set(param.name, args[_i]);
          });
          // meta
          child.declare("let", "new.target");
          child.set("new.target", new.target);

          let gen = evaluate.call(this, node.body, child);
          let res;

          while (true) {
            res = gen.next(res);
            if (!res.done) {
              res = yield res.value;
            } else {
              res = res.value;
              return res?.type ? res.value : res;
            }
          }
        };
      } else {
        func = function (...args) {
          // Except: AssignmentPattern
          const child = new Scope("Function", scope);
          node.params.forEach((param, _i) => {
            child.declare("let", param.name);
            child.set(param.name, args[_i]);
          });
          // meta
          child.declare("let", "new.target");
          child.set("new.target", new.target);

          let res = evaluate.call(this, node.body, child).next().value;
          if (res?.type === "return") return res.value;
        };
      }
      setObjProperty(func, "length", node.params.length);
      setObjProperty(func, "name", name);
      scope.declare("let", name);
      scope.set(name, func);
      return func;
    }
    case "FunctionExpression": {
      let func = function (...args) {
        const child = new Scope("Function", scope);
        node.params.forEach((param, _i) => {
          child.declare("let", param.name);
          child.set(param.name, args[_i]);
        });

        let res = evaluate.call(this, node.body, child).next().value;
        if (res?.type === "return") return res.value;
      };
      setObjProperty(func, "length", node.params.length);
      setObjProperty(func, "name", node.id?.name || options?.key);
      return func;
    }
    case "ArrowFunctionExpression": {
      let func = (...args) => {
        const child = new Scope("Function", scope);
        node.params.forEach((param, _i) => {
          child.declare("let", param.name);
          child.set(param.name, args[_i]);
        });
        let res = evaluate.call(this, node.body, child).next().value;
        // () => value || () => { return value; }
        if (node.body.type !== "BlockStatement") return res;
        if (res?.type === "return") return res.value;
      };
      setObjProperty(func, "length", node.params.length);
      options.key && setObjProperty(func, "name", options.key);
      return func;
    }
    case "CallExpression": {
      let callee = evaluate
        .call(this, node.callee, scope, { setObj: true })
        .next().value;
      let that = this;
      if (Array.isArray(callee)) {
        let [obj, prop] = callee;
        callee = obj[prop];
        that = obj;
      }

      return callee.apply(
        that,
        node.arguments.map(
          (subNode) => evaluate.call(this, subNode, scope).next().value
        )
      );
    }
    case "ConditionalExpression": {
      if (evaluate.call(this, node.test, scope).next().value) {
        return evaluate.call(this, node.consequent, scope).next().value;
      } else {
        return evaluate.call(this, node.alternate, scope).next().value;
      }
    }
    case "ObjectExpression": {
      let obj = {};
      node.properties.forEach((property) => {
        let key = property.key.name;
        if (property.kind === "init") {
          // obj[key] = evaluate.call(obj, property.value, scope, { key }).next().value;
          obj[key] = evaluate
            .call(this, property.value, scope, { key })
            .next().value;
        } else {
          // get or set
          Object.defineProperty(obj, key, {
            [property.kind]: evaluate
              .call(this, property.value, scope, {
                key,
              })
              .next().value,
          });
        }
      });
      return obj;
    }
    case "ArrayExpression":
      return node.elements.map(
        (element) => evaluate.call(this, element, scope).next().value
      );
    case "VariableDeclaration": {
      for (const varibale of node.declarations) {
        let name = varibale.id.name;
        scope.declare(node.kind, name);
        if (!options?.preprocess && varibale.init !== null) {
          let res;
          let gen = evaluate.call(this, varibale.init, scope, {
            key: varibale.id?.name,
          });

          while (true) {
            res = gen.next(res);
            if (!res.done) {
              res = yield res.value;
            } else {
              res = res.value;
              break;
            }
          }

          scope.set(name, res?.value ? res.value : res);
        }
      }
    }
    case "ExpressionStatement": {
      let res;
      let gen = evaluate.call(this, node.expression, scope);
      while (true) {
        res = gen.next(res);
        if (!res.done) {
          res = yield res.value;
        } else {
          return res.value;
        }
      }
    }
    case "AssignmentExpression": {
      let left = evaluate
        .call(this, node.left, scope, { setObj: true })
        .next().value;
      let right = evaluate.call(this, node.right, scope).next().value;
      let obj, prop;

      if (Array.isArray(left)) {
        [obj, prop] = left;
        left = obj[prop];
      }

      switch (node.operator) {
        case "=":
          left = right;
          break;
        case "+=":
          left += right;
          break;
        case "-=":
          left -= right;
          break;
        case "*=":
          left *= right;
          break;
        case "/=":
          left /= right;
          break;
        case "%=":
          left %= right;
          break;
        case "<<=":
          left <<= right;
          break;
        case ">>=":
          left >>= right;
          break;
        case ">>>=":
          left >>>= right;
          break;
        case "|=":
          left |= right;
          break;
        case "^=":
          left ^= right;
          break;
        case "&=":
          left &= right;
          break;
      }

      // Assign to scope
      if (node.left.type === "Identifier") {
        scope.set(node.left.name, left);
      } else {
        obj[prop] = left;
      }
      return left;
    }
    case "UnaryExpression": {
      switch (node.operator) {
        case "+":
          return +evaluate.call(this, node.argument, scope).next().value;
        case "-":
          return -evaluate.call(this, node.argument, scope).next().value;
        case "!":
          return !evaluate.call(this, node.argument, scope).next().value;
        case "~":
          return ~evaluate.call(this, node.argument, scope).next().value;
        case "typeof":
          if (node.argument.name && !scope.has(node.argument.name))
            return "undefined";
          else
            return typeof evaluate.call(this, node.argument, scope).next()
              .value;
        case "void":
          return void evaluate.call(this, node.argument, scope).next().value;
        case "delete":
          let [obj, prop] = evaluate
            .call(this, node.argument, scope, {
              setObj: true,
            })
            .next().value;
          return delete obj[prop];
      }
    }
    // Notes: prefix
    case "UpdateExpression": {
      let res = evaluate
        .call(this, node.argument, scope, { setObj: true })
        .next().value;
      let obj,
        prop,
        copy = res;
      if (res instanceof Array) {
        [obj, prop] = res;
        res = obj[prop];
        copy = obj[prop];
      }

      switch (node.operator) {
        case "++":
          res++;
          break;
        case "--":
          res--;
          break;
      }

      // update scope
      if (node.argument.type === "Identifier") {
        scope.set(node.argument.name, res);
      } else {
        obj[prop] = res;
      }

      if (node.prefix) {
        return res;
      } else {
        return copy;
      }
    }
    // Meta stored in scope
    case "MetaProperty": {
      if (node.meta.name === "new" && node.property.name === "target") {
        return scope.get("new.target");
      }
      return;
    }
    // Notes: computed attribute
    case "MemberExpression": {
      let prop = node.computed
        ? evaluate.call(this, node.property, scope).next().value
        : node.property.name;
      let obj = evaluate.call(this, node.object, scope).next().value;
      return options?.setObj ? [obj, prop] : obj[prop];
    }
    case "IfStatement": {
      const child = new Scope("Block", scope);
      if (evaluate.call(this, node.test, child).next().value) {
        return evaluate.call(this, node.consequent, child).next().value;
      } else {
        return node.alternate
          ? evaluate.call(this, node.alternate, child).next().value
          : undefined;
      }
    }
    case "ForStatement": {
      const child = new Scope("Block", scope);
      let res = evaluate.call(this, node.init, child).next().value;
      while (evaluate.call(this, node.test, child).next().value) {
        res = evaluate.call(this, node.body, child).next().value;
        if (res && res.type === "return") return res;
        if (res && res.type === "await") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label)) {
            evaluate.call(this, node.update, child).next().value;
            continue;
          } else return res;
        }
        evaluate.call(this, node.update, child).next().value;
      }
      return res?.type ? res.value : res;
    }
    case "ForOfStatement": {
      let res;
      const child = new Scope("Block", scope);
      const variable = node.left.declarations[0].id.name; // bug here
      const arr = evaluate.call(this, node.right, scope).next().value;
      evaluate.call(this, node.left, child).next().value;
      for (const el of arr) {
        child.set(variable, el);
        res = evaluate.call(this, node.body, child).next().value;
        if (res && res.type === "return") return res;
        if (res && res.type === "await") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label)) {
            evaluate.call(this, node.update, child).next().value;
            continue;
          } else return res;
        }
      }
      return res?.type ? res.value : res;
    }
    case "DoWhileStatement": {
      let res;
      const child = new Scope("Block", scope);
      do {
        res = evaluate.call(this, node.body, child).next().value;
        if (res && res.type === "return") return res;
        if (res && res.type === "await") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label))
            continue;
          else return res;
        }
      } while (evaluate.call(this, node.test, child).next().value);
      return res?.type ? res.value : res;
    }
    case "WhileStatement": {
      let res;
      const child = new Scope("Block", scope);
      while (evaluate.call(this, node.test, child).next().value) {
        res = evaluate.call(this, node.body, child).next().value;
        if (res && res.type === "return") return res;
        if (res && res.type === "await") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label))
            continue;
          else return res;
        }
      }
      return res?.type ? res.value : res;
    }
    case "SwitchStatement": {
      let res;
      const child = new Scope("Block", scope);
      const target = evaluate.call(this, node.discriminant, child).next().value;
      for (let switchcase of node.cases) {
        if (
          switchcase.test === null ||
          evaluate.call(this, switchcase.test, child).next().value === target
        ) {
          for (const stat of switchcase.consequent) {
            res = evaluate.call(this, stat, child).next().value;
            if (res && res.type === "return") return res;
            if (res && res.type === "await") return res;
            if (res && res.type === "break") break;
            if (res && res.type === "continue") return res;
          }
          // true judge for break
          if (res && res.type === "break") {
            if (!res.label || (res.label && res.label === options.label)) break;
            else return res;
          }
        }
      }
      return res?.type ? res.value : res;
    }
    case "TryStatement": {
      let res;
      try {
        const child = new Scope("Block", scope);
        for (const stat of node.block.body) {
          res = evaluate.call(this, stat, child).next().value;
          if (
            res &&
            ["return", "await", "break", "continue"].includes(res.type)
          ) {
            return res;
          }
        }
      } catch (error) {
        const child = new Scope("Block", scope);
        let subnode = node.handler;

        child.declare("let", subnode.param.name);
        child.set(subnode.param.name, error);
        res = evaluate.call(this, subnode.body, child).next().value;
        return res;
      } finally {
        const child = new Scope("Block", scope);
        res = evaluate.call(this, node.finalizer, child).next().value;
      }
      return res;
    }
    case "ThrowStatement":
      throw node.argument.value;
    case "LabeledStatement": {
      return evaluate
        .call(this, node.body, scope, {
          label: node.label.name,
        })
        .next().value;
    }
    case "SequenceExpression": {
      let res;
      for (const stat of node.expressions) {
        res = evaluate.call(this, stat, scope).next().value;
      }
      return res;
    }
    case "NewExpression": {
      let newObj = evaluate.call(this, node.callee, scope).next().value;
      return new (newObj.bind.apply(
        newObj,
        [null].concat(
          node.arguments.map((argument) => {
            return evaluate.call(this, argument, scope).next().value;
          })
        )
      ))();
    }
    case "ThisExpression": {
      return this === global ? undefined : this;
    }
    case "AwaitExpression":
    case "YieldExpression": {
      yield evaluate.call(this, node.argument, scope).next().value;
      return;
    }
    // skip: disable in strict mode
    case "WithStatement": {
      return;
    }
    // no meaning
    case "EmptyStatement": {
      return { type: "Empty" };
    }
    case "DebuggerStatement":
      return { type: "debugger" };
    case "ContinueStatement":
      return { type: "continue", label: node.label?.name };
    case "BreakStatement":
      return { type: "break", label: node.label?.name };
    case "ReturnStatement":
      return {
        type: "return",
        value: evaluate.call(this, node.argument, scope).next().value,
      };
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customEval(code, scope = new Scope("Global")) {
  scope.declare("let", "module");
  scope.set("module", { exports: {} });

  const node = acorn.parse(code, {
    ecmaVersion: "latest",
  });

  let gen = evaluate.call(this, node, scope);
  let temp = { done: false };
  while (!temp.done) {
    temp = gen.next();
  }

  return scope.get("module").exports;
}

module.exports = {
  customEval,
  Scope,
};
