const acorn = require('acorn');

class Scope {
  variables = {};
  type = "";
  parent = null;
  /**
   * 初始化一个 type 类型 的作用域，可以指定其父作用域 parent
   * @param {string} type 作用域类型 'Global' | 'Local' | 'Block'
   * @param {Scope | null} parent // 当前作用域的父级作用域 
   */
  constructor(type, parent = null) {
    this.type = type;
    this.parent = parent;
  }
  // 声明变量
  declare(kind, name) {
    if (this.parent == null) {
      this.variables[name] = null;
    }else if (kind !== "var") {
      // 块级作用域声明 let | const 局限于当前 Block 之内
      if (!Object.prototype.hasOwnProperty.call(this.variables, name)) {
        // 不存在则声明
        this.variables[name] = null;
      }else{
        // 存在则报错
        throw new Error(`Uncaught SyntaxError: Identifier '${name}' has already been declared`);
      }
    }else{
      // var 声明局限于顶层Local（）
      if (this.type === "Local") {
        if (!Object.prototype.hasOwnProperty.call(this.variables, name)) {
          // 不存在则声明
          this.variables[name] = null;
        }else{
          // 存在则报错
          throw new Error(`Uncaught SyntaxError: Identifier '${name}' has already been declared`);
        }
      }else{
        // 当前类型是 Block | Global 都需要去上层找，一直找到当前的作用域链的 顶层 Local，判断是否存在
        this.parent.declare(kind, name);
      }
    }
  }
  // 获取变量值
  get(name = "") {
    if (!Object.prototype.hasOwnProperty.call(this.variables, name)) {
      // // 当前作用域没有去父级作用域 直到 Local 
      if (this.parent != null) {
        return this.parent.get(name);
      }
      throw new Error(`Uncaught ReferenceError: ${name} is not defined`);
    }
    return this.variables[name];
  }
  // 设置变量值
  set(name, value) {
    if (Object.prototype.hasOwnProperty.call(this.variables, name)) {
      this.variables[name] = value;
    }else{
      if (this.parent != null) {
        this.parent.set(name, value);
      }
    }
  }
}

