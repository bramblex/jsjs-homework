const acorn = require('acorn');

class Scope {
  constructor(initial /* 初始化变量 */, parent, type = 'block') {
    this.variables = {};
    for (const key in initial) {
      this.variables[key] = new Value(initial[key])
    }
    this.type = type; // 'funcition' | 'block'
    this.parent = parent;
  }
  declare(kind = 'var', name, initValue = undefined) {
    if (kind === 'var') {
      if (globalThis.global !== undefined && name === 'global') return new Value(initValue);
      if (globalThis.window !== undefined && name === 'window') return new Value(initValue);
      if (name === 'globalThis') return new Value(initValue);
    }

    if (kind === 'var') {
      // 把变量声明提升至函数体顶部
      let scope = this
      while (scope.parent && scope.type !== 'function') { scope = scope.parent }
      scope.variables[name] = new Value(initValue, 'var')
      return this.variables[name]
    } else if (kind === 'let') {
      if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
      this.variables[name] = new Value(initValue, 'let')
      return this.variables[name]
    } else if (kind === 'const') {
      if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
      this.variables[name] = new Value(initValue, 'const')
      return this.variables[name]
    } else {
      throw new Error(`canjs: Invalid Variable Declaration Kind of "${kind}"`)
    }
  }
  get(name) {
    if (name in this.variables) {
      return this.variables[name].value
    }
    else if (this.parent) { return this.parent.get(name) }
    else if (name in globalThis) { return globalThis[name] }
    throw new ReferenceError(`${name} is not defined`)
  }
  set(name, value) {
    if (globalThis.global !== undefined && name === 'global') return new Value(value);
    if (globalThis.window !== undefined && name === 'window') return new Value(value);
    if (name === 'globalThis') return new Value(value);
    if (name in this.variables) { this.variables[name].set(value) }
    else if (this.parent) { this.parent.set(name, value) }
    else this.declare('var', name, value)
  }
}

class Value {
  constructor(value, kind = 'let') {
    this.value = value
    this.kind = kind
  }
  set(value) {
    // 禁止重新对const类型变量赋值    
    if (this.kind === 'const') {
      throw new TypeError('Assignment to constant variable')
    } else {
      this.value = value
    }
  }
  get() { return this.value }
}

class BlockInterruption {
  constructor(type, value) {
    this.type = type
    this.value = value
  }
  getType() {
    return this.type
  }
  setLabel(label) {
    this.label = label
  }
  getLabel() {
    return this.label
  }
}

