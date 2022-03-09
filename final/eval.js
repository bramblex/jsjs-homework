const acorn = require('acorn');
const { Scope, BlockInterruption } = require('./scope')
let srcCode
function* evaluate(node, scope, config) {
  if (!node) return
  switch (node.type) {
    case 'Program': {
      let ret
      for (const expression of node.body) {
        // 函数提升
        if (expression.type === 'FunctionDeclaration') {
          const g = evaluate.call(this, expression, scope)
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
        }
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          // 变量提升
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      for (const expression of node.body) {
        if (expression.type === 'BlockStatement') {
          const g = evaluate.call(this, expression, new Scope({}, scope, 'block'))
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
          ret = r.value
        }
        else if (expression !== 'FunctionDeclaration') {
          const g = evaluate.call(this, expression, scope)
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
          ret = r.value
        }
      }
      return ret
    }
    case 'Literal':
      return node.value;
    case 'Identifier': {
      return scope.get(node.name);
    }
    case 'ExpressionStatement': {
      const g = evaluate.call(this, node.expression, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      return r.value
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
        const gr = evaluate.call(this, node.right, scope)
        let r = gr.next()
        while (!r.done) r = gr.next(yield r.value)
        let rightValue = r.value
        if (rightValue instanceof BlockInterruption) return rightValue
        // 直接给变量赋值
        if (node.operator === '=') scope.set(node.left.name, rightValue);
        else {
          const gl = evaluate.call(this, node.left, scope)
          let r = gl.next()
          while (!r.done) r = gl.next(yield r.value)
          let leftValue = r.value

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
        const gl = evaluate.call(this, node.left, scope, { setObjPropVal: true })
        let l = gl.next()
        while (!l.done) l = gl.next(yield l.value)

        let [leftObj, leftPropName] = l.value

        const gr = evaluate.call(this, node.right, scope);
        let r = gr.next()
        while (!r.done) r = gr.next(yield r.value)
        let rightValue = r.value

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
      // Hoisting
      for (const expression of node.body) {
        if (expression.type === 'FunctionDeclaration') {
          // 函数提升
          const g = evaluate.call(this, expression, scope)
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
        }
        else if (expression.type === 'VariableDeclaration' && expression.kind === 'var')
          // var 变量提升
          expression.declarations?.forEach(d => {
            scope.declare('var', d.id.name)
          })
      }
      // 普通作用域
      let ret
      for (const expression of node.body) {
        let s
        if (expression.type === 'BlockStatement') {
          s = new Scope({}, scope, 'block')
        } else if (expression.type !== 'FunctionDeclaration') {
          s = scope
        } else continue

        const g = evaluate.call(this, expression, s)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value

        if (ret instanceof BlockInterruption) return ret;
      }
      return ret
    }
    // 函数声明
    case 'FunctionDeclaration': {
      //generator函数
      if (node.generator && !node.async) {
        const generator = function (...args) {
          const generatorScope = new Scope({}, scope, 'function')
          node.params.forEach((param, i) => {
            generatorScope.declare('let', param.name, args[i])
          })
          const g = evaluate.call(this, node.body, generatorScope)
          return {
            [Symbol.toStringTag]: 'Generator',
            next(arg) {
              let ret = g.next(arg)
              if (ret.value instanceof BlockInterruption && ret.value.getType() === 'return')
                return { value: ret.value.value, done: ret.done }
              return ret
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
      if (node.async && !node.generator) {
        // setTimeout特性：在当前程序完成之后再开始计时，冗余程序可能会阻塞计时
        const asyncFun = function (...args) {
          return new Promise(function (resolve, reject) {
            const nodeScope = new Scope({}, scope, 'function')
            node.params.forEach((param, i) => {
              nodeScope.declare('let', param.name, args[i])
            })
            try {
              const g = evaluate.call(this, node.body, nodeScope);
              const handler = (res) => {
                let r = g.next(res)
                if (r.done) {
                  let ret = r.value
                  if (ret instanceof BlockInterruption && ret.getType() === 'return')
                    resolve(ret.value)
                  else
                    resolve(ret)
                } else {
                  r.value.then(handler)
                }
              }
              handler()
            } catch (err) {
              reject(err)
            }
          })
        }
        return scope.declare('var', node.id.name, asyncFun)
      }
      if (node.async && node.generator) {
        //这位更是重量级（摆了）
        throw new Error('开摆')
      }
      // 普通函数
      const fun = function (...args) {
        const nodeScope = new Scope({}, scope, 'function')
        node.params.forEach((param, i) => {
          nodeScope.declare('let', param.name, args[i])
        })

        const g = evaluate.call(this, node.body, nodeScope)
        let r = g.next()
        let ret = r.value

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
      for (const v of node.declarations) {
        const g = evaluate.call(this, v.init, scope)

        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        let init = r.value

        ret = scope.declare(node.kind, v.id.name, init)
      }
      return ret
    }
    // If
    case 'IfStatement': {
      if (evaluate.call(this, node.test, scope).next().value) {
        const g = evaluate.call(this, node.consequent, new Scope({}, scope, 'block'))
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        return r.value
      } else if (node.alternate) {
        const g = evaluate.call(this, node.alternate, new Scope({}, scope, 'block'))
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        return r.value
      } else return
    }
    // Switch
    case 'SwitchStatement': {
      let switchScope = new Scope({}, scope, 'block')

      const g = evaluate.call(this, node.discriminant, switchScope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      let discriminant = r.value

      let isMatched = false//匹配
      let ret
      for (const c of node.cases) {
        if (isMatched === false) {
          if (c.test !== null) {
            const g = evaluate.call(this, c.test, switchScope)
            let r = g.next()
            while (!r.done) r = g.next(yield r.value)
            isMatched = r.value === discriminant
          } else {
            isMatched = true
          }
        }
        if (isMatched) {
          let caseScope = new Scope({}, switchScope, 'block')
          for (e of c.consequent) {
            const g = e.type === 'BlockStatement' ? evaluate.call(this, e, caseScope) : evaluate.call(this, e, switchScope)
            let r = g.next()
            while (!r.done) r = g.next(yield r.value)
            ret = r.value
          }
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

      // 初始化test
      const gTest = evaluate.call(this, node.test, whileScope)
      let test = gTest.next()
      while (!test.done) test = gTest.next(yield test.value)
      test = test.value

      while (test) {
        const whileInnerScope = new Scope({}, whileScope, 'block')
        const g = evaluate.call(this, node.body, whileInnerScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value

        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) {
            const gTest = evaluate.call(this, node.test, whileScope)
            test = gTest.next()
            while (!test.done) test = gTest.next(yield test.value)
            test = test.value
            // continue之前更新test
            continue
          }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
        // 若进入下一个循环则更新test
        const gTest = evaluate.call(this, node.test, whileScope)
        test = gTest.next()
        while (!test.done) test = gTest.next(yield test.value)
        test = test.value
      }
      return
    }
    // for语句
    case 'ForStatement': {
      let ret
      let label = config?.label
      // 包括定义索引等的定义域
      const forScope = new Scope({}, scope, 'block')
      // for循环是否是以let声明初始化
      const isLetInit = node.init?.type === 'VariableDeclaration' && node.init.kind === 'let'
      // init 初始化
      const gInit = evaluate.call(this, node.init, forScope)
      let r = gInit.next()
      while (!r.done) r = gInit.next(yield r.value)
      const init = r.value
      // test 初始化
      let test
      if (node.test === null) test = true
      else {
        const gTest = evaluate.call(this, node.test, forScope)
        test = gTest.next()
        while (!test.done) test = gTest.next(yield test.value)
        test = test.value
      }
      // update初始化
      let update
      if (node.update === null) update = node.update
      for (init; test; update) {
        // init时的变量 存储的作用域 每次循环都产生新变量作用域
        const forInitScope = new Scope({}, forScope, 'block')
        // 若为let则向父节点拷贝变量
        if (isLetInit) {
          forInitScope.copyFromParent()
        }
        // 每次循环 运行时 的作用域
        const forInnerScope = new Scope({}, forInitScope, 'block')
        // 运行for内代码
        const g = evaluate.call(this, node.body, forInnerScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value

        // continue
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          // 无label或指定当前label 跳过当前while本次循环
          if (ret.getLabel() === undefined || ret.getLabel() === label) {
            // continue
          }
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

        // 下一循环前更新update
        if (node.update !== null) {
          const gUpdate = evaluate.call(this, node.update, forScope)
          update = gUpdate.next()
          while (!update.done) update = gUpdate.next(yield update.value)
          update = update.value
        }
        // 下一循环前更新test
        if (node.test !== null) {
          const gTest = evaluate.call(this, node.test, forScope)
          test = gTest.next()
          while (!test.done) test = gTest.next(yield test.value)
          test = test.value
        }
      }
      return
    }
    // doWhile
    case 'DoWhileStatement': {
      let ret
      let label = config?.label
      const whileScope = new Scope({}, scope, 'block')

      // 初始化test
      const gTest = evaluate.call(this, node.test, whileScope)
      let test = gTest.next()
      while (!test.done) test = gTest.next(yield test.value)
      test = test.value

      do {
        const whileInnerScope = new Scope({}, whileScope, 'block')
        const g = evaluate.call(this, node.body, whileInnerScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) {
            // continue
          }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'break') {
          if (ret.getLabel() === undefined || ret.getLabel() === label) { return }
          else return ret
        }
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret

        // 下一循环前更新test
        if (node.test !== null) {
          const gTest = evaluate.call(this, node.test, whileScope)
          test = gTest.next()
          while (!test.done) test = gTest.next(yield test.value)
          test = test.value
        }
      } while (test)
      return
    }
    // forIn
    case 'ForInStatement': {
      let ret
      let label = config?.label

      const g = evaluate.call(this, node.right, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      const right = r.value

      for (const e in right) {
        // 每次循环内产生内作用域
        const forInScope = new Scope({}, scope, 'block')
        forInScope.declare(node.left.kind, node.left.declarations[0].id.name, e)
        // 运行代码块
        const g = evaluate.call(this, node.body, forInScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value

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
    // Label
    case 'LabeledStatement': {
      const g = evaluate.call(this, node.body, scope, {
        label: node.label.name
      })
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      return r.value
    }
    // 逻辑运算符
    case 'LogicalExpression': {
      const gl = evaluate.call(this, node.left, scope)
      let r = gl.next()
      while (!r.done) r = gl.next(yield r.value)
      const left = r.value

      const g = evaluate.call(this, node.right, scope)
      r = g.next()
      while (!r.done) r = g.next(yield r.value)
      const right = r.value

      switch (node.operator) {
        case '&&': return left && right
        case '||': return left || right
        case '??': return left ?? right
        default: return
      }
    }
    // 二元运算符
    case 'BinaryExpression': {

      const gl = evaluate.call(this, node.left, scope)
      let r = gl.next()
      while (!r.done) r = gl.next(yield r.value)
      const left = r.value

      const g = evaluate.call(this, node.right, scope)
      r = g.next()
      while (!r.done) r = g.next(yield r.value)
      const right = r.value

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
    // 一元运算符
    // enum UnaryOperator {"-" | "+" | "!" | "~" | "typeof" | "void" | "delete"}
    case 'UnaryExpression': {
      let g = evaluate.call(this, node.argument, scope, { setObjPropVal: node.operator === 'delete' })
      let r
      try {
        r = g.next()
        while (!r.done) r = g.next(yield r.value)
      } catch (error) {
        if (node.operator === 'typeof') return 'undefined'
        else throw error
      }
      const argument = r.value
      switch (node.operator) {
        case '-': return -argument
        case '+': return +argument
        case '!': return !argument
        case '~': return ~argument
        case 'typeof': return typeof argument
        case 'void': return void argument
        case 'delete': {
          let [o, p] = argument
          return delete o[p]
        }
      }
    }
    // ++ 和 --
    case 'UpdateExpression': {
      const g = evaluate.call(this, node.argument, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      let preValue = r.value

      if (node.argument.type === 'MemberExpression') {
        const g = evaluate.call(this, node.argument, scope, { setObjPropVal: true })
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        let [obj, objPropName] = r.value

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
      const g = evaluate.call(this, node.test, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      const test = r.value

      const gr = test ? evaluate.call(this, node.consequent, scope) : evaluate.call(this, node.alternate, scope)

      r = gr.next()
      while (!r.done) r = gr.next(yield r.value)
      return r.value
    //对象
    case 'ObjectExpression': {
      let props = node.properties
      const obj = {}
      for (p of props) {
        // 属性值

        const g = evaluate.call(this, p.value, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        let val = r.value

        // 属性名
        let pName
        if (p.computed) {
          const g = evaluate.call(this, p.key.name, scope)
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
          pName = r.value
        } else {
          pName = p.key.name
        }

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

      };
      return obj
    }
    // 对象属性表达式
    case 'MemberExpression': {
      // 是否设置属性内部值
      let isSetObjPropVal = config?.setObjPropVal
      // 对象
      let obj = node.object.name ? scope.get(node.object.name) : evaluate.call(this, node.object, scope).next().value
      // 属性名
      let pname
      if (node.computed) {
        const g = evaluate.call(this, node.property, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        pname = r.value
      } else {
        pname = node.property.name
      }
      let propValue = obj[pname]
      if (propValue instanceof BlockInterruption) propValue = propValue.value
      return isSetObjPropVal ? [obj, pname] : propValue
    }
    // 数组
    case 'ArrayExpression': {
      const array = []
      for (const element of node.elements) {
        const g = evaluate.call(this, element, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        array.push(r.value)
      }
      return array
    }
    // 调用执行函数
    case 'CallExpression': {
      // 找到函数
      const g = evaluate.call(this, node.callee, scope, { setObjPropVal: true })
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      let callee = r.value

      let ret
      // 传参列表
      const args = []
      for (const arg of node.arguments) {
        const g = evaluate.call(this, arg, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        args.push(r.value)
      }
      if (callee instanceof Array) {
        let [o, p] = callee;
        let f = o[p]
        if (!(f instanceof Function)) {
          let functionName = srcCode.substring(node.callee.start, node.callee.end)
          throw new TypeError(`${functionName}is not a function`)
        }
        ret = f.apply(o, args)
      } else {
        if (!callee instanceof Function) {
          let functionName = srcCode.substring(node.callee.start, node.callee.end)
          throw new TypeError(`${functionName}is not a function`)
        }
        ret = callee.apply(this, args)
      }

      return ret instanceof BlockInterruption ? ret.value : ret
    }
    // 普通函数
    case 'FunctionExpression': {
      let fun
      if (!node.async && !node.generator) {
        // 普通函数
        fun = function (...args) {
          const funScope = new Scope({}, scope, 'function')
          node.params.forEach((param, i) => {
            funScope.declare('let', param.name, args[i])
          })
          const g = evaluate.call(this, node.body, funScope);
          let ret = g.next().value
          if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
          return undefined
        }
      } else if (!node.async && node.generator) {
        // generator函数
        fun = function* (...args) {
          const funScope = new Scope({}, scope, 'function')
          node.params.forEach((param, i) => {
            funScope.declare('let', param.name, args[i])
          })
          const g = evaluate.call(this, node.body, funScope);
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
          let ret = g.next().value
          if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
          return undefined
        }
      } else if (node.async && !node.generator) {
        // async函数
        fun = function (...args) {
          return new Promise(function (resolve, reject) {
            const nodeScope = new Scope({}, scope, 'function')
            node.params.forEach((param, i) => {
              nodeScope.declare('let', param.name, args[i])
            })
            try {
              const g = evaluate.call(this, node.body, nodeScope);
              const handler = (res) => {
                let r = g.next(res)
                if (r.done) {
                  let ret = r.value
                  if (ret instanceof BlockInterruption && ret.getType() === 'return')
                    resolve(ret.value)
                  else
                    resolve(ret)
                } else {
                  r.value.then(handler)
                }
              }
              handler()
            } catch (err) {
              reject(err)
            }
          })
        }
      } else if (node.async && node.generator) {
        throw new Error('开摆')
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
      let fun
      if (!node.async) {
        fun = (...args) => {
          const funScope = new Scope({}, scope, 'function')
          node.params.forEach((param, i) => {
            funScope.declare('let', param.name, args[i])
          })
          const g = evaluate.call(this, node.body, funScope);
          let ret = g.next().value
          if (node.async) return new Promise(ret)
          if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret.value
          return ret
        }
      } else {
        // async箭头函数 
        fun = (...args) => {
          return new Promise(function (resolve, reject) {
            const nodeScope = new Scope({}, scope, 'function')
            node.params.forEach((param, i) => {
              nodeScope.declare('let', param.name, args[i])
            })
            try {
              const g = evaluate.call(this, node.body, nodeScope);
              const handler = (res) => {
                let r = g.next(res)
                if (r.done) {
                  let ret = r.value
                  if (ret instanceof BlockInterruption && ret.getType() === 'return')
                    resolve(ret.value)
                  else
                    resolve(ret)
                } else {
                  r.value.then(handler)
                }
              }
              handler()
            } catch (err) {
              reject(err)
            }
          })
        }
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
        const g = evaluate.call(this, node.block, tryScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value
      } catch (err) {
        const catchScope = new Scope({}, scope, 'block')
        catchScope.declare('let', node.handler.param.name, err)
        const g = evaluate.call(this, node.handler.body, catchScope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        ret = r.value || ret
      } finally {
        if (node.finalizer !== null) {
          const g = evaluate.call(this, node.finalizer, new Scope({}, scope, 'block'))
          let r = g.next()
          while (!r.done) r = g.next(yield r.value)
          ret = r.value
        }
      }
      return ret
    }
    // throw
    case 'ThrowStatement': {
      const g = evaluate.call(this, node.argument, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      throw r.value
    }
    case 'EmptyStatement': return
    case 'SequenceExpression': {
      const arr = []
      for (const expression of node.expressions) {
        const g = evaluate.call(this, expression, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        arr.push(r.value)
      }
      return arr[arr.length - 1]
    }
    // return
    case 'ReturnStatement': {
      // console.log(node)
      const g = evaluate.call(this, node.argument, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      return new BlockInterruption('return', r.value)
    }
    // new 关键字
    case 'NewExpression': {
      const g = evaluate.call(this, node.callee, scope)
      let r = g.next()
      while (!r.done) r = g.next(yield r.value)
      const callee = r.value

      if (callee.prototype === undefined) {
        throw new TypeError(`${srcCode.substring(node.callee.start, node.callee.end)} is not a constructor`)
      }
      const args = []
      for (const arg of node.arguments) {
        const g = evaluate.call(this, arg, scope)
        let r = g.next()
        while (!r.done) r = g.next(yield r.value)
        args.push(r.value)
      }
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
      const ret = evaluate.call(this, node.argument, scope).next().value
      return yield ret instanceof Promise ? ret : Promise.resolve(ret)
    }
    case 'YieldExpression': {
      const g = evaluate.call(this, node.argument, scope)
      let ret = g.next().value
      return yield ret
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
  const g = evaluate(node, scope)
  g.next()
  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}