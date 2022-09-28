const acorn = require('acorn');

class Scope {
  constructor(initial /* 初始化变量 */, parent) {
    if (initial !== undefined) {
      this.variables = {};
      this.parent = parent;
      // this.globalThis = parent !== undefined ? parent.globalThis : this;
      for (const [name, value] of Object.entries(initial)) {
        switch (name) {
          case 'global':
            this.variables.global = { value: value, kind: 'var', tdz: false, writable: false };
            break;
          case 'module':
            this.variables.module = { value: value, kind: 'let', tdz: false, writable: false };
            this.type = 'script';
            break;
          case 'type':
            this.type = value;
            break;
          default:
            this.variables[name] = { value: value, kind: 'var', tdz: false, writable: false };
        }
      }
      if (this.type === undefined) {
        this.type = 'global';
      }
    } else {
      this.variables = {
        global: { value: this, kind: 'var', tdz: false, writable: false },
      };
      this.parent = parent;
      this.type = 'global';
      // this.globalThis = this;
    }
    if (this.type === 'global') {
      if (this.variables.global === undefined) {
        this.variables.global = { value: this, kind: 'var', tdz: false, writable: false };
      }
      // continueFlag的作用，所有循环在continue后要先判断再执行，do while也不例外，用continueFlag来识别是正常执行循环，还是从continue继续循环
      if (this.variables.continueFlag === undefined) {
        this.variables.continueFlag = { value: false, kind: 'var', tdz: false, writable: true }
      }
      if (this.variables.Array === undefined) {
        this.variables.Array = { value: Array, kind: 'var', tdz: false, writable: false };
      }
      if (this.variables.Date === undefined) {
        this.variables.Date = { value: Date, kind: 'var', tdz: false, writable: false };
      }
      if (this.variables.RegExp === undefined) {
        this.variables.RegExp = { value: RegExp, kind: 'var', tdz: false, writable: false };
      }
      if (this.variables.JSON === undefined) {
        this.variables.JSON = { value: JSON, kind: 'var', tdz: false, writable: false };
      }
    }
  }

  declare(kind, name) {
    if (kind === 'let' || kind === 'const') {
      // script和global逻辑上作为一个整体的全局作用域
      if (Object.hasOwn(this.variables, name) || (this.type === 'script' && Object.hasOwn(this.parent.variables, name))) {
        throw new SyntaxError(`Cannot declare a variable twice`);
      } else {
        this.variables[name] = { value: undefined, kind, tdz: true, writable: true };
      }
    } else if (kind === 'var') {
      // find the most nearest nonblock-type scope
      let scope = this;
      while (scope.type === 'block' || scope.type === 'script') {
        if (Object.hasOwn(scope.variables, name)) { throw new SyntaxError(`Cannot declare a variable twice`); }
        scope = scope.parent;
      }
      // declare
      if (Object.hasOwn(scope.variables, name)) {
        if (scope.variables[name].kind === 'var') {
          // do nothing
        } else {
          throw new SyntaxError(`Cannot declare a variable twice`);
        }
      } else {
        scope.variables[name] = { value: undefined, kind, tdz: false, writable: true };
      }
    }
  }

