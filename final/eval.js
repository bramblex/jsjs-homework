const acorn = require('acorn');
const { Scope, BlockInterruption } = require('./scope')
let srcCode
function evaluate(node, scope, config) {
  if (!node) return
  switch (node.type) {
    case 'Program': {
      let ret
      for (const expression of node.body) {
        // 函数提升
        if (expression.type === 'FunctionDeclaration')
          evaluate.call(this, expression, scope)
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          // 变量提升
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      for (const expression of node.body) {
        if (expression.type === 'BlockStatement') {
          ret = evaluate.call(this, expression, new Scope({}, scope, 'block'))
        }
        else if (expression !== 'FunctionDeclaration')
          ret = evaluate.call(this, expression, scope)
      }
      return ret
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

      if (node.left.type === 'Identifier') {
        let rightValue = evaluate.call(this, node.right, scope)
        if (rightValue instanceof BlockInterruption) return rightValue
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
            case '**=': scope.set(node.left.name, leftValue = Math.pow(leftValue, rightValue)); break;
            case '||=': scope.set(node.left.name, leftValue = leftValue || rightValue); break;
            case '&&=': scope.set(node.left.name, leftValue = leftValue && rightValue); break;
            case '??=': scope.set(node.left.name, leftValue = leftValue ?? rightValue); break;
          }
        }
        return scope.get(node.left.name)
      } else if (node.left.type === 'MemberExpression') {
        // 给对象的内部属性赋值
        let [leftObj, leftPropName] = evaluate.call(this, node.left, scope, { setObjPropVal: true })
        let rightValue = evaluate.call(this, node.right, scope)
        if (rightValue instanceof BlockInterruption) return rightValue
        if (node.operator === '=') return leftObj[leftPropName] = rightValue;
        let leftValue = leftObj[leftPropName]
        let retVal;
        switch (node.operator) {
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
      // 是否异步作用域
      const isAsyncBlock = config?.isAsyncBlock || false
      // Hoisting
      for (const expression of node.body) {
        if (expression.type === 'FunctionDeclaration')
          // 函数提升
          evaluate.call(this, expression, scope)
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          // var 变量提升
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      // generator作用域
      if (isAsyncBlock) {
        let ret
        for (let i in node.body) {
          const expression = node.body[i]
          if (expression.type === 'BlockStatement') {
            ret = evaluate.call(this, expression, new Scope({}, scope, 'block'))
          }
          else if (expression !== 'FunctionDeclaration') {
            try {
              ret = evaluate.call(this, expression, scope)
            } catch (e) {
              if (e instanceof BlockInterruption) {
                // 删除已执行的代码从本段开始
                node.body = node.body.slice(i)
                // 将next()中的参数传入
                e.value.nextArg(config?.arg)
                return e;
              }
              // 其他错误
              console.error(e)
            }
          }
          if (ret instanceof BlockInterruption && ret.getType() === 'return') {
            node.body.length = 0
            return ret;
          }
        }
        return ret
      }
      // 普通作用域
      let ret
      for (const expression of node.body) {
        if (expression.type === 'BlockStatement') {
          ret = evaluate.call(this, expression, new Scope({}, scope, 'block'))
        }
        else if (expression !== 'FunctionDeclaration')
          ret = evaluate.call(this, expression, scope)
        if (ret instanceof BlockInterruption) return ret;
      }
      return ret
    }
    case 'FunctionDeclaration': {
      //generator函数
      if (node.generator) {
        const generator = function (...args) {
          const generatorScope = new Scope({}, scope, 'function')
          node.params.forEach((param, i) => {
            generatorScope.declare('let', param.name, args[i])
          })
          return {
            [Symbol.toStringTag]: 'Generator',
            next(arg) {
              let ret = evaluate.call(this, node.body, generatorScope, { isAsyncBlock: true, arg })
              if (ret?.getType() === 'return') return { value: ret.value, done: true }
              else if (ret?.getType() === 'yield') return { value: ret.value.value, done: false }
              return { value: undefined, done: true }
            },
            return(value) {
              node.body.body = []
              return { value, done: true }
            }
          }
        }
        generator[Symbol.toStringTag] = 'GeneratorFunction'
        return scope.declare('var', node.id.name, generator)
      }
      // async函数
      if (node.async) {
        const asyncFun = function (...args) {
          return new Promise(function (resolve, reject) {
            const nodeScope = new Scope({}, scope, 'function')
            node.params.forEach((param, i) => {
              nodeScope.declare('let', param.name, args[i])
            })
            try {
              let ret = evaluate.call(this, node.body, nodeScope);
              if (ret instanceof BlockInterruption && ret.getType() === 'return') return resolve(ret.value)
              resolve(ret)
            } catch (err) {
              reject(err)
            }

          })
        }
        return scope.declare('var', node.id.name, asyncFun)
      }
      if (node.async && node.generator) {
        //这位更是重量级（摆了）
      }
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
      let ret
      node.declarations.forEach(v => {
        ret = scope.declare(node.kind, v.id.name, evaluate.call(this, v.init, scope))
      })
      return ret
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
      let isMatched = false//匹配
      let ret
      for (const c of node.cases) {
        if (c.test !== null && (evaluate.call(this, c.test, switchScope) === discriminant) || c.test === null) {
          isMatched = true
        }
        if (isMatched) {
          let caseScope = new Scope({}, switchScope, 'block')
          c.consequent.forEach(e => {
            ret = e.type === 'BlockStatement' ? evaluate.call(this, e, caseScope) : evaluate.call(this, e, switchScope)
          })
          if (ret instanceof BlockInterruption) return ret
        }
      }
      return ret
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
      const varNames = []
      // for循环是否是以let声明初始化
      const isLetInit = node.init?.type === 'VariableDeclaration' && node.init.kind === 'let'
      for (evaluate.call(this, node.init, forScope);
        node.test === null ? true : evaluate.call(this, node.test, forScope);
        evaluate.call(this, node.update, forScope)
      ) {
        // init时的变量 存储的作用域 每次循环都产生新变量作用域
        const forInitScope = new Scope({}, forScope, 'block')
        // 若为let则向父节点拷贝变量
        if (isLetInit) {
          forInitScope.copyFromParent()
        }
        // 每次循环 运行时 的作用域
        const forInnerScope = new Scope({}, forInitScope, 'block')
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
        case '??': return evaluate.call(this, node.left, scope) ?? evaluate.call(this, node.right, scope)
        default: break
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
        case '**': return Math.pow(left, right)
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
        // 属性值
        let val = evaluate.call(this, p.value, scope)
        // 属性名
        let pName = p.computed ? evaluate.call(this, p.key.name, scope) : p.key.name
        switch (p.kind) {
          case 'init': {
            if (p.value.type === 'FunctionExpression' && p.value.id === null) {
              Object.defineProperty(val, 'name', {
                get() {
                  return pName
                }
              })
            }
            obj[p.key.name] = val
          } break;
          case 'get': {
            Object.defineProperty(obj, pName, {
              get() {
                return val.call(obj)
              }
            })
            break;
          }
          case 'set': {
            Object.defineProperty(obj, pName, {
              set(v) {
                return val.call(obj, v)
              }
            })
          } break;
        }

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
        return ret
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
    // new 关键字
    case 'NewExpression': {
      const callee = evaluate.call(this, node.callee, scope)
      if (callee.prototype === undefined) {
        throw new TypeError(`${srcCode.substring(node.callee.start, node.callee.end)} is not a constructor`)
      }
      const args = node.arguments.map(arg => evaluate.call(this, arg, scope))
      // 当callee是globalThis上内置的系统函数可以直接new时，则直接new
      if (callee.name in globalThis && globalThis[callee.name] === callee) return new callee(...args)
      // 构造原型链模拟new
      const o = Object.create(callee.prototype)
      const k = callee.apply(o, args)
      return k instanceof Object ? k : o
    }
    case 'ThisExpression': {
      return this !== globalThis ? this : undefined
    }
    // new.target指向
    case 'MetaProperty': {
      // 仅通过测试案例 但不严谨，若用对象调用则结果错误
      return this === globalThis ? undefined : this.constructor
    }
    case 'AwaitExpression': {
      const ret = evaluate.call(this, node.argument, scope)
      return ret instanceof Promise ? ret : new Promise(function (res) { res(ret) })
    }
    case 'YieldExpression': {
      if (node.hasComplete) return node.nextArg;
      let ret = evaluate.call(this, node.argument, scope)
      node.hasComplete = true;
      // value:ret yield的值 nextArg : 返回值
      throw new BlockInterruption('yield', {
        value: ret, nextArg: (nextArg) => { node.nextArg = nextArg }
      })
    }
  }
  console.error('未实现功能:\n AST: \n', node)
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customEval(code, scope) {
  srcCode = code
  scope.declare('const', 'module', { export: {} })

  const node = acorn.parse(code, {
    ecmaVersion: 2017,

  })
  evaluate(node, scope);

  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}