function evaluate(node, scope, config) {
  if (!node) return
  switch (node.type) {
    case 'Program': {
      // node.body.map(n => evaluate.call(this, n, scope))
      let ret
      for (const expression of node.body) {
        if (expression.type === 'FunctionDeclaration')
          scope.declare('var', expression.id.name)
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      for (const expression of node.body) {
        if (expression.type === 'BlockStatement') {
          ret = evaluate.call(this, expression, new Scope({}, scope, 'block'))
        }
        else
          ret = evaluate.call(this, expression, scope)
      }
      return ret
      // return
    }
    case 'Literal':
      return node.value;
    case 'Identifier': {
      return scope.get(node.name);
    }
    case 'ExpressionStatement': {
      return evaluate.call(this, node.expression, scope)
    }
    /**
     * 
      enum AssignmentOperator {
        "=" | "+=" | "-=" | "*=" | "/=" | "%="
            | "<<=" | ">>=" | ">>>="
            | "|=" | "^=" | "&="
      }
     */
    case 'AssignmentExpression': {
      let rightValue = evaluate.call(this, node.right, scope)
      if (node.left.type === 'Identifier') {
        // 直接给变量赋值
        if (node.operator === '=') scope.set(node.left.name, rightValue);
        else {
          let leftValue = evaluate.call(this, node.left, scope)
          switch (node.operator) {
            case '+=': scope.set(node.left.name, leftValue + rightValue); break;
            case '-=': scope.set(node.left.name, leftValue - rightValue); break;
            case '/=': scope.set(node.left.name, leftValue / rightValue); break;
            case '*=': scope.set(node.left.name, leftValue * rightValue); break;
            case '%=': scope.set(node.left.name, leftValue % rightValue); break;
            case '<<=': scope.set(node.left.name, leftValue << rightValue); break;
            case '>>=': scope.set(node.left.name, leftValue >> rightValue); break;
            case '>>>=': scope.set(node.left.name, leftValue >>> rightValue); break;
            case '|=': scope.set(node.left.name, leftValue | rightValue); break;
            case '^=': scope.set(node.left.name, leftValue ^ rightValue); break;
            case '&=': scope.set(node.left.name, leftValue & rightValue); break;
          }
        }
        return scope.get(node.left.name)
      } else if (node.left.type === 'MemberExpression') {
        // 给对象的内部属性赋值
        let [leftObj, leftPropName] = evaluate.call(this, node.left, scope, { setObjPropVal: true })
        let leftValue = leftObj[leftPropName]
        let retVal;
        switch (node.operator) {
          case '=': retVal = rightValue; break;
          case '+=': retVal = leftValue + rightValue; break;
          case '-=': retVal = leftValue - rightValue; break;
          case '/=': retVal = leftValue / rightValue; break;
          case '*=': retVal = leftValue * rightValue; break;
          case '%=': retVal = leftValue % rightValue; break;
          case '<<=': retVal = leftValue << rightValue; break;
          case '>>=': retVal = leftValue >> rightValue; break;
          case '>>>=': retVal = leftValue >>> rightValue; break;
          case '|=': retVal = leftValue | rightValue; break;
          case '^=': retVal = leftValue ^ rightValue; break;
          case '&=': retVal = leftValue & rightValue; break;
        }
        leftObj[leftPropName] = retVal;
        return retVal;
      }
    }
    case 'BlockStatement': {
      let ret
      for (const expression of node.body) {
        if (expression.type === 'FunctionDeclaration')
          scope.declare('var', expression.id.name)
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      for (const expression of node.body) {
        if (expression.type === 'BlockStatement') {
          ret = evaluate.call(this, expression, new Scope({}, scope, 'block'))
        }
        else
          ret = evaluate.call(this, expression, scope)
        if (ret instanceof BlockInterruption) return ret;
      }
      return ret
    }
    case 'FunctionDeclaration': {
      // 命名函数
      const fun = function (...args) {
        const nodeScope = new Scope({}, scope, 'function')
        node.params.forEach((param, i) => {
          nodeScope.declare('let', param.name, args[i])
        })
        let ret = evaluate.call(this, node.body, nodeScope);
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
        return undefined
      }
      Object.defineProperty(fun, 'name', {
        get() {
          return node.id.name
        }
      })
      Object.defineProperty(fun, 'length', {
        get() {
          return node.params.length
        }
      })
      return scope.declare('var', node.id.name, fun)
    }
    // 变量声明
    case 'VariableDeclaration': {
      return node.declarations.forEach(v => {
        return scope.declare(node.kind, v.id.name, evaluate.call(this, v.init, scope))
      })
    }
    // If
    case 'IfStatement': {
      if (evaluate.call(this, node.test, scope)) {
        return evaluate.call(this, node.consequent, new Scope({}, scope, 'block'))
      } else if (node.alternate) {
        return evaluate.call(this, node.alternate, new Scope({}, scope, 'block'))
      } else return
    }
    // Switch
    case 'SwitchStatement': {
      let switchScope = new Scope({}, scope, 'block')
      let discriminant = evaluate.call(this, node.discriminant, switchScope)
      for (const c of node.cases) {

        if (c.test !== null && (evaluate.call(this, c.test, switchScope) === discriminant) || c.test === null) {
          let caseScope = new Scope({}, switchScope, 'block')
          let ret
          c.consequent.forEach(e => {
            ret = evaluate.call(this, e, caseScope)
          })
          return ret
        }
      }
      return
    }
    // continue 语句
    case 'ContinueStatement': {
      let continuation = new BlockInterruption('continue');
      if (node.label) continuation.setLabel(node.label.name)
      return continuation
    }
    // break 语句
    case 'BreakStatement': {
      let breaker = new BlockInterruption('break')
      if (node.label) breaker.setLabel(node.label.name)
      return breaker
    }
    // while 语句
    case 'WhileStatement': {
      let ret
      let label = config?.label
      const whileScope = new Scope({}, scope, 'block')
      while (evaluate.call(this, node.test, whileScope)) {
        const whileInnerScope = new Scope({}, whileScope, 'block')
        ret = evaluate.call(this, node.body, whileInnerScope)
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) {
            continue
          }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
      }
      return
    }
    // for语句
    case 'ForStatement': {
      let ret
      let label = config?.label
      // 包括定义索引等的定义域
      const forScope = new Scope({}, scope, 'block')
      for (evaluate.call(this, node.init, forScope); evaluate.call(this, node.test, forScope); evaluate.call(this, node.update, forScope)) {
        // 每次循环内产生内作用域
        const forInnerScope = new Scope({}, forScope, 'block')
        // 运行while内代码
        ret = evaluate.call(this, node.body, forInnerScope)
        // continue
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          // 无label或指定当前label 跳过当前while本次循环
          if (ret.getLabel() === undefined || ret.getLabel() === label) { continue }
          // label不匹配 向上一级作用域抛
          else return ret
        }
        // break
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        // return
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
      }
      return
    }
    case 'DoWhileStatement': {
      let ret
      let label = config?.label
      const whileScope = new Scope({}, scope, 'block')
      do {
        const whileInnerScope = new Scope({}, whileScope, 'block')
        ret = evaluate.call(this, node.body, whileInnerScope)
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) {
            continue
          }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
      } while (evaluate.call(this, node.test, whileScope))
      return
    }
    case 'ForInStatement': {
      let ret
      let label = config?.label
      for (const e in evaluate.call(this, node.right, scope)) {
        // 每次循环内产生内作用域
        const forInScope = new Scope({}, scope, 'block')
        forInScope.declare(node.left.kind, node.left.declarations[0].id.name, e)
        ret = evaluate.call(this, node.body, forInScope)
        // continue
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          // 无label或指定当前label 跳过当前while本次循环
          if (ret.getLabel() === undefined || ret.getLabel() === label) { continue }
          // label不匹配 向上一级作用域抛
          else return ret
        }
        // break
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        // return
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
      }
      return
    }
    case 'LabeledStatement': {
      return evaluate.call(this, node.body, scope, {
        label: node.label.name
      })
    }
    // 逻辑运算符
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate.call(this, node.left, scope) && evaluate.call(this, node.right, scope)
        case '||': return evaluate.call(this, node.left, scope) || evaluate.call(this, node.right, scope)
      }
    }
    // 基本运算符
    /**
     * 
      enum BinaryOperator {
            "==" | "!=" | "===" | "!=="
          | "<" | "<=" | ">" | ">="
          | "<<" | ">>" | ">>>"
          | "+" | "-" | "*" | "/" | "%"
          | "|" | "^" | "&" | "in"
          | "instanceof"
          }
     */
    case 'BinaryExpression': {
      const left = evaluate.call(this, node.left, scope)
      const right = evaluate.call(this, node.right, scope)
      switch (node.operator) {
        case '==': return left == right
        case '!=': return left != right
        case '===': return left === right
        case '!==': return left !== right
        case '<': return left < right;
        case '<=': return left <= right
        case '>': return left > right
        case '>=': return left >= right
        case '<<': return left << right
        case '>>': return left >> right
        case '>>>': return left >>> right
        case '+': return left + right
        case '-': return left - right
        case '*': return left * right
        case '/': return left / right
        case '%': return left % right
        case '|': return left | right
        case '^': return left ^ right
        case '&': return left & right
        case 'in': return left in right
        case 'instanceof': return left instanceof right
        case '**': return left ** right
      }
    }
    // enum UnaryOperator {"-" | "+" | "!" | "~" | "typeof" | "void" | "delete"}
    case 'UnaryExpression': {
      switch (node.operator) {
        case '-': return -evaluate.call(this, node.argument, scope)
        case '+': return +evaluate.call(this, node.argument, scope)
        case '!': return !evaluate.call(this, node.argument, scope)
        case '~': return ~evaluate.call(this, node.argument, scope)
        case 'typeof': {
          try {
            return typeof evaluate.call(this, node.argument, scope)
          } catch (err) {
            return 'undefined'
          }
        }
        case 'void': return void evaluate.call(this, node.argument, scope)
        case 'delete': {
          let [o, p] = evaluate.call(this, node.argument, scope, { setObjPropVal: true })
          return delete o[p]
        }
      }
    }
    // ++ 和 --
    case 'UpdateExpression': {
      let preValue = evaluate.call(this, node.argument, scope)
      if (node.argument.type === 'MemberExpression') {
        let [obj, objPropName] = evaluate.call(this, node.argument, scope, { setObjPropVal: true })
        if (node.operator === '++') {
          return node.prefix ? ++obj[objPropName] : obj[objPropName]++
        } else {
          return node.prefix ? --obj[objPropName] : obj[objPropName]--
        }
      } else {
        // node.argument.type === 'Indentifier'
        if (node.operator === '++') {
          scope.set(node.argument.name, preValue + 1)
          return node.prefix ? (preValue + 1) : preValue
        } else {
          scope.set(node.argument.name, preValue - 1)
          return node.prefix ? (preValue - 1) : preValue
        }
      }
    }
    // 三目运算符
    case 'ConditionalExpression':
      return evaluate.call(this, node.test, scope) ? evaluate.call(this, node.consequent, scope) : evaluate.call(this, node.alternate, scope)
    //对象
    case 'ObjectExpression': {
      let props = node.properties
      const obj = {}
      props.forEach(p => {
        obj[p.key.name] = evaluate.call(this, p.value, scope)
      });
      return obj
    }
    case 'MemberExpression': {
      // 是否设置属性内部值
      let isSetObjPropVal = config?.setObjPropVal
      let obj = node.object.name ? scope.get(node.object.name) : evaluate.call(this, node.object, scope)
      let pname = node.computed ? evaluate.call(this, node.property, scope) : node.property.name
      let propValue = obj[pname]
      if (propValue instanceof BlockInterruption) propValue = propValue.value
      return isSetObjPropVal ? [obj, pname] : propValue
    }
    // 数组
    case 'ArrayExpression': {
      return node.elements.map(e => evaluate.call(this, e, scope)) || []
    }
    // 调用执行函数
    case 'CallExpression': {
      let callee = evaluate.call(this, node.callee, scope, { setObjPropVal: true })
      let ret
      if (callee instanceof Array) {
        let [o, p] = callee;
        let f = o[p]
        if (!(f instanceof Function)) {
          let functionName = srcCode.substring(node.callee.start, node.callee.end)
          throw new TypeError(`${functionName}is not a function`)
        }
        ret = f.apply(o, node.arguments.map(arg => evaluate.call(this, arg, scope)))
      } else {
        if (!callee instanceof Function) {
          let functionName = srcCode.substring(node.callee.start, node.callee.end)
          throw new TypeError(`${functionName}is not a function`)
        }
        ret = callee.apply(this, node.arguments.map(arg => evaluate.call(this, arg, scope)))
      }
      // ret = fun(...node.arguments.map(arg => evaluate.call(this, arg, scope)));
      return ret instanceof BlockInterruption ? ret.value : ret
    }
    // 普通函数
    case 'FunctionExpression': {
      const fun = function (...args) {
        const funScope = new Scope({}, scope, 'function')
        node.params.forEach((param, i) => {
          funScope.declare('let', param.name, args[i])
        })
        let ret = evaluate.call(this, node.body, funScope);
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
        return undefined
      }
      if (node.id !== null) {
        scope.declare('var', node.id.name, fun)
      }
      // fun.toString = () => srcCode.substring(node.start, node.end)
      Object.defineProperty(fun, 'name', {
        get() {
          return node.id?.name
        }
      })
      Object.defineProperty(fun, 'length', {
        get() {
          return node.params.length
        }
      })
      return fun
    }
    // 箭头函数
    case 'ArrowFunctionExpression': {
      const fun = (...args) => {
        const funScope = new Scope({}, scope, 'function')
        node.params.forEach((param, i) => {
          funScope.declare('let', param.name, args[i])
        })
        let ret = evaluate.call(this, node.body, funScope);
        if (node.async) return new Promise(ret)
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
        return
      }
      Object.defineProperty(fun, 'name', {
        get() {
          return ''
        }
      })
      return fun
    }
    // try
    case 'TryStatement': {
      let ret
      try {
        const tryScope = new Scope({}, scope, 'block')
        ret = evaluate.call(this, node.block, tryScope)
      } catch (err) {
        const catchScope = new Scope({}, scope, 'block')
        catchScope.declare('let', node.handler.param.name, err)
        ret = evaluate.call(this, node.handler.body, catchScope) || ret
      } finally {
        if (node.finalizer !== null) {
          ret = evaluate.call(this, node.finalizer, new Scope({}, scope, 'block'))
        }
      }
      return ret
    }
    // throw
    case 'ThrowStatement': {
      throw evaluate.call(this, node.argument, scope)
    }
    case 'EmptyStatement': return
    case 'SequenceExpression': {
      let arr = node.expressions.map(e => evaluate.call(this, e, scope))
      return arr[arr.length - 1]
    }
    // return
    case 'ReturnStatement': {
      return new BlockInterruption('return', evaluate.call(this, node.argument, scope))
    }
    // new 构造函数
    case 'NewExpression': {
      const callee = evaluate.call(this, node.callee, scope)
      if (callee.prototype === undefined) {
        throw new TypeError(`${srcCode.substring(node.callee.start, node.callee.end)} is not a constructor`)
      }
      const args = node.arguments.map(arg => evaluate.call(this, arg, scope))
      const o = Object.create(callee.prototype)
      // o.toString = () => { return `[object ${node.callee.name}]` }
      const k = callee.apply(o, args)
      return k instanceof Object ? Object.create(o.prototype) : o
      // return new callee(...args)
    }
    case 'ThisExpression': {
      return this
    }
    // new.target指向
    case 'MetaProperty': {
      return this.__proto__?.constructor
    }
  }
  console.log(node)
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent);

  const node = acorn.parse(code, {
    ecmaVersion: 2017
  })
  evaluate(node, scope);

  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}