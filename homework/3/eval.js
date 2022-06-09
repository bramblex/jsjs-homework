const acorn = require('acorn');

class Scope {
  constructor(type, parent=null) {
    this.variables = {}; // name: value
    this.kinds = {}; // name: 'var' | 'let' | 'const'
    this.type = type; // 'function' | 'block' | 'global'
    this.parent = parent;
  }
  declare(kind, name, value) {
    if (name in this.variables) {
      // var 和 function 可以重复声明，其它类型不能
      if (this.kinds[name] === 'var' && kind === 'var') {
        this.variables[name] = value;
        return undefined;
      } else {
        throw new SyntaxError(`${name} has already been declared`);
      }
    } else {
      this.variables[name] = value;
      this.kinds[name] = kind;
      return undefined;
    }
  }
  get(name) {
    if (name in this.variables) {
      return this.variables[name];
    } else if (this.parent) {
      return this.parent.get(name);
    } else {
      throw new ReferenceError(`${name} is not defined`);
    }
  }
  set(name, value) {
    try {
      this.get(name); // 已声明，在对应作用域赋值
      if (name in this.variables) {
        if (this.kinds[name] === 'const') { // const不允许赋值
          throw new TypeError('Assignment to constant variable');
        } else {
          return this.variables[name] = value;
        }
      } else {
        return this.parent.set(name, value);
      }
    } catch (err) { // 未声明，在当前作用域声明并赋值
      if (err instanceof ReferenceError) {
        this.variables[name] = value;
        this.kinds[name] = 'var';
      } else {
        throw err;
      }
    }
  }
}

class Interrupt {
  constructor(type, value) {
    this.type = type; // 'break' | 'continue' | 'throw'
    this.value = value;
  }
}