function evaluate(node, scope) {
  switch (node.type) {
    case "Program": {
      // 程序入口
      let res = node.body.map(body => {
        return evaluate(body, scope);
      });
      return res.pop();
    }
    case 'Literal':{
      return node.value;
    }
    case "Identifier": {
      return scope.get(node.name);
    }
    case "LogicalExpression": {
      // 逻辑表达式
      switch (node.operator) {
        case "||":
          return evaluate(node.left, scope) || evaluate(node.right, scope);
        case "&&":
          return evaluate(node.left, scope) && evaluate(node.right, scope);
        default:
          throw new Error(`Unsupport LogicalExpression operator ${node.operator} at Location ${node.start}:${node.end}`);
      }
    }
    case "BinaryExpression": {
      return ({
        "+": (left, right) => left + right,
        "-": (left, right) => left - right,
        "*": (left, right) => left * right,
        "/": (left, right) => left / right,
        ">": (left, right) => left > right,
        "<": (left, right) => left < right,
        ">=": (left, right) => left >= right,
        "<=": (left, right) => left <= right,
        "%": (left, right) => left % right,
        "===": (left, right) => left === right,
        "|": (left, right) => left | right,
      }[node.operator](evaluate(node.left, scope), evaluate(node.right, scope)));
    }
    case "VariableDeclaration": {
      node.declarations.forEach(declarate => {
        scope.declare(node.kind, declarate.id.name);
        if (declarate.init != null) {
          scope.set(declarate.id.name, evaluate(declarate.init, scope));
        }
      })
      break;
    }
    case "ExpressionStatement": {
      return evaluate(node.expression, scope);
    }
    case "CallExpression": {
      let args = [...node.arguments.map(arg => evaluate(arg, scope))];
      // node.callee 是最终生成的函数
      return evaluate(node.callee, scope)(...args);
    }
    case "ArrowFunctionExpression": {
      const child = new Scope("Local", scope);
      return (...args) => {
        node.params.map(param => {
          child.set(param.name, args.shift());
        })
        if (node.body.type === "BlockStatement") {
          // 函数体类型是 BlockStatement 那就不必在创建新的作用域了
          let res = node.body.body.map(element => {
            return evaluate(element, scope);
          });
          return res.pop();
        }else{
          return evaluate(node.body, child);
        }
      }
    }
    case "FunctionExpression": {
      const child = new Scope("Local", scope);
      let func = function(...args) {
        node.params.map(param => {
          child.declare("let", param.name);
          child.set(param.name, args.shift());
        })
        if (node.body.type === "BlockStatement") {
          // 函数体类型是 BlockStatement 那就不必在创建新的作用域了
          let res = node.body.body.map(element => {
            return evaluate(element, child);
          });
          return res.pop();
        }else{
          return evaluate(node.body, child);
        }
      }
      if (node.id != null) {
        scope.declare("", node.id.name);
        scope.set(node.id.name, func);
      }
      return func;
    }
    case "BlockStatement": {
      const child = new Scope("Block", scope);
      let res = node.body.map(statement => {
        return evaluate(statement, child);
      });
      return res.pop();
    }
    case "AssignmentExpression": {
      let right = evaluate(node.right, scope);
      const obj = {
        "=" : (left, right, prop = null) => prop != null ? left[prop]  = right : left = right, 
        "+=": (left, right, prop = null) => prop != null ? left[prop] += right : left += right, 
        "-=": (left, right, prop = null) => prop != null ? left[prop] -= right : left -= right, 
        "*=": (left, right, prop = null) => prop != null ? left[prop] *= right : left *= right, 
        "/=": (left, right, prop = null) => prop != null ? left[prop] /= right : left /= right, 
        "%=": (left, right, prop = null) => prop != null ? left[prop] %= right : left %= right, 
      };
      if (node.left.type === "MemberExpression") {
        const object = evaluate(node.left.object, scope);
        let property = node.left.computed ? evaluate(node.left.property, scope) : node.left.property.name;
        obj[node.operator](object, right, property);
      }else{
        let left = evaluate(node.left, scope);
        left = obj[node.operator](left, right);
        scope.set(node.left.name, left);
      }
      return right;
    }
    case "ForStatement": {
      const child = new Scope("Block", scope);
      evaluate(node.init, child);
      for(; evaluate(node.test, child); evaluate(node.update, child)) {
        const res = evaluate(node.body, child);
        if (res === "continue") {
          break;
        }else if(res === "break") {
          return;
        }
      }
      break;
    }
    case "WhileStatement": {
      const child = new Scope("Block", scope);
      label1:
      while (evaluate(node.test, child)) {
        if (node.body.type === "BlockStatement") {
          for (const statement of node.body.body) {
            const result = evaluate(statement, child);
            if (result === "continue") {
              continue label1; 
            }else if(result === "break") {
              break label1;
            }
          }
        }else{
          evaluate(node.body, child);
        }
      }
      return;
    }
    case "ReturnStatement": {
      return evaluate(node.argument, scope);
    }
    case "UpdateExpression": {
      let temp = evaluate(node.argument, scope);
      // 更新运算符 自增 | 自减
      switch (node.operator) {
        case "++":
          temp++;
          break;
        case "--":
          temp--;
          break;
        default:
          throw new Error(`Unsupport UpdateExpression operator ${node.operator} at Location ${node.start}:${node.end}`);
      }
      scope.set(node.argument.name, temp);
      break;
    }
    case "IfStatement": {
      const child = new Scope("Block", scope);
      if (evaluate(node.test, child)) {
        return evaluate(node.consequent, child);
      }else{
        if (null != node.alternate) {
          return evaluate(node.alternate, child);
        }else{
          return;
        }
      }
    }
    case "ObjectExpression": {
      return node.properties.reduce((prev, curr) => ({...prev, ...evaluate(curr, scope)}), {});
    }
    case "Property": {
      let obj = {};
      if (node.key.type === "Identifier") {
        // 键的类型为 Identifier 时不应该去环境中找。而因该原样输出
        obj[node.key.name] = evaluate(node.value, scope)
      }else if(node.key.type === "CallExpression") {
        // 键的类型为函数调用，则需要执行
        obj[evaluate(node.key, scope)] = evaluate(node.value, scope)
      }else if(node.key.type === "ArrowFunctionExpression" || node.key.type === "FunctionExpression") {
        // 箭头函数 或 函数表达式 都应该执行 Function.toString()
        let func = astring.generate(node.key, scope);
        func = func.replace(/\r\n|\n/g, "");
        obj[func] = evaluate(node.value, scope);
      }else if (node.key.type === "Literal"){
        // 键的类型为 Literal 时 应该取 raw
        obj[node.key.raw] = evaluate(node.value, scope)
      }
      return obj;
    }
    case "TryStatement": {
      let res;
      try {
        res = evaluate(node.block, scope);
      } catch (err) {
        res = evaluate(node.handler, scope);
      } finally {
        evaluate(node.finalizer, scope);
      }
      return res;
    }
    case "MemberExpression": {
      const { object, property, computed } = node;
      if (computed) {
        return evaluate(object, scope)[evaluate(property, scope)]
      } else {
        return evaluate(object, scope)[property.name]
      }
    }
    case "ArrayExpression": {
      let tempArr = new Array();
      node.elements.forEach(element => tempArr.push(evaluate(element, scope)));
      return tempArr;
    }
    case "SwitchStatement": {
      const discriminant = evaluate(node.discriminant, scope);
      const child = new Scope("Block", scope);
      let ismatched = false;
      for (const caseElement of node.cases) {
        if (!ismatched && discriminant === evaluate(caseElement.test, child)) {
          ismatched = true;
        }
        if(ismatched) {
          const result = evaluate(caseElement, child);
          if (result === "continue") {
            return result;
          }
        }
      }
      break;
    }
    case "SwitchCase": {
      for (const consequent of node.consequent) {
        const res = evaluate(consequent, scope);
        if (res === "continue") {
          return res;
        }
      }
      break;
    }
    case "ContinueStatement": {
      if (node.label == null) {
        return "continue";
      }else{
        return `continue ${node.label.name}`;
      }
    }
    case "BreakStatement": {
      if (node.label == null) {
        return "break";
      }else{
        return `break ${node.label.name}`;
      }
    }
    case "LabeledStatement": {
      scope.declare("var", node.label.name);
      scope.set(node.label.name, node.body);
      evaluate(node.body, scope);
      break;
    }
  }
}

