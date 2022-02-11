const acorn = require("acorn");
const Scope = require("./scope");

/**
 * 实现eval
 * @param {*} node
 * @param {Scope} scope
 * @returns String | Object
 */
function evaluate(node, scope) {
  switch (node.type) {
    // entrance
    case "Program": {
      let res;
      for (const stat of node.body) {
        res = evaluate(stat, scope);
      }
      return res;
    }
    case "Literal": {
      return node.value;
    }
    case "Identifier": {
      return scope.get(node.name);
    }
    case "BinaryExpression":
      switch (node.operator) {
        case "+":
          return evaluate(node.left, scope) + evaluate(node.right, scope);
        case "-":
          return evaluate(node.left, scope) - evaluate(node.right, scope);
        case "*":
          return evaluate(node.left, scope) * evaluate(node.right, scope);
        case "/":
          return evaluate(node.left, scope) / evaluate(node.right, scope);
        case "%":
          return evaluate(node.left, scope) % evaluate(node.right, scope);
        case "|":
          return evaluate(node.left, scope) | evaluate(node.right, scope);
        case "&":
          return evaluate(node.left, scope) & evaluate(node.right, scope);
        case "^":
          return evaluate(node.left, scope) ^ evaluate(node.right, scope);
        case "==":
          return evaluate(node.left, scope) == evaluate(node.right, scope);
        case "!=":
          return evaluate(node.left, scope) != evaluate(node.right, scope);
        case "===":
          return evaluate(node.left, scope) === evaluate(node.right, scope);
        case "!==":
          return evaluate(node.left, scope) !== evaluate(node.right, scope);
        case "<":
          return evaluate(node.left, scope) < evaluate(node.right, scope);
        case ">":
          return evaluate(node.left, scope) > evaluate(node.right, scope);
        case "<<":
          return evaluate(node.left, scope) << evaluate(node.right, scope);
        case ">>":
          return evaluate(node.left, scope) >> evaluate(node.right, scope);
        case ">>>":
          return evaluate(node.left, scope) >>> evaluate(node.right, scope);
        case "<=":
          return evaluate(node.left, scope) <= evaluate(node.right, scope);
        case ">=":
          return evaluate(node.left, scope) <= evaluate(node.right, scope);
        case "in":
          return evaluate(node.left, scope) in evaluate(node.right, scope);
        case "instanceof":
          return (
            evaluate(node.left, scope) instanceof evaluate(node.right, scope)
          );
      }
    case "LogicalExpression":
      switch (node.operator) {
        case "&&":
          return evaluate(node.left, scope) && evaluate(node.right, scope);
        case "||":
          return evaluate(node.left, scope) || evaluate(node.right, scope);
      }
    case "FunctionExpression":
    case "ArrowFunctionExpression":
      let res;
      return function (...args) {
        const child = new Scope("Function", scope);
        node.params.forEach((param, _i) => {
          child.declare(param.name);
          child.set(param.name, args[_i]);
        });
        res = evaluate(node.body, child);
        return res.type ? res.value : res;
      };
    case "CallExpression":
      return evaluate(
        node.callee,
        scope
      )(...node.arguments.map((subNode) => evaluate(subNode, scope)));
    case "ConditionalExpression": {
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      } else {
        return evaluate(node.alternate, scope);
      }
    }
    case "ObjectExpression": {
      let obj = {};
      node.properties.forEach((property) => {
        obj[property.key.name] = evaluate(property.value, scope);
      });
      return obj;
    }
    case "ArrayExpression":
      return node.elements.map((element) => evaluate(element, scope));
    case "BlockStatement": {
      let res;
      const child = new Scope("Block", scope);
      for (const stat of node.body) {
        res = evaluate(stat, child);
        // Judege three types specially
        if (res && res.type === "return") return res;
        if (res && res.type === "continue") return res;
        if (res && res.type === "break") return res;
      }
      return res;
    }
    case "VariableDeclaration": {
      for (const varibale of node.declarations) {
        let name = varibale.id.name;
        scope.declare(node.kind, name);
        scope.set(name, evaluate(varibale.init, scope));
      }
      return undefined;
    }
    case "ExpressionStatement":
      return evaluate(node.expression, scope);
    case "AssignmentExpression": {
      let left = evaluate(node.left, scope);
      let right = evaluate(node.right, scope);

      switch (node.operator) {
        case "=":
          left = right;
          break;
        case "*=":
          left *= right;
          break;
        case "+=":
          left += right;
          break;
      }

      // Assign to scope
      if (node.left.type === "Identifier") {
        scope.set(node.left.name, left);
      } else {
        // get the root object
        let subNode = node.left;
        let props = [];
        while (subNode.type === "MemberExpression") {
          if (subNode.computed) {
            props.push(evaluate(subNode.property, scope));
          } else {
            props.push(subNode.property.name);
          }
          subNode = subNode.object;
        }
        // set the root object by leftval's parent
        let obj = scope.get(subNode.name);
        while (props.length !== 1) {
          obj = obj[props.pop()];
        }
        obj[props.pop()] = left;
      }
      return left;
    }
    case "UpdateExpression": {
      let res;
      switch (node.operator) {
        case "++":
          res = evaluate(node.argument, scope);
          scope.set(node.argument.name, res + 1);
          break;
        case "--":
          res = evaluate(node.argument, scope);
          scope.set(node.argument.name, res - 1);
          break;
      }
      return res;
    }
    case "MemberExpression": {
      // computed !!!
      if (node.computed) {
        return evaluate(node.object, scope)[evaluate(node.property, scope)];
      } else {
        return evaluate(node.object, scope)[node.property.name];
      }
    }
    case "IfStatement": {
      const child = new Scope("Block", scope);
      if (evaluate(node.test, child)) {
        return evaluate(node.consequent, child);
      } else {
        return node.alternate ? evaluate(node.alternate, child) : undefined;
      }
    }
    case "ForStatement": {
      const child = new Scope("Block", scope);
      let res = evaluate(node.init, child);
      while (evaluate(node.test, child)) {
        res = evaluate(node.body, child);
        if (res && res.type === "return") return res.value;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === node.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === node.label)) {
            evaluate(node.update, child);
            continue;
          } else return res;
        }
        evaluate(node.update, child);
      }
      return res.type ? res.value : res;
    }
    case "WhileStatement": {
      let res;
      const child = new Scope("Block", scope);
      while (evaluate(node.test, child)) {
        res = evaluate(node.body, child);
        if (res && res.type === "return") return res.value;
        // process the break and continue by label
        if (res && res.type === "break") {
          if (!res.label || (res.label && res.label === node.label)) break;
          else return res;
        }
        if (res && res.type === "continue") {
          if (!res.label || (res.label && res.label === node.label)) continue;
          else return res;
        }
      }
      return res.type ? res.value : res;
    }
    case "SwitchStatement": {
      let res;
      const child = new Scope("Block", scope);
      const cmp = evaluate(node.discriminant, child);
      for (let switchcase of node.cases) {
        if (switchcase.test) {
          for (const stat of switchcase.consequent) {
            res = evaluate(stat, child);
            if (res && res.type === "return") return res.value;
            if (res && res.type === "break") break;
            if (res && res.type === "continue") return res;
          }
          // true judge for break
          if (res && res.type === "break") {
            if (!res.label || (res.label && res.label === node.label)) break;
            else return res;
          }
        }
      }
      return res.type ? res.value : res;
    }
    case "TryStatement": {
      let res;
      try {
        const child = new Scope("Block", scope);
        for (const stat of node.block.body) {
          res = evaluate(stat, child);
        }
      } catch (error) {
        const child = new Scope("Block", scope);
        let subnode = node.handler;

        child.declare("let", subnode.param.name);
        child.set(subnode.param.name, error);
        res = evaluate(subnode.body, child);
        return res;
      } finally {
        const child = new Scope("Block", scope);
        res = evaluate(node.finalizer, child);
      }
      return res;
    }
    case "ThrowStatement":
      throw node.argument.value;
    case "LabeledStatement": {
      const name = node.label?.name;
      node.body.label = name;
      return evaluate(node.body, scope);
    }
    // construct the type for three special type
    case "ContinueStatement":
      return { type: "continue", label: node.label?.name };
    case "BreakStatement":
      return { type: "break", label: node.label?.name };
    case "ReturnStatement":
      return { type: "return", value: evaluate(node.argument, scope) };
  }

  throw new Error(
    `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
  );
}

function customerEval(code) {
  const node = acorn.parse(code, {
    ecmaVersion: 2020,
  });
  return evaluate(node, new Scope("Global"));
}

module.exports = customerEval;