function evaluate(node, scope, config) {
  if (!node) {
    return;
  }
  switch (node.type) {
    // TODO: 补全作业代码
    // 变量声明相关
    case 'VariableDeclaration':
      node.declarations.forEach(decl => {
        scope.declare(node.kind, decl.id.name, decl.init ? evaluate(decl.init, scope) : undefined);
      });
      return undefined;
    // 控制流相关
    case 'LabeledStatement':
      try {
        return evaluate(node.body, scope, {...config, label: node.label.name});
      } catch (e) {
        if (e instanceof Interrupt && e.type === 'break' && e.value === node.label.name) {
          return undefined;
        } else {
          throw e;
        }
      }
    case 'IfStatement':
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      } else {
        return evaluate(node.alternate, scope);
      }
    case 'SwitchStatement':
      let res;
      const discriminant = evaluate(node.discriminant, scope);
      node.cases.reduce((acc, cur) => {
        if (acc || (acc = (discriminant === evaluate(cur.test, scope)))) {
          const caseScope = new Scope('block', scope);
          res = cur.consequent.reduce((_, cur) => {
            return evaluate(cur, caseScope);
          }, undefined);
        }
      }, false);
      return res;
    case 'BreakStatement':
      throw new Interrupt('break', node.label ? node.label.name : undefined);
    case 'ContinueStatement':
      throw new Interrupt('continue', node.label ? node.label.name : undefined);
    case 'ReturnStatement':
      throw new Interrupt('return', evaluate(node.argument, scope));
    case 'ForStatement':
      let forScope = new Scope('block', scope);
      for (evaluate(node.init, forScope); evaluate(node.test, forScope); evaluate(node.update, forScope)) {
        try {
          evaluate(node.body, new Scope('block', forScope));
        } catch (e) {
          if (e instanceof Interrupt) {
            if (!e.value || e.value == node.config.label) {
              if (e.type === 'break') {
                return;
              } else if (e.type === 'continue') {
                continue;
              } else {
                throw e;
              }
            } else {
              return e;
            }
          }
        }
      }
      return undefined;
    case 'WhileStatement':
      let whileScope = new Scope('block', scope);
      while (evaluate(node.test, whileScope)) {
        try {
          evaluate(node.body, new Scope('block', whileScope));
        } catch (e) {
          if (e instanceof Interrupt) {
            if (!e.value || e.value == node.config.label) {
              if (e.type === 'break') {
                return;
              } else if (e.type === 'continue') {
                continue;
              } else {
                throw e;
              }
            } else {
              return e;
            }
          }
        }
      }
      return undefined;
    case 'TryStatement':
      try {
        return evaluate(node.block, new Scope('block', scope));
      } catch (err) {
        if (err instanceof Interrupt) {
          if (err.type === 'throw') {
            try {
              const catchScope = new Scope('block', scope);
              catchScope.declare('var', node.handler.param.name, err.value);
              return evaluate(node.handler.body, catchScope);
            } catch (e) {
              if (e instanceof Interrupt && e.type === 'return') {
                return e.value;
              }
            }
          }
        } else {
          throw err;
        }
      } finally {
        try {
          evaluate(node.finalizer, new Scope('block', scope));
        } catch (err) {
          if (err instanceof Interrupt && err.type === 'return') {
            return err.value;
          } else {
            throw err;
          }
        }
      }
    case 'ThrowStatement':
      throw new Interrupt('throw', evaluate(node.argument, scope));
    // 不知道咋分类qwq
    // body每个部分都跑一遍但只返回最后一个值
    case 'Program':
      return node.body.reduce((_, expression) =>
        evaluate(expression, scope), undefined);
    case 'BlockStatement':
      return node.body.reduce((_, expression) =>
        evaluate(expression, scope), undefined);
    case 'ExpressionStatement':
      return evaluate(node.expression, scope);
    // 表达式求值相关
    // 作为叶子节点的字面量和变量直接返回它们的值
    case 'Literal':
      return node.value;
    case 'Identifier':
      return scope.get(node.name);
    // 数组，对象
    case 'ArrayExpression':
      return node.elements.map(e => evaluate(e, scope));
    case 'ObjectExpression':
      return node.properties.reduce((obj, prop) => ({
        ...obj,
        [prop.key.name]: evaluate(prop.value, scope),
      }), {});
    // 一些运算相关的表达式((懒得枚举运算符所以直接用eval了嘤~
    case 'BinaryExpression':
      switch (node.operator) {
        case '+': return evaluate(node.left, scope) + evaluate(node.right, scope);
        case '-': return evaluate(node.left, scope) - evaluate(node.right, scope);
        case '*': return evaluate(node.left, scope) * evaluate(node.right, scope);
        case '/': return evaluate(node.left, scope) / evaluate(node.right, scope);
        case '%': return evaluate(node.left, scope) % evaluate(node.right, scope);
        case '<': return evaluate(node.left, scope) < evaluate(node.right, scope);
        case '>': return evaluate(node.left, scope) > evaluate(node.right, scope);
        case '<=': return evaluate(node.left, scope) <= evaluate(node.right, scope);
        case '>=': return evaluate(node.left, scope) >= evaluate(node.right, scope);
        case '==': return evaluate(node.left, scope) == evaluate(node.right, scope);
        case '!=': return evaluate(node.left, scope) != evaluate(node.right, scope);
        case '===': return evaluate(node.left, scope) === evaluate(node.right, scope);
        case '!==': return evaluate(node.left, scope) !== evaluate(node.right, scope);
        case '<<': return evaluate(node.left, scope) << evaluate(node.right, scope);
        case '>>': return evaluate(node.left, scope) >> evaluate(node.right, scope);
        case '>>>': return evaluate(node.left, scope) >>> evaluate(node.right, scope);
        case '&': return evaluate(node.left, scope) & evaluate(node.right, scope);
        case '|': return evaluate(node.left, scope) | evaluate(node.right, scope);
        case '^': return evaluate(node.left, scope) ^ evaluate(node.right, scope);
        case 'in': return evaluate(node.left, scope) in evaluate(node.right, scope);
        case 'instanceof': return evaluate(node.left, scope) instanceof evaluate(node.right, scope);
      }
    case 'UnaryExpression':
      switch (node.operator) {
        case '+': return +evaluate(node.argument, scope);
        case '-': return -evaluate(node.argument, scope);
        case '~': return ~evaluate(node.argument, scope);
        case '!': return !evaluate(node.argument, scope);
        case 'typeof': return typeof evaluate(node.argument, scope);
      }
    // 这里有个短路
    case 'LogicalExpression':
      return node.operator === '&&' ?
        evaluate(node.left, scope) && evaluate(node.right, scope) :
        evaluate(node.left, scope) || evaluate(node.right, scope);
    case 'ConditionalExpression':
      return evaluate(node.test, scope) ?
        evaluate(node.consequent, scope) :
        evaluate(node.alternate, scope);
    case 'MemberExpression':
      const object = node.object.type === 'Identifier' ? scope.get(node.object.name) : evaluate(node.object, scope);
      const property = node.computed ? evaluate(node.property, scope) : node.property.name;    
      return config?.isNestingRoot ? {object, property} : object[property];
    case 'UpdateExpression':
      if (node.argument.type === 'Identifier') {
        let value = evaluate(node.argument, scope);
        if (node.prefix) {
          return scope.set(node.argument.name, node.operator === '++' ? value + 1 : value - 1);
        } else {
          scope.set(node.argument.name, node.operator === '++' ? value + 1 : value - 1);
          return value;
        }
      } else if (argument.type === 'MemberExpression') {
        const {object, property} = evaluate(node.left, scope, {isNestingRoot: true});
        let value = object[property];
        if (node.prefix) {
          return object[property] = node.operator === '++' ? value + 1 : value - 1;
        } else {
          object[property] = node.operator === '++' ? value + 1 : value - 1;
          return value;
        }
      }
    case 'AssignmentExpression':
      if (node.left.type === 'Identifier') {
        switch (node.operator) {
          case '=':
            return scope.set(node.left.name, evaluate(node.right, scope));
          case '+=':
            return scope.set(node.left.name, evaluate(node.left, scope) + evaluate(node.right, scope));
          case '-=':
            return scope.set(node.left.name, evaluate(node.left, scope) - evaluate(node.right, scope));
          case '*=':
            return scope.set(node.left.name, evaluate(node.left, scope) * evaluate(node.right, scope));
          case '/=':
            return scope.set(node.left.name, evaluate(node.left, scope) / evaluate(node.right, scope));
          case '%=':
            return scope.set(node.left.name, evaluate(node.left, scope) % evaluate(node.right, scope));
          case '<<=':
            return scope.set(node.left.name, evaluate(node.left, scope) << evaluate(node.right, scope));
          case '>>=':
            return scope.set(node.left.name, evaluate(node.left, scope) >> evaluate(node.right, scope));
          case '>>>=':
            return scope.set(node.left.name, evaluate(node.left, scope) >>> evaluate(node.right, scope));
          case '&=':
            return scope.set(node.left.name, evaluate(node.left, scope) & evaluate(node.right, scope));
          case '^=':
            return scope.set(node.left.name, evaluate(node.left, scope) ^ evaluate(node.right, scope));
          case '|=':
            return scope.set(node.left.name, evaluate(node.left, scope) | evaluate(node.right, scope));
        }
      } else if (node.left.type === 'MemberExpression') { // 对象成员赋值
        const {object, property} = evaluate(node.left, scope, {isNestingRoot: true});
        switch (node.operator) {
          case '=':
            return object[property] = evaluate(node.right, scope);
          case '+=':
            return object[property] += evaluate(node.right, scope);
          case '-=':
            return object[property] -= evaluate(node.right, scope);
          case '*=':
            return object[property] *= evaluate(node.right, scope);
          case '/=':
            return object[property] /= evaluate(node.right, scope);
          case '%=':
            return object[property] %= evaluate(node.right, scope);
          case '<<=':
            return object[property] <<= evaluate(node.right, scope);
          case '>>=':
            return object[property] >>= evaluate(node.right, scope);
          case '>>>=':
            return object[property] >>>= evaluate(node.right, scope);
          case '&=':
            return object[property] &= evaluate(node.right, scope);
          case '^=':
            return object[property] ^= evaluate(node.right, scope);
          case '|=':
            return object[property] |= evaluate(node.right, scope);
        }
      }
    // 逗号都要算一遍，只返回最后一个值
    case 'SequenceExpression':
      return node.expressions.reduce((_, expression) =>
        evaluate(expression, scope), undefined);
    // 函数及作用域相关
    case 'FunctionExpression':
      return function (...args) {
        let newScope = new Scope('function', scope);
        node.params.forEach((param, index) => newScope.set(param.name, args[index]));
        return evaluate(node.body, newScope);
      };
    case 'ArrowFunctionExpression':
      return function (...args) {
        let newScope = new Scope('function', scope);
        node.params.forEach((param, index) => newScope.set(param.name, args[index]));
        return evaluate(node.body, newScope);
      };
    case 'CallExpression':
      try {
        return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)));
      } catch(e) {
        if (e instanceof Interrupt && e.type === 'return') {
          return e.value;
        } else {
          throw e;
        }
      }
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, scope = new Scope('global')) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, scope)
}

// customerEval('(function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0)');

module.exports = customerEval