function customerEval(code) {
  const node = acorn.parse(code, {
    ecmaVersion: 'latest',
  });
  const scope = new Scope("Global"); // 根作用域
  return evaluate(node, scope)
}

// console.log(eval('var a = 1;let b = 2;const c = 3'));
// console.log(customerEval('var a = 1;let b = 2;const c = 3'));

// console.log((() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })());
// console.log(customerEval('(() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })()'));

// console.log((() => { let sum = 0; for (let i = 0; i < 10; i++) { sum += i } return sum })());
// console.log(customerEval('(() => { let sum = 0; for (let i = 0; i < 10; i++) { sum += i } return sum })()'));

// console.log((() => { let factorial = 1; let i = 0; while (i < 10) { factorial *= i; i++; } return factorial })());
// console.log(customerEval('(() => { let factorial = 1; let i = 0; while (i < 10) { factorial *= i; i++; } return factorial })()'));


// console.log((() => { let a = 1; var b = 2; (() => { a = 2; b = 3; })(); return { a, b }; })());
// console.log(customerEval('(() => { let a = 1; var b = 2; (() => { a = 2; b = 3; })(); return { a, b }; })()'));

// console.log(eval('const obj = { runTry: false, runError: false, runFinally: false }; try { obj.runTry = true; } catch (err) { obj.runError = true; } finally { obj.runFinally = true; }'));
// console.log(customerEval('const obj = { runTry: false, runError: false, runFinally: false }; try { obj.runTry = true; } catch (err) { obj.runError = true; } finally { obj.runFinally = true; }'));

// console.log(eval('const obj = { test: {runTry: false}, err: {runError: false}, runFinally: false }; try { obj.test.runTry = true; } catch (err) { obj.err.runError = true; } finally { obj.runFinally = true; }'));
// console.log(customerEval('const obj = { test: {runTry: "卧槽"}, err: {runError: false}, runFinally: false }; try { obj.test.runTry = true; } catch (err) { obj.err.runError = true; } finally { obj.runFinally = true; }'));

// console.log((function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0));
// console.log(customerEval('(function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0)'));

// 过不了
// console.log((() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })());
// console.log(customerEval('(() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })()'));
module.exports = customerEval