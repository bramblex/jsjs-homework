const acorn = require('acorn');

class Scope {
  constructor(type, parent = null) {
    this.variables = {};
    this.type = type;
    this.parent = parent;
  }

  declare(kind, name) {
    let scope = this;
    while (kind === 'var' && scope.type === 'block') {
      if (Object.hasOwn(scope.variables, name)) { throw new SyntaxError(`Cannot declare a variable twice`); }
      scope = scope.parent;
    }
    if (Object.hasOwn(scope.variables, name)) {
      if (scope.variables[name].kind !== 'var' || kind !== 'var') { throw new SyntaxError(`Cannot declare a variable twice`); }
      // else do nothing
    } else {
      scope.variables[name] = { value: undefined, kind };
    }
  }

  get(name) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    if (!scope) { throw new ReferenceError(`Can't find variable`); }
    return scope.variables[name].value;
  }

  set(name, value, init = false) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    if (!scope) { throw new ReferenceError(`Can't find variable`); }
    if (scope.variables[name].kind === 'const' && !init) { throw new TypeError('Assignment to constant variable'); }
    return scope.variables[name].value = value;
  }

  display() {
    const vars_arr = [];
    let scope = this;
    while (scope) {
      vars_arr.unshift('{' + Object.entries(scope.variables).filter(e => e[0] != 'thisArg').map((e) => e[0] + ':' + e[1].value).join(', ') + '}');
      scope = scope.parent;
    }
    console.log(vars_arr.join(' -> '));
  }
}

class ReturnObject {
  constructor(value = undefined) {
    this.value = value;
  }
  toString() {
    return 'ReturnObject{' + Object.keys(this).map(attr => `${attr}: ${this[attr]}`).join(', ') + '}'
  }
}
class BreakObject {
  constructor(label = undefined) {
    this.label = label;
  }
  toString() {
    return 'BreakObject{' + Object.keys(this).map(attr => `${attr}: ${this[attr]}`).join(', ') + '}'
  }
}
class ContinueObject {
  constructor(label = undefined) {
    this.label = label;
  }
  toString() {
    return 'ContinueObject{' + Object.keys(this).map(attr => `${attr}: ${this[attr]}`).join(', ') + '}'
  }
}