  get(name) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    if (!scope) { throw new ReferenceError(`Can't find variable`); }
    if (scope.variables[name].tdz) { throw new ReferenceError(`Can't access variable in TDZ`); }
    return scope.variables[name].value;
  }


  set(name, value, init = false) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    if (!scope) { throw new ReferenceError(`Can't find variable`); }
    if (init && scope.variables[name] !== 'var') { scope.freeTDZ(name); }
    if (scope.variables[name].tdz) { throw new ReferenceError(`Can't access variable in TDZ`); }
    if (scope.variables[name].kind === 'const' && !init) { throw new TypeError('Assignment to constant variable'); }
    if (scope.variables[name].writable) {
      return scope.variables[name].value = value;
    } else {
      // do nothing in non-strict mode
      return scope.variables[name].value;
    }
  }

  freeTDZ(name) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    if (!scope) { throw new ReferenceError(`Can't find variable`); }
    scope.variables[name].tdz = false;
  }

  has(name) {
    let scope = this;
    while (scope && !Object.hasOwn(scope.variables, name)) { scope = scope.parent; }
    return scope !== undefined;
  }

  getGlobalScope() {
    let scope = this;
    while (scope.type !== 'global') {
      scope = scope.parent;
    }
    return scope;
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
  switch (node.type) {
    case 'Program':
      // hoist
      node.body.forEach(stat => {
        hoist(stat, scope, true);
      });
      // execute
      node.body.forEach(stat => {
        evaluate(stat, scope, true);
      });
      return;

    case 'Identifier':
      return node.name !== 'undefined' ? scope.get(node.name) : undefined; // 坑，undefind 会被识别成 Identifier 而不是 undefinded

    case 'Literal':
      return node.value;

    case 'ArrayExpression':
      return node.elements.map(e => evaluate(e, scope));

    case 'ObjectExpression': {
      const obj = {};
      node.properties.forEach(property => {
        const value = evaluate(property.value, scope);
        let propName;
        if (property.computed) { // {[propExp]:value}
          propName = evaluate(property.key, scope);
        } else { // {propName:value}
          propName = property.key.name;
        }
        if (property.value.type === 'FunctionExpression' && value instanceof Function && value.name === '') { // 特殊处理：函数表达式的name
          Object.defineProperty(value, 'name', { value: propName });
        }
        if (property.kind === 'init') {
          obj[propName] = value;
        } else if (property.kind === 'get') {
          Object.defineProperty(obj, propName, { get: value });
        } else if (property.kind === 'set') {
          Object.defineProperty(obj, propName, { set: value });
        }
      });
      return obj;
    }

    case 'MemberExpression':
      return node.computed ?
        evaluate(node.object, scope)[evaluate(node.property, scope)] // obj[propExp]
        : evaluate(node.object, scope)[node.property.name]; // obj.propName

    case 'VariableDeclaration':
      node.declarations.forEach(declaration => {
        if (declaration.init) {
          const value = evaluate(declaration.init, scope);
          // if (declaration.init.type === 'FunctionExpression' && value instanceof Function && value.name === '') { // 特殊处理：函数表达式的name
          //   Object.defineProperty(value, 'name', { value: declaration.id.name });
          // }
          scope.set(declaration.id.name, value, true);
        }
      });
      return;

    case 'ExpressionStatement':
      evaluate(node.expression, scope);
      return;

    case 'UpdateExpression': {
      let oldValue = evaluate(node.argument, scope);
      let returnValue, assignValue;
      if (node.prefix && node.operator === '++') {
        returnValue = oldValue + 1;
        assignValue = oldValue + 1;
      } else if (node.prefix && node.operator === '--') {
        returnValue = oldValue - 1;
        assignValue = oldValue - 1;
      } else if (!node.prefix && node.operator === '++') {
        returnValue = oldValue;
        assignValue = oldValue + 1;
      } else if (!node.prefix && node.operator === '--') {
        returnValue = oldValue;
        assignValue = oldValue - 1;
      }
      if (node.argument.type === 'MemberExpression') { // 对象属性赋值
        let obj = evaluate(node.argument.object, scope);
        let propName;
        if (node.argument.computed) { // obj[propExp]
          propName = evaluate(node.argument.property, scope);
        } else { // obj.propName
          propName = node.argument.property.name;
        }
        obj[propName] = assignValue;
      } else {
        scope.set(node.argument.name, assignValue); // 变量赋值
      }
      return returnValue;
    }

    case 'AssignmentExpression': {
      // 连续赋值时，left-value是对象属性时，提前解析（从左到右解析，从右到左赋值）
      let obj;
      if (node.left.type === 'MemberExpression') {
        obj = evaluate(node.left.object, scope);
      }
      let result;
      switch (node.operator) {
        case '=':
          // 特殊处理: 赋值语句用于声明全局变量
          if (node.left.type === 'Identifier' && !scope.has(node.left.name)) {
            scope.getGlobalScope().declare('var', node.left.name);
          }
          result = evaluate(node.right, scope);
          break;
        case '+=':
          result = evaluate(node.left, scope) + evaluate(node.right, scope);
          break;
        case '-=':
          result = evaluate(node.left, scope) - evaluate(node.right, scope);
          break;
        case '*=':
          result = evaluate(node.left, scope) * evaluate(node.right, scope);
          break;
        case '/=':
          result = evaluate(node.left, scope) / evaluate(node.right, scope);
          break;
        case '%=':
          result = evaluate(node.left, scope) % evaluate(node.right, scope);
          break;
        case '|=':
          result = evaluate(node.left, scope) | evaluate(node.right, scope);
          break;
        case '&=':
          result = evaluate(node.left, scope) & evaluate(node.right, scope);
          break;
        case '^=':
          result = evaluate(node.left, scope) ^ evaluate(node.right, scope);
          break;
        case '<<=':
          result = evaluate(node.left, scope) << evaluate(node.right, scope);
          break;
        case '>>=':
          result = evaluate(node.left, scope) >> evaluate(node.right, scope);
          break;
        case '>>>=':
          result = evaluate(node.left, scope) >>> evaluate(node.right, scope);
          break;
      }
      if (node.left.type === 'MemberExpression') { // 对象属性赋值
        let propName;
        if (node.left.computed) { // obj[propExp]
          propName = evaluate(node.left.property, scope);

        } else { // obj.propName
          propName = node.left.property.name;
        }
        // if (node.operator === '=' && node.right.type === 'FunctionExpression' && result instanceof Function && result.name === '') { // 特殊处理：函数表达式的name
        //   Object.defineProperty(result, 'name', { value: propName });
        // }
        obj[propName] = result;
      } else {
        // if (node.operator === '=' && node.right.type === 'FunctionExpression' && result instanceof Function && result.name === '') { // 特殊处理：函数表达式的name
        //   Object.defineProperty(result, 'name', { value: node.left.name });
        // }
        scope.set(node.left.name, result); // 变量赋值
      }
      return result;
    }

    case 'UnaryExpression':
      switch (node.operator) {
        case '-': return -evaluate(node.argument, scope);
        case '+': return +evaluate(node.argument, scope);
        case '!': return !evaluate(node.argument, scope);
        case '~': return ~evaluate(node.argument, scope);
        case 'typeof':
          try {
            return typeof evaluate(node.argument, scope);
          } catch (err) {
            if (err.message === `Can't find variable`) {
              return 'undefined';
            } else {
              // 已定义但由于TDZ无法访问的变量，使用typeof时抛出错误
              throw err;
            }
          }
        case 'void': return void evaluate(node.argument, scope);
        case 'delete':
          if (node.argument.computed) { // obj[propExp]
            delete evaluate(node.argument.object, scope)[evaluate(node.argument.property, scope)];
          } else { // obj.propName
            delete evaluate(node.argument.object, scope)[node.argument.property.name];
          }
          return;
      }

    case 'BinaryExpression':
      switch (node.operator) {
        case '+': return evaluate(node.left, scope) + evaluate(node.right, scope);
        case '-': return evaluate(node.left, scope) - evaluate(node.right, scope);
        case '*': return evaluate(node.left, scope) * evaluate(node.right, scope);
        case '/': return evaluate(node.left, scope) / evaluate(node.right, scope);
        case '%': return evaluate(node.left, scope) % evaluate(node.right, scope);
        case '**': return evaluate(node.left, scope) ** evaluate(node.right, scope);
        case '<': return evaluate(node.left, scope) < evaluate(node.right, scope);
        case '<=': return evaluate(node.left, scope) <= evaluate(node.right, scope);
        case '>': return evaluate(node.left, scope) > evaluate(node.right, scope);
        case '>=': return evaluate(node.left, scope) >= evaluate(node.right, scope);
        case '==': return evaluate(node.left, scope) == evaluate(node.right, scope);
        case '!=': return evaluate(node.left, scope) != evaluate(node.right, scope);
        case '===': return evaluate(node.left, scope) === evaluate(node.right, scope);
        case '!==': return evaluate(node.left, scope) !== evaluate(node.right, scope);
        case '^': return evaluate(node.left, scope) ^ evaluate(node.right, scope);
        case '&': return evaluate(node.left, scope) & evaluate(node.right, scope);
        case '|': return evaluate(node.left, scope) | evaluate(node.right, scope);
        case '<<': return evaluate(node.left, scope) << evaluate(node.right, scope);
        case '>>': return evaluate(node.left, scope) >> evaluate(node.right, scope);
        case '>>>': return evaluate(node.left, scope) >>> evaluate(node.right, scope);
        case 'in': return evaluate(node.left, scope) in evaluate(node.right, scope);
        case 'instanceof': return evaluate(node.left, scope) instanceof evaluate(node.right, scope);
      }

    case 'LogicalExpression':
      if (node.operator === '||') {
        return evaluate(node.left, scope) || evaluate(node.right, scope);
      } else if (node.operator === '&&') {
        return evaluate(node.left, scope) && evaluate(node.right, scope);
      }

    case 'ConditionalExpression': return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);

    case 'SequenceExpression': {
      let result;
      for (const expr of node.expressions) {
        result = evaluate(expr, scope);
      }
      return result;
    }

    case 'FunctionExpression': {
      const f = function (...args) {
        const functionScope = new Scope({ type: 'function' }, scope);
        functionScope.declare('var', 'thisArg');
        functionScope.set('thisArg', this);
        functionScope.declare('var', 'new_target');
        functionScope.set('new_target', new.target);
        for (let i = 0; i < node.params.length; i++) {
          functionScope.declare('var', node.params[i].name);
          functionScope.set(node.params[i].name, i < args.length ? args[i] : undefined, true);
        }
        node.body.body.forEach(stat => {
          hoist(stat, functionScope, true);
        });
        let result;
        for (const stat of node.body.body) {
          result = evaluate(stat, functionScope);
          if (result instanceof ReturnObject) {
            return result.value;
          }
        }
        return;
      }
      Object.defineProperty(f, 'name', { value: node.id !== null ? node.id.name : '' });
      Object.defineProperty(f, 'length', { value: node.params.length });
      return f;
    }

    case 'ArrowFunctionExpression':
      if (node.body.type === 'BlockStatement') {
        const f = (...args) => {
          const functionScope = new Scope({ type: 'function' }, scope);
          // functionScope.declare('var', 'thisArg');
          // functionScope.set('thisArg', undefined);
          for (let i = 0; i < node.params.length; i++) {
            functionScope.declare('var', node.params[i].name);
            functionScope.set(node.params[i].name, i < args.length ? args[i] : undefined, true);
          }
          node.body.body.forEach(stat => {
            hoist(stat, functionScope, true);
          });
          let result;
          for (const stat of node.body.body) {
            result = evaluate(stat, functionScope);
            if (result instanceof ReturnObject) {
              return result.value;
            }
          }
          return;
        }
        Object.defineProperty(f, 'name', { value: '' });
        Object.defineProperty(f, 'length', { value: node.params.length });
        return f;
      } else {
        const f = (...args) => {
          const functionScope = new Scope({ type: 'function' }, scope);
          // functionScope.declare('var', 'thisArg');
          // functionScope.set('thisArg', undefined);
          for (let i = 0; i < node.params.length; i++) {
            functionScope.declare('var', node.params[i].name);
            functionScope.set(node.params[i].name, i < args.length ? args[i] : undefined, true);
          }
          hoist(node.body, functionScope, true);
          let result = evaluate(node.body, functionScope);
          return result;
        };
        Object.defineProperty(f, 'name', { value: '' });
        Object.defineProperty(f, 'length', { value: node.params.length });
        return f;
      }

    case 'FunctionDeclaration': {
      // 函数提升时已完成定义了
      return;
    }

    case 'CallExpression': {
      let thisArg;
      if (node.callee.type === 'MemberExpression') { // method call
        thisArg = evaluate(node.callee.object, scope);
      } else { // function call
        thisArg = scope.getGlobalScope().get('global');
      }
      return evaluate(node.callee, scope).apply(thisArg, node.arguments.map(argument => evaluate(argument, scope)));
    }

    case 'NewExpression': {
      const func = evaluate(node.callee, scope);
      const args = node.arguments.map(argument => evaluate(argument, scope));
      // return Reflect.construct(func, args);
      return new (func.bind.apply(func, [null].concat(args)));
    }

    case 'MetaProperty': {
      if (node.meta && node.meta.name === 'new' && node.property && node.property.name == 'target') {
        return scope.get('new_target');
      } else {
        break;
      }
    }



    case 'ReturnStatement': return new ReturnObject(evaluate(node.argument, scope));
    case 'BreakStatement': return new BreakObject(node.label ? node.label.name : undefined);
    case 'ContinueStatement': {
      // scope.set('continueFlag', true);
      return new ContinueObject(node.label ? node.label.name : undefined);
    }

    case 'BlockStatement': {
      const blockScope = new Scope({ type: 'block' }, scope);
      node.body.forEach(stat => {
        hoist(stat, blockScope, true);
      });
      let result;
      for (const stat of node.body) {
        result = evaluate(stat, blockScope);
        if (result instanceof ReturnObject || result instanceof BreakObject || result instanceof ContinueObject) {
          return result;
        }
      }
      return;
    }

    case 'ThisExpression': {
      try {
        return scope.get('thisArg');
      } catch (err) {
        return undefined;
      }
    }

    case 'IfStatement': {
      const result = evaluate(node.test, scope) ? evaluate(node.consequent, scope) : (node.alternate ? evaluate(node.alternate, scope) : undefined);
      return (result instanceof ReturnObject || result instanceof BreakObject || result instanceof ContinueObject) ? result : undefined;
    }

    case 'SwitchStatement': {
      const switchScope = new Scope({ type: 'block' }, scope);
      node.cases.forEach(switchCase => {
        switchCase.consequent.forEach(stat => {
          hoist(stat, switchScope, true);
        });
      });
      // collect statements in matched cases
      const target = evaluate(node.discriminant, scope);
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
      if (scope.get('continueFlag')) { scope.set('continueFlag', false); }
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
      if (scope.get('continueFlag')) {
        scope.set('continueFlag', false);
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
      } else {
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
    }

    case 'ForStatement': {
      if (scope.get('continueFlag')) {
        scope.set('continueFlag', false);
        const forScope = new Scope({ type: 'block' }, scope);
        if (node.init) { hoist(node.init, forScope, true); }
        if (node.test) { hoist(node.test, forScope, true); }
        if (node.update) { hoist(node.update, forScope, true); }
        if (node.body) { hoist(node.body, forScope, true); }
        let result;
        if (node.update) { evaluate(node.update, forScope); }
        while (node.test === null || evaluate(node.test, forScope)) {
          result = evaluate(node.body, forScope);
          if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
            return result;
          } else if (result instanceof BreakObject && result.label === undefined) {
            break;
          } else if (result instanceof ContinueObject && result.label === undefined) {
            continue;
          }
          if (node.update) { evaluate(node.update, forScope); }
        }
        return;



      } else {
        const forScope = new Scope({ type: 'block' }, scope);
        if (node.init) { hoist(node.init, forScope, true); }
        if (node.test) { hoist(node.test, forScope, true); }
        if (node.update) { hoist(node.update, forScope, true); }
        if (node.body) { hoist(node.body, forScope, true); }
        let result;
        if (node.init) { evaluate(node.init, forScope); }
        while (node.test === null || evaluate(node.test, forScope)) {
          result = evaluate(node.body, forScope);
          if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
            return result;
          } else if (result instanceof BreakObject && result.label === undefined) {
            break;
          } else if (result instanceof ContinueObject && result.label === undefined) {
            continue;
          }
          if (node.update) { evaluate(node.update, forScope); }
        }
        return;
      }
      // let tmp, result;
      // for (
      //   let blockScope = (tmp = new Scope('block', scope), node.init !== null ? evaluate(node.init, tmp) : 0, tmp);
      //   node.test === null || evaluate(node.test, blockScope);
      //   node.update !== null ? evaluate(node.update, blockScope) : 0
      // ) {
      //   result = evaluate(node.body, blockScope);
      //   if (result instanceof ReturnObject || (result instanceof BreakObject && result.label !== undefined) || (result instanceof ContinueObject && result.label !== undefined)) {
      //     return result;
      //   } else if (result instanceof BreakObject && result.label === undefined) {
      //     break;
      //   } else if (result instanceof ContinueObject && result.label === undefined) {
      //     continue;
      //   }
      // }
      return;
    }

    case 'LabeledStatement': {
      // 注：label常用于循环语句，也可用于其他语句（语句块），不可用于声明。break label可以跳出非循环语句（语句块等），continue label必须是循环语句的label
      let result = evaluate(node.body, scope);
      while (result instanceof ContinueObject && result.label === node.label.name) {
        scope.set('continueFlag', true);
        result = evaluate(node.body, scope);
      }
      if (result instanceof ReturnObject || (result instanceof ContinueObject && result.label !== node.label.name) || (result instanceof BreakObject && result.label !== node.label.name)) {
        return result;
      } else if (result instanceof BreakObject && result.label === node.label.name) {
        return;
      }
      return;
    }

    case 'ThrowStatement': throw evaluate(node.argument, scope);

    case 'TryStatement': {
      let result;
      try {
        result = evaluate(node.block, scope);
      } catch (err) {
        if (node.handler !== null) {
          const catchScope = new Scope({ type: 'block' }, scope);
          // hoist skip, becase 'err' contain nothing about hoist
          catchScope.declare('let', node.handler.param.name);
          catchScope.set(node.handler.param.name, err, true);
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


  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function hoist(node, scope, inScope) {
  switch (node.type) {
    case 'FunctionDeclaration': {
      let declareScope;
      if (inScope && scope.type === 'block') {
        // do nothing
      } else if (inScope && scope.type === 'function') {
        declareScope = scope;
      } else if (inScope && scope.type === 'script') {
        declareScope = scope.parent;
      } else if (!inScope && scope.type === 'block') {
        // impossible
      } else if (!inScope && scope.type === 'function') {
        declareScope = scope;
      } else if (!inScope && scope.type === 'script') {
        declareScope = scope.parent;
      }
      if (declareScope !== undefined) {
        declareScope.declare('var', node.id.name);
        const f = function (...args) {
          const functionScope = new Scope({ type: 'function' }, scope);
          functionScope.declare('var', 'thisArg');
          functionScope.set('thisArg', this);
          functionScope.declare('var', 'new_target');
          functionScope.set('new_target', new.target);
          for (let i = 0; i < node.params.length; i++) {
            functionScope.declare('var', node.params[i].name);
            functionScope.set(node.params[i].name, i < args.length ? args[i] : undefined, true);
          }
          node.body.body.forEach(stat => {
            hoist(stat, functionScope, true);
          });
          let result;
          for (const stat of node.body.body) {
            result = evaluate(stat, functionScope);
            if (result instanceof ReturnObject) {
              return result.value;
            }
          }
          return;
        }
        Object.defineProperty(f, 'name', { value: node.id.name });
        Object.defineProperty(f, 'length', { value: node.params.length });
        declareScope.set(node.id.name, f, true);
      }
      break;
    }
    case 'VariableDeclaration':
      node.declarations.forEach(declaration => {
        if (inScope && scope.type === 'block' && node.kind === 'var') {
          // do nothing
        } else if (inScope && scope.type === 'block' && node.kind !== 'var') {
          scope.declare(node.kind, declaration.id.name);
        } else if (inScope && scope.type === 'function' && node.kind === 'var') {
          scope.declare(node.kind, declaration.id.name);
        } else if (inScope && scope.type === 'function' && node.kind !== 'var') {
          scope.declare(node.kind, declaration.id.name);
        } else if (inScope && scope.type === 'script' && node.kind === 'var') {
          scope.parent.declare(node.kind, declaration.id.name);
        } else if (inScope && scope.type === 'script' && node.kind !== 'var') {
          scope.declare(node.kind, declaration.id.name);
        } else if (!inScope && scope.type === 'block' && node.kind === 'var') {
          // impossible
        } else if (!inScope && scope.type === 'block' && node.kind !== 'var') {
          // impossible
        } else if (!inScope && scope.type === 'function' && node.kind === 'var') {
          scope.declare(node.kind, declaration.id.name);
        } else if (!inScope && scope.type === 'function' && node.kind !== 'var') {
          // do nothing
        } else if (!inScope && scope.type === 'script' && node.kind === 'var') {
          scope.parent.declare(node.kind, declaration.id.name);
        } else if (!inScope && scope.type === 'script' && node.kind !== 'var') {
          // do nothing
        }
      });
      break;
    case 'BlockStatement':
      if (scope.type === 'block') {
        // do nothing
      } else if (scope.type === 'function') {
        node.body.forEach(stat => {
          hoist(stat, scope, false);
        });
      } else if (scope.type === 'script') {
        node.body.forEach(stat => {
          hoist(stat, scope, false);
        });
      }
      break;
    case 'IfStatement':
      if (scope.type === 'block') {
        if (node.consequent.type === 'BlockStatement') {
          // do nothing
        } else {
          hoist(node.consequent, scope, true);
        }
        if (node.alternate) {
          if (node.alternate.type === 'BlockStatement') {
            // do nothing
          } else {
            hoist(node.alternate, scope, true);
          }
        }
      } else if (scope.type === 'function' || scope.type === 'script') {
        hoist(node.consequent, scope, true);
        if (node.alternate) {
          hoist(node.alternate, scope, true);
        }
      }
      break;
    case 'SwitchStatement':
      if (scope.type === 'block') {
        // do nothing
      } else if (scope.type === 'function' || scope.type === 'script') {
        node.cases.forEach(switchCase => {
          switchCase.consequent.forEach(stat => {
            hoist(stat, scope, false);
          });
        });
      }
      break;
    case 'WhileStatement':
    case 'DoWhileStatement':
      if (scope.type === 'block') {
        if (node.body.type === 'BlockStatement') {
          // do nothing
        } else {
          hoist(node.body, scope, true);
        }
      } else if (scope.type === 'function' || scope.type === 'script') {
        hoist(node.body, scope, true);
      }
      break;
    case 'ForStatement':
      if (scope.type === 'block') {
        // do nothing
      } else if (scope.type === 'function' || scope.type === 'script') {
        if (node.init) { hoist(node.init, scope, false); }
        if (node.test) { hoist(node.test, scope, false); }
        if (node.update) { hoist(node.update, scope, false); }
        if (node.body) { hoist(node.body, scope, false); }
      }
      break;
    case 'LabeledStatement':
      hoist(node.body, scope, true);
      break;
    case 'FunctionExpression': break;
    case 'ArrowFunctionExpression': break;
    case 'TryStatement': {
      if (scope.type === 'block') {
        // do nothing
      } else if (scope.type === 'function' || scope.type === 'script') {
        hoist(node.block, scope, true);
        if (node.handler) { hoist(node.handler.body, scope, false); }
        if (node.finalizer) { hoist(node.finalizer, scope, true); }
      }
      break;
    }

    default: break; // do nothing
  }
}

function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent);

  const node = acorn.parse(code, {
    ecmaVersion: 7 // ES7开始才全面支持**运算符
  })
  evaluate(node, scope);

  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}