/* eslint-disable no-case-declarations */
/* eslint-disable no-fallthrough */
const acorn = require("acorn");
const Scope = require("./scope");

/**
 * 修改对象 obj 上的不可变变量
 * @param {Object} obj
 * @param {String} prop
 * @param {String} val
 */
function setObjProperty(obj, prop, val) {
  let config = Object.getOwnPropertyDescriptor(obj, prop);
  config.writable = true;
  Object.defineProperty(obj, prop, config);
  obj[prop] = val;
  // config.writable = false;
  // Object.defineProperty(obj, prop, config);
}

/**
 * 实现eval功能
 * @param {*} node
 * @param {Scope} scope
 * @returns String | Object
 */
function evaluate(node, scope, options = {}) {
  if (!node) return true;

  switch (node.type) {
    // entrance
    case "Program": {
      let res;
      // declare in advance: var/function
      for (const stat of node.body) {
        if (stat?.type === "VariableDeclaration" && stat?.kind === "var") {
          evaluate.call(this, stat, scope, { preprocess: true });
        }
        if (stat?.type === "FunctionDeclaration") {
          evaluate.call(this, stat, scope);
        }
      }

      for (const stat of node.body) {
        if (stat?.type === "FunctionDeclaration") continue;
        res = evaluate.call(this, stat, scope);
      }
      return res?.type ? res.value : res;
    }
    case "BlockStatement": {
      let res;
      const child = new Scope("Block", scope);

      // declare in advance: var/function
      for (const stat of node.body) {
        if (stat?.type === "VariableDeclaration" && stat?.kind === "var") {
          evaluate.call(this, stat, child, { preprocess: true });
        }
        if (stat?.type === "FunctionDeclaration") {
          evaluate.call(this, stat, child);
        }
      }

      for (const stat of node.body) {
        if (stat?.type === "FunctionDeclaration") continue;
        res = evaluate.call(this, stat, child);
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
        default:
          // global property
          if (options.setObj && !scope.has(node.name)) {
            scope.declare("var", node.name, true);
          }
          return scope.get(node.name);
      }
    }
    case "BinaryExpression":
      switch (node.operator) {
        case "+":
          return (
            evaluate.call(this, node.left, scope) +
            evaluate.call(this, node.right, scope)
          );
        case "-":
          return (
            evaluate.call(this, node.left, scope) -
            evaluate.call(this, node.right, scope)
          );
        case "*":
          return (
            evaluate.call(this, node.left, scope) *
            evaluate.call(this, node.right, scope)
          );
        case "/":
          return (
            evaluate.call(this, node.left, scope) /
            evaluate.call(this, node.right, scope)
          );
        case "%":
          return (
            evaluate.call(this, node.left, scope) %
            evaluate.call(this, node.right, scope)
          );
        case "|":
          return (
            evaluate.call(this, node.left, scope) |
            evaluate.call(this, node.right, scope)
          );
        case "&":
          return (
            evaluate.call(this, node.left, scope) &
            evaluate.call(this, node.right, scope)
          );
        case "^":
          return (
            evaluate.call(this, node.left, scope) ^
            evaluate.call(this, node.right, scope)
          );
        case "==":
          return (
            evaluate.call(this, node.left, scope) ==
            evaluate.call(this, node.right, scope)
          );
        case "!=":
          return (
            evaluate.call(this, node.left, scope) !=
            evaluate.call(this, node.right, scope)
          );
        case "===":
          return (
            evaluate.call(this, node.left, scope) ===
            evaluate.call(this, node.right, scope)
          );
        case "!==":
          return (
            evaluate.call(this, node.left, scope) !==
            evaluate.call(this, node.right, scope)
          );
        case "<":
          return (
            evaluate.call(this, node.left, scope) <
            evaluate.call(this, node.right, scope)
          );
        case ">":
          return (
            evaluate.call(this, node.left, scope) >
            evaluate.call(this, node.right, scope)
          );
        case "<<":
          return (
            evaluate.call(this, node.left, scope) <<
            evaluate.call(this, node.right, scope)
          );
        case ">>":
          return (
            evaluate.call(this, node.left, scope) >>
            evaluate.call(this, node.right, scope)
          );
        case ">>>":
          return (
            evaluate.call(this, node.left, scope) >>>
            evaluate.call(this, node.right, scope)
          );
        case "<=":
          return (
            evaluate.call(this, node.left, scope) <=
            evaluate.call(this, node.right, scope)
          );
        case ">=":
          return (
            evaluate.call(this, node.left, scope) >=
            evaluate.call(this, node.right, scope)
          );
        case "**":
          return (
            evaluate.call(this, node.left, scope) **
            evaluate.call(this, node.right, scope)
          );
        case "in":
          return (
            evaluate.call(this, node.left, scope) in
            evaluate.call(this, node.right, scope)
          );
        case "instanceof":
          return (
            evaluate.call(this, node.left, scope) instanceof
            evaluate.call(this, node.right, scope)
          );
      }
    case "LogicalExpression":
      switch (node.operator) {
        case "&&":
          return (
            evaluate.call(this, node.left, scope) &&
            evaluate.call(this, node.right, scope)
          );
        case "||":
          return (
            evaluate.call(this, node.left, scope) ||
            evaluate.call(this, node.right, scope)
          );
      }
    case "FunctionDeclaration": {
      let name = node.id.name;
      let func = function (...args) {
        // Except: AssignmentPattern
        const child = new Scope("Function", scope);
        node.params.forEach((param, _i) => {
          child.declare("let", param.name);
          child.set(param.name, args[_i]);
        });
        // meta
        child.declare("let", "new.target");
        child.set("new.target", new.target);

        let res = evaluate.call(this, node.body, child);
        return res?.type ? res.value : res;
      };
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

        let res = evaluate.call(this, node.body, child);
        return res?.type ? res.value : res;
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
        let res = evaluate.call(this, node.body, child);
        return res?.type ? res.value : res;
      };
      setObjProperty(func, "length", node.params.length);
      options.key && setObjProperty(func, "name", options.key);
      return func;
    }
    case "CallExpression": {
      let callee = evaluate.call(this, node.callee, scope, { setObj: true });
      let that = this;
      if (Array.isArray(callee)) {
        let [obj, prop] = callee;
        callee = obj[prop];
        that = obj;
      }
      return callee.apply(
        that,
        node.arguments.map((subNode) => evaluate.call(this, subNode, scope))
      );
    }
    case "ConditionalExpression": {
      if (evaluate.call(this, node.test, scope)) {
        return evaluate.call(this, node.consequent, scope);
      } else {
        return evaluate.call(this, node.alternate, scope);
      }
    }
    case "ObjectExpression": {
      let obj = {};
      node.properties.forEach((property) => {
        let key = property.key.name;
        if (property.kind === "init") {
          // obj[key] = evaluate.call(obj, property.value, scope, { key });
          obj[key] = evaluate.call(this, property.value, scope, { key });
        } else {
          // get or set
          Object.defineProperty(obj, key, {
            [property.kind]: evaluate.call(this, property.value, scope, {
              key,
            }),
          });
        }
      });
      return obj;
    }
    case "ArrayExpression":
      return node.elements.map((element) =>
        evaluate.call(this, element, scope)
      );
    case "VariableDeclaration": {
      for (const varibale of node.declarations) {
        let name = varibale.id.name;
        scope.declare(node.kind, name);
        if (!options?.preprocess && varibale.init !== null) {
          scope.set(
            name,
            evaluate.call(this, varibale.init, scope, { key: node.id?.name })
          );
        }
      }
      return undefined;
    }
    case "ExpressionStatement":
      return evaluate.call(this, node.expression, scope);
    /**
     *  enum AssignmentOperator {
     *      "=" | "+=" | "-=" | "*=" | "/=" | "%="
     *          | "<<=" | ">>=" | ">>>="
     *          | "|=" | "^=" | "&="
     *  }
     */
    case "AssignmentExpression": {
      let left = evaluate.call(this, node.left, scope, { setObj: true });
      let right = evaluate.call(this, node.right, scope);
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
        // ...
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
          return +evaluate.call(this, node.argument, scope);
        case "-":
          return -evaluate.call(this, node.argument, scope);
        case "!":
          return !evaluate.call(this, node.argument, scope);
        case "~":
          return ~evaluate.call(this, node.argument, scope);
        case "typeof":
          if (node.argument.name && !scope.has(node.argument.name))
            return "undefined";
          else return typeof evaluate.call(this, node.argument, scope);
        case "void":
          return void evaluate.call(this, node.argument, scope);
        case "delete":
          let [obj, prop] = evaluate.call(this, node.argument, scope, {
            setObj: true,
          });
          return delete obj[prop];
      }
    }
    // Notes: prefix
    case "UpdateExpression": {
      let res = evaluate.call(this, node.argument, scope, { setObj: true });
      let obj,
        prop,
        copy = res;
      if (typeof res === "object") {
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
        ? evaluate.call(this, node.property, scope)
        : node.property.name;
      let obj = evaluate.call(this, node.object, scope);
      return options?.setObj ? [obj, prop] : obj[prop];
    }
    case "IfStatement": {
      const child = new Scope("Block", scope);
      if (evaluate.call(this, node.test, child)) {
        return evaluate.call(this, node.consequent, child);
      } else {
        return node.alternate
          ? evaluate.call(this, node.alternate, child)
          : undefined;
      }
    }
    case "ForStatement": {
      const child = new Scope("Block", scope);
      let res = evaluate.call(this, node.init, child);
      while (evaluate.call(this, node.test, child)) {
        res = evaluate.call(this, node.body, child);
        if (res && res.type === "return") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label)) {
            evaluate.call(this, node.update, child);
            continue;
          } else return res;
        }
        evaluate.call(this, node.update, child);
      }
      return res?.type ? res.value : res;
    }
    case "ForOfStatement": {
      let res;
      const child = new Scope("Block", scope);
      const variable = node.left.declarations[0].id.name; // bug here
      const arr = evaluate.call(this, node.right, scope);
      evaluate.call(this, node.left, child);
      for (const el of arr) {
        child.set(variable, el);
        res = evaluate.call(this, node.body, child);
        if (res && res.type === "return") return res;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === options.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === options.label)) {
            evaluate.call(this, node.update, child);
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
        res = evaluate.call(this, node.body, child);
        if (res && res.type === "return") return res;
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
      } while (evaluate.call(this, node.test, child));
      return res?.type ? res.value : res;
    }
    case "WhileStatement": {
      let res;
      const child = new Scope("Block", scope);
      while (evaluate.call(this, node.test, child)) {
        res = evaluate.call(this, node.body, child);
        if (res && res.type === "return") return res;
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
      const target = evaluate.call(this, node.discriminant, child);
      for (let switchcase of node.cases) {
        if (
          switchcase.test === null ||
          evaluate.call(this, switchcase.test, child) === target
        ) {
          for (const stat of switchcase.consequent) {
            res = evaluate.call(this, stat, child);
            if (res && res.type === "return") return res;
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
          res = evaluate.call(this, stat, child);
          if (res && ["return", "break", "continue"].includes(res.type)) {
            return res;
          }
        }
      } catch (error) {
        const child = new Scope("Block", scope);
        let subnode = node.handler;

        child.declare("let", subnode.param.name);
        child.set(subnode.param.name, error);
        res = evaluate.call(this, subnode.body, child);
        return res;
      } finally {
        const child = new Scope("Block", scope);
        res = evaluate.call(this, node.finalizer, child);
      }
      return res;
    }
    case "ThrowStatement":
      throw node.argument.value;
    case "LabeledStatement": {
      return evaluate.call(this, node.body, scope, {
        label: node.label.name,
      });
    }
    case "SequenceExpression": {
      let res;
      for (const stat of node.expressions) {
        res = evaluate.call(this, stat, scope);
      }
      return res;
    }
    case "NewExpression": {
      let newObj = evaluate.call(this, node.callee, scope);
      return new (newObj.bind.apply(
        newObj,
        [null].concat(
          node.arguments.map((argument) => {
            return evaluate.call(this, argument, scope);
          })
        )
      ))();
    }
    case "ThisExpression": {
      return this;
    }
    // skip: disable in strict mode
    case "WithStatement": {
      return;
    }
    // no meaning
    case "EmptyStatement": {
      return;
    }
    case "DebuggerStatement":
      return; // return { type: "debugger" };
    // construct three special type
    case "ContinueStatement":
      return { type: "continue", label: node.label?.name };
    case "BreakStatement":
      return { type: "break", label: node.label?.name };
    case "ReturnStatement":
      return {
        type: "return",
        value: evaluate.call(this, node.argument, scope),
      };
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customEval(code, scope = new Scope("Global")) {
  scope.declare("const", "module");
  scope.set("module", { exports: {} });

  const node = acorn.parse(code, {
    ecmaVersion: 6,
  });

  // return evaluate.call(this, node, scope);
  evaluate.call(this, node, scope);
  return scope.get("module").exports;
}

module.exports = {
  customEval,
  Scope,
};