function evaluate(node, scope) {
  // debugger;
  switch (node.type) {
    // the Program
    case 'Program': {
      // TOFIX: init global scope
      const globalScope = new Scope('global', null);
      globalScope.declare('var', 'thisArg');
      globalScope.set('thisArg', globalScope);

      let result;
      for (const stat of node.body) {
        result = evaluate(stat, globalScope);
      }
      return result;
    }

    // Expressions
    case 'Identifier': return scope.get(node.name);
    case 'Literal': return node.value;
    case 'ArrayExpression': return node.elements.map(e => evaluate(e, scope));
    case 'ObjectExpression': {
      const obj = {};
      for (const property of node.properties) {
        if (property.computed) { // {[propExp]:value}
          obj[evaluate(property.key, scope)] = evaluate(property.value, scope);
        } else { // {propName:value}
          obj[property.key.name] = evaluate(property.value, scope);
        }
      }
      return obj;
    }
    case 'MemberExpression': {
      if (node.computed) { // obj[propExp]
        return evaluate(node.object, scope)[evaluate(node.property, scope)];
      } else { // obj.propName
        return evaluate(node.object, scope)[node.property.name];
      }
    }
    case 'UnaryExpression':
      if (node.operator === '-') {
        return -evaluate(node.argument, scope);
      } else if (node.operator === '+') {
        return +evaluate(node.argument, scope);
      } else if (node.operator === '!') {
        return !evaluate(node.argument, scope);
      } else if (node.operator === '~') {
        return ~evaluate(node.argument, scope);
      } else if (node.operator === 'typeof') {
        return typeof evaluate(node.argument, scope);
      } else if (node.operator === 'void') {
        return void evaluate(node.argument, scope);
      } else if (node.operator === 'delete') {
        throw new SyntaxError('Unsupported Operation'); // TOFIX
      }
    case 'UpdateExpression': {
      let returnValue, assignValue;
      if (node.prefix && node.operator === '++') {
        returnValue = scope.get(node.argument.name) + 1;
        assignValue = returnValue;
      } else if (node.prefix && node.operator === '--') {
        returnValue = scope.get(node.argument.name) - 1;
        assignValue = returnValue;
      } else if (!node.prefix && node.operator === '++') {
        returnValue = scope.get(node.argument.name);
        assignValue = returnValue + 1;
      } else if (!node.prefix && node.operator === '--') {
        returnValue = scope.get(node.argument.name);
        assignValue = returnValue - 1;
      }
      // 因为对象属性保存在JS对象中，而变量保存在Scope中，所以注意区别处理
      if (node.argument.type === 'MemberExpression') { // 对象属性赋值
        if (node.argument.computed) { // obj[propExp]
          evaluate(node.argument.object, scope)[evaluate(node.argument.property, scope)] = assignValue;
        } else { // obj.propName
          evaluate(node.argument.object, scope)[node.argument.property.name] = assignValue;
        }
      } else {
        scope.set(node.argument.name, assignValue); // 变量赋值
      }
      return returnValue;
    }
    case 'BinaryExpression':
      if (node.operator === '+') {
        return evaluate(node.left, scope) + evaluate(node.right, scope);
      } else if (node.operator === '-') {
        return evaluate(node.left, scope) - evaluate(node.right, scope);
      } else if (node.operator === '*') {
        return evaluate(node.left, scope) * evaluate(node.right, scope);
      } else if (node.operator === '/') {
        return evaluate(node.left, scope) / evaluate(node.right, scope);
      } else if (node.operator === '%') {
        return evaluate(node.left, scope) % evaluate(node.right, scope);
      } else if (node.operator === '<') {
        return evaluate(node.left, scope) < evaluate(node.right, scope);
      } else if (node.operator === '<=') {
        return evaluate(node.left, scope) <= evaluate(node.right, scope);
      } else if (node.operator === '>') {
        return evaluate(node.left, scope) > evaluate(node.right, scope);
      } else if (node.operator === '>=') {
        return evaluate(node.left, scope) >= evaluate(node.right, scope);
      } else if (node.operator === '==') {
        return evaluate(node.left, scope) == evaluate(node.right, scope);
      } else if (node.operator === '!=') {
        return evaluate(node.left, scope) != evaluate(node.right, scope);
      } else if (node.operator === '===') {
        return evaluate(node.left, scope) === evaluate(node.right, scope);
      } else if (node.operator === '!==') {
        return evaluate(node.left, scope) !== evaluate(node.right, scope);
      } else if (node.operator === '^') {
        return evaluate(node.left, scope) ^ evaluate(node.right, scope);
      } else if (node.operator === '&') {
        return evaluate(node.left, scope) & evaluate(node.right, scope);
      } else if (node.operator === '|') {
        return evaluate(node.left, scope) | evaluate(node.right, scope);
      } else if (node.operator === '<<') {
        return evaluate(node.left, scope) << evaluate(node.right, scope);
      } else if (node.operator === '>>') {
        return evaluate(node.left, scope) >> evaluate(node.right, scope);
      } else if (node.operator === '>>>') {
        return evaluate(node.left, scope) >>> evaluate(node.right, scope);
      } else if (node.operator === 'in') {
        return evaluate(node.left, scope) in evaluate(node.right, scope);
      } else if (node.operator === 'instanceof') {
        return evaluate(node.left, scope) instanceof evaluate(node.right, scope);
      }
    case 'LogicalExpression':
      if (node.operator === '||') {
        return evaluate(node.left, scope) || evaluate(node.right, scope);
      } else if (node.operator === '&&') {
        return evaluate(node.left, scope) && evaluate(node.right, scope);
      }
    case 'AssignmentExpression': {
      let result;
      if (node.operator === '=') {
        result = evaluate(node.right, scope);
      } else if (node.operator === '+=') {
        result = scope.get(node.left.name) + evaluate(node.right, scope);
      } else if (node.operator === '-=') {
        result = scope.get(node.left.name) - evaluate(node.right, scope);
      } else if (node.operator === '*=') {
        result = scope.get(node.left.name) * evaluate(node.right, scope);
      } else if (node.operator === '/=') {
        result = scope.get(node.left.name) / evaluate(node.right, scope);
      } else if (node.operator === '%=') {
        result = scope.get(node.left.name) % evaluate(node.right, scope);
      } else if (node.operator === '|=') {
        result = scope.get(node.left.name) | evaluate(node.right, scope);
      } else if (node.operator === '&=') {
        result = scope.get(node.left.name) & evaluate(node.right, scope);
      } else if (node.operator === '^=') {
        result = scope.get(node.left.name) ^ evaluate(node.right, scope);
      } else if (node.operator === '<<=') {
        result = scope.get(node.left.name) << evaluate(node.right, scope);
      } else if (node.operator === '>>=') {
        result = scope.get(node.left.name) >> evaluate(node.right, scope);
      } else if (node.operator === '>>>=') {
        result = scope.get(node.left.name) >>> evaluate(node.right, scope);
      }
      // 因为对象属性保存在JS对象中，而变量保存在Scope中，所以注意区别处理
      if (node.left.type === 'MemberExpression') { // 对象属性赋值
        if (node.left.computed) { // obj[propExp]
          evaluate(node.left.object, scope)[evaluate(node.left.property, scope)] = result;
        } else { // obj.propName
          evaluate(node.left.object, scope)[node.left.property.name] = result;
        }
      } else {
        scope.set(node.left.name, result); // 变量赋值
      }
      return result;
    }
    case 'ConditionalExpression': return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);
    case 'SequenceExpression': {
      let result;
      for (const expr of node.expressions) {
        result = evaluate(expr, scope);
      }
      return result;
    }
    case 'NewExpression': return Reflect.construct(evaluate(node.callee.name, scope), node.arguments.map(argument => evaluate(argument, scope)));
    case 'ThisExpression': return scope.get('thisArg');

    case 'CallExpression': {
      let thisArg;
      if (node.callee.type === 'MemberExpression') { // method call
        thisArg = evaluate(node.callee.object, scope);
      } else { // function call
        thisArg = scope.get('thisArg');
      }
      return evaluate(node.callee, scope)(thisArg, ...node.arguments.map(argument => evaluate(argument, scope)));
    }
    case 'FunctionExpression':
      return function (thisArg, ...args) {
        const functionScope = new Scope('function', scope);
        functionScope.declare('var', 'thisArg');
        for (const { name } of node.params) {
          functionScope.declare('var', name);
        }
        functionScope.set('thisArg', thisArg);
        for (let i = 0; i < Math.min(node.params.length, args.length); i++) {
          functionScope.set(node.params[i].name, args[i]);
        }

        const result = evaluate(node.body, functionScope);
        if (result instanceof ReturnObject) {
          return result.value;
        }
        return;
      }
    // IMPORTANT: 函数执行时的functionScope的parent应是函数定义时所处的scope，而不是函数调用时所处的scope
    case 'ArrowFunctionExpression':
      if (node.body.type === 'BlockStatement') {
        return (thisArg, ...args) => {
          const functionScope = new Scope('function', scope);
          functionScope.declare('var', 'thisArg');
          for (const { name } of node.params) {
            functionScope.declare('var', name);
          }
          functionScope.set('thisArg', thisArg);
          for (let i = 0; i < Math.min(node.params.length, args.length); i++) {
            functionScope.set(node.params[i].name, args[i]);
          }

          const result = evaluate(node.body, functionScope);
          if (result instanceof ReturnObject) {
            return result.value;
          }
          return;
        }
      } else {
        return (thisArg, ...args) => {
          const functionScope = new Scope('function', scope);
          functionScope.declare('var', 'thisArg');
          for (const { name } of node.params) {
            functionScope.declare('var', name);
          }
          functionScope.set('thisArg', scope.get('thisArg'));
          for (let i = 0; i < Math.min(node.params.length, args.length); i++) {
            functionScope.set(node.params[i].name, args[i]);
          }

          return evaluate(node.body, functionScope);
        };
      }

    // Statements
    case 'ExpressionStatement': {
      return evaluate(node.expression, scope);
    }

    case 'BlockStatement': {
      const blockScope = new Scope('block', scope);
      let result;
      for (const stat of node.body) {
        result = evaluate(stat, blockScope);
        if (result instanceof ReturnObject || result instanceof BreakObject || result instanceof ContinueObject) {
          return result;
        }
      }
      return;
    }

    case 'IfStatement': {
      const result = evaluate(node.test, scope) ? evaluate(node.consequent, scope) : (node.alternate ? evaluate(node.alternate, scope) : undefined);
      return (result instanceof ReturnObject || result instanceof BreakObject || result instanceof ContinueObject) ? result : undefined;
    }
    case 'SwitchStatement': {
      const switchScope = new Scope('block', scope);
      // collect statements in matched cases
      const target = evaluate(node.discriminant, switchScope);
      const stats = []; let accept = false;
      for (const switchCase of node.cases) {
        if (switchCase.test === null || evaluate(switchCase.test, switchScope) === target) {
          accept = true;
        }
        if (accept) {
          stats.push(...switchCase.consequent);
        }
      }
      // execute statements
      let result;
      for (const stat of stats) {
        result = evaluate(stat, switchScope);
        if (result instanceof ReturnObject || result instanceof ContinueObject || (result instanceof BreakObject && result.label !== undefined)) {
          return result;
        } else if (result instanceof BreakObject && result.label === undefined) {
          return;
        }
      }
      return;
    }

    case 'WhileStatement': {
      let result;
      while (evaluate(node.test, scope)) {
        result = evaluate(node.body, scope);
        if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
          return result;
        } else if (result instanceof BreakObject && result.label === undefined) {
          break;
        } else if (result instanceof ContinueObject && result.label === undefined) {
          continue;
        }
      }
      return;
    }
    case 'DoWhileStatement': {
      let result;
      do {
        result = evaluate(node.body, scope);
        if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
          return result;
        } else if (result instanceof BreakObject && result.label === undefined) {
          break;
        } else if (result instanceof ContinueObject && result.label === undefined) {
          continue;
        }
      } while (evaluate(node.test, scope));
      return;
    }
    case 'ForStatement': {
      let tmp, result;
      for (
        let blockScope = (tmp = new Scope('block', scope), node.init !== null ? evaluate(node.init, tmp) : 0, tmp);
        node.test === null || evaluate(node.test, blockScope);
        node.update !== null ? evaluate(node.update, blockScope) : 0
      ) {
        result = evaluate(node.body, blockScope);
        if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
          return result;
        } else if (result instanceof BreakObject && result.label === undefined) {
          break;
        } else if (result instanceof ContinueObject && result.label === undefined) {
          continue;
        }
      }
      return;
    }
    case 'ForInStatement': throw new SyntaxError('Unsupported Operation'); // TOFIX

    case 'ReturnStatement': return new ReturnObject(evaluate(node.argument, scope));
    case 'BreakStatement': return new BreakObject(node.label ? node.label.name : undefined);
    case 'ContinueStatement': return new ContinueObject(node.label ? node.label.name : undefined);
    case 'LabeledStatement': {
      // 注：label常用于循环语句，也可用于其他语句（语句块），不可用于声明。break label可以跳出非循环语句（语句块等），continue label必须是循环语句的label
      let result = evaluate(node.body, scope);
      while (result instanceof ContinueObject && result.label === node.label.name) {
        result = evaluate(node.body, scope);
      }

      if (result instanceof ReturnObject || (result instanceof ContinueObject && result.label !== node.label.name) || (result instanceof BreakObject && result.label !== node.label.name)) {
        return result;
      } else if (result instanceof BreakObject && result.label === node.label.name) {
        return;
      }
      return;
    }

    case 'TryStatement': {
      let result;
      try {
        result = evaluate(node.block, scope);
      } catch (err) {
        if (node.handler !== null) {
          const catchScope = new Scope('block', scope);
          catchScope.declare('block', node.handler.param.name);
          catchScope.set(node.handler.param.name, err);
          result = evaluate(node.handler.body, catchScope);
        }
      } finally {
        if (node.finalizer !== null) {
          const finalizerResult = evaluate(node.finalizer, scope);
          if (finalizerResult !== undefined) {
            result = finalizerResult;
          }
        }
        return result;
      }
    }
    case 'ThrowStatement': throw evaluate(node.argument, scope);

    case 'EmptyStatement': return undefined;
    case 'DebuggerStatement': throw new SyntaxError('Unsupported Operation'); // TOFIX
    case 'WithStatement': throw new SyntaxError('Unsupported Operation'); // TOFIX

    // Declaration Statements
    case 'FunctionDeclaration': {
      scope.declare('var', node.id.name); // TOFIX: 函数名能归于var吗，还是创建'function'类型？
      scope.set(node.id.name, function (thisArg, ...args) {
        const functionScope = new Scope('function', scope);
        functionScope.declare('var', 'thisArg');
        for (const { name } of node.params) {
          functionScope.declare('var', name);
        }
        functionScope.set('thisArg', thisArg);
        for (let i = 0; i < Math.min(node.params.length, args.length); i++) {
          functionScope.set(node.params[i].name, args[i]);
        }

        const result = evaluate(node.body, functionScope);
        if (result instanceof ReturnObject) {
          return result.value;
        }
        return;
      });
      return;
    }
    case 'VariableDeclaration':
      for (const declaration of node.declarations) {
        scope.declare(node.kind, declaration.id.name);
        if (declaration.init) {
          scope.set(declaration.id.name, evaluate(declaration.init, scope), true);
        }
      }
      return;
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval