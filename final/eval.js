const acorn = require('acorn');
const Scope = require('./scope')

function* evaluate(node, scope) {
  if (!node) return node
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      if (node.name === 'undefined') return undefined
      if (node.name === 'null') return null
      if (node.name === 'JSON') return JSON
      if (node.name === 'console') return console
      if (node.name === 'Promise') return Promise
      return scope.get(node.name)
    case 'BinaryExpression': {
      let g = evaluate(node.left, scope)
      let rg = g.next()
      while (!rg.done) {
        yield rg.value
        rg = g.next()
      }
      let left = rg.value

      g = evaluate(node.right, scope)
      rg = g.next()
      while (!rg.done) {
        yield rg.value
        rg = g.next()
      }
      let right = rg.value

      switch (node.operator) {
        case '+':
          return left + right
        case '-':
          return left - right
        case '*':
          return left * right
        case '**':
          return left ** right
        case '/':
          return left / right
        case '<=':
          return left <= right
        case '>=':
          return left >= right
        case '>':
          return left > right
        case '<':
          return left < right
        case '%':
          return left % right
        case '|':
          return left | right
        case '&':
          return left & right
        case '>>':
          return left >> right
        case '<<':
          return left << right
        case '>>>':
          return left >>> right
        case '===':
          return left === right
        default:
          console.log(node, 'default');
      }
    }
    case 'LogicalExpression': {
      let g = evaluate(node.left, scope)
      let rg = g.next()
      while (!rg.done) {
        yield rg.value
        rg = g.next()
      }
      let left = rg.value

      g = evaluate(node.right, scope)
      rg = g.next()
      while (!rg.done) {
        yield rg.value
        rg = g.next()
      }
      let right = rg.value

      if (node.operator === '&&') {
        return left && right
      } else
        if (node.operator === '||') {
          return left || right
        }
    }
    case 'ConditionalExpression': {
      let g = evaluate(node.test, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next() }
      let test = rg.value

      g = evaluate(node.consequent, scope)
      rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next() }
      let consequent = rg.value

      g = evaluate(node.alternate, scope)
      rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next() }
      let alternate = rg.value

      if (test) {
        return consequent
      } else {
        return alternate
      }
    }
    case 'ObjectExpression': {
      let res = {}
      for (let obj of node.properties) {
        let g = evaluate(obj.value, scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let value = rg.value

        res[obj.key.name] = value
        if (obj.value.type === 'FunctionExpression') {
          Object.defineProperty(res[obj.key.name], 'name', { value: obj.key.name })
          if (obj.kind === 'get') {
            Object.defineProperty(res, obj.key.name, {
              get: function () {
                return value.apply(res)
              }
            })
          }
          if (obj.kind === 'set') {
            Object.defineProperty(res, obj.key.name, {
              set: function (v) {
                return value.call(res, v)
              }
            })
          }

        }
      }
      return res
    }
    case 'NewExpression': {
      if (node.callee.name === 'Error') {
        let g = evaluate(node.argument, scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let argument = rg.value

        return new Error(argument)
      }
      let res = {}
      let childScope = new Scope({ this: res }, scope, 'function')

      g = evaluate(node.callee, childScope)
      rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next() }
      let callee = rg.value
      let func = callee

      // 处理参数
      let args = []
      for (let arg of node.arguments) {
        g = evaluate(arg, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let ev = rg.value
        args.push(ev)
      }

      return new (func.bind.apply(func, [null].concat(...args)))
    }
    case 'ArrayExpression': {
      let result = []
      for (let obj of node.elements) {
        let g = evaluate(obj, scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let element = rg.value

        result.push(element)
      }
      return result
    }
    case 'CallExpression': {
      let g = evaluate(node.callee, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let callee = rg.value

      let args = []
      for (let arg of node.arguments) {
        g = evaluate(arg, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let ev = rg.value
        args.push(ev)
      }
      return callee(...args)
    }
    case 'ArrowFunctionExpression': {
      let argsEnv = new Scope({}, scope, 'function')
      let g = evaluate(node.body, argsEnv)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let body = rg.value


      // 箭头函数表达式返回的是一个函数
      return function (...args) {
        // 箭头函数的this取决于当前的作用域
        argsEnv.variables['this'] = scope.get('this')
        argsEnv.isDefine['this'] = 'let'
        node.params.map((arg, index) => {
          argsEnv.variables[arg.name] = args[index]
        })
        let result = body
        // 如果没有块则直接返回计算结果
        if (node.body.type !== 'BlockStatement') return result
        return body.value
      }
    }
    case 'SequenceExpression': {
      let SequenceResult
      for (let [index, exp] of node.expressions.entries()) {
        let g = evaluate(exp, scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let seq = rg.value

        if (index === node.expressions.length - 1) {
          SequenceResult = seq
        }
      }
      return SequenceResult
    }
    case 'IfStatement': {
      let g = evaluate(node.test, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let test = rg.value

      if (test) {
        g = evaluate(node.consequent, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let consequent = rg.value

        return consequent
      } else {
        if (!node.alternate) return {}

        g = evaluate(node.alternate, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let alternate = rg.value

        return alternate
      }
    }
    case 'BlockStatement': {
      const child = new Scope({}, scope, 'block')
      let result

      for (let i = 0; i < node.body.length; i++) {
        let stat = node.body[i]
        let g = evaluate(stat, child)
        let rg
        while (1) {
          rg = g.next()
          if (rg.done) break
          yield rg.value
        }
        result = rg.value
        if (!result) continue
        if (result.type === 'continue' || result.type === 'return' || result.type === 'break') break
        else continue
      }
      if (!result) return {}
      return result
    }
    case 'AssignmentExpression': {
      let letfName = node.left.name
      let leftPro
      // 获取等式左边的东西，需要特判处理是变量还是对象
      if (node.left.type === 'MemberExpression') {
        if (node.left.object.type === 'ThisExpression') letfName = scope.get('this')
        else
          // 
          if (node.left.object.type === 'MemberExpression') {
            let g = evaluate(node.left.object, scope)
            let rg = g.next()
            while (!rg.done) { yield rg.value; rg = g.next(); }
            let ev = rg.value

            letfName = ev
          } else letfName = scope.get(node.left.object.name)
        // 获取属性
        leftPro = node.left.property.name
      }
      let g = evaluate(node.right, scope)
      let rightValue, rg
      while (1) {
        rg = g.next()
        if (rg.done) break
        yield
      }
      rightValue = rg.value

      if (scope.find(letfName) === 'notDefined') {
        scope.declare('var', letfName)
      }
      if (node.left.type === 'Identifier') {
        switch (node.operator) {
          case '=':
            scope.set(letfName, rightValue)
            return rightValue
          case '+=':
            scope.set(letfName, scope.get(letfName) + rightValue)
            return scope.get(letfName)
          case '-=':
            scope.set(letfName, scope.get(letfName) - rightValue)
            return scope.get(letfName)
          case '*=':
            scope.set(letfName, scope.get(letfName) * rightValue)
            return scope.get(letfName)
          case '/=':
            scope.set(letfName, scope.get(letfName) / rightValue)
            return scope.get(node.left.name)
          case '%=':
            scope.set(letfName, scope.get(letfName) % rightValue)
            return scope.get(node.left.name)
        }
      } else
        if (node.left.type === 'MemberExpression') {
          switch (node.operator) {
            case '=':
              letfName[leftPro] = rightValue
              return letfName[leftPro]
          }
        }
    }
    case 'ThisExpression': {
      return scope.get('this')
    }
    case 'WhileStatement': {
      let result
      let childScope = new Scope({}, scope, 'block')

      let g = evaluate(node.test, childScope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let test = rg.value

      while (test) {
        let g = evaluate(node.body, scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let body = rg.value

        result = body
        if (['data', 'break', 'return'].includes(result.type)) {
          if (result.labelName === node.label || result.labelName === null)
            return result
        }
        if ('continue' === result.type) {
          if (result.labelName === node.label || result.labelName === null) {
            result = {}
          }
          else return result
        }

        g = evaluate(node.test, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        test = rg.value
      }
      return result
    }
    case 'DoWhileStatement': {
      let result
      let childScope = new Scope({}, scope, 'block')

      let g, rg, test

      do {
        let gg = evaluate(node.body, childScope)
        let rgg = gg.next()
        while (!rgg.done) { yield rgg.value; rgg = gg.next(); }
        let body = rgg.value

        result = body
        if (['data', 'break', 'return'].includes(result.type)) {
          if (result.labelName === node.label || result.labelName === null)
            return result
        }
        if ('continue' === result.type) {
          if (result.labelName === node.label || result.labelName === null) { }
          else return result
        }

        g = evaluate(node.test, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        test = rg.value

      } while (test)
      return result
    }
    case 'LabeledStatement': {
      node.body.label = node.label.name

      let g = evaluate(node.body, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let body = rg.value

      return body
    }
    case 'Program': {
      hoisting(node, scope)
      let result
      for (let obj of node.body) {
        let g = evaluate(obj, scope)
        let rg
        while (1) {
          rg = g.next()
          if (rg.done) break
          yield
        }
        result = rg.value
      }
      return result
    }
    case 'FunctionDeclaration': {
      return
    }
    case 'VariableDeclaration': {
      let res
      for (let v of node.declarations) {
        res = scope.declare(node.kind, v.id.name)
        if (res === true) {
          if (v.init) {
            let g = evaluate(v.init, scope)
            let rg = g.next()
            while (!rg.done) {
              yield rg.value
              rg = g.next()
            }
            scope.set(v.id.name, rg.value)
          }
          else scope.set(v.id.name, undefined)
        }
        else console.log('context');
      }
      return {
        type: 'execute',
        value: ''
      }
    }
    case 'ExpressionStatement': {
      let g = evaluate(node.expression, scope)
      let rg
      while (1) {
        rg = g.next()
        if (rg.done) return rg.value
        yield rg.value
      }
      return {}
    }
    case 'ReturnStatement': {
      let g = evaluate(node.argument, scope)
      let rg = g.next()
      while (!rg.done) {
        yield rg.value
        rg = g.next()
      }
      return {
        type: 'return',
        value: (rg.value instanceof Object && rg.value.type) ? rg.value.value : rg.value
      }
    }
    case 'ForStatement': {
      const childScope = new Scope({}, scope, 'block')
      let result

      let g = evaluate(node.init, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let init = rg.value
      result = init

      while (1) {
        g = evaluate(node.test, childScope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        test = rg.value
        if (node.test && !test) break
        g = evaluate(node.body, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let body = rg.value

        result = body
        if (result.type === 'data') {
          return result
        }
        if (result.type === 'break') {
          if (result.labelName === node.label || !result.labelName) {
            result = {}
            break
          } else return result
        }
        if (result.type === 'continue') {
          if (result.labelName === node.label || !result.labelName) {
            result = {}
          }
          else return result
        }

        g = evaluate(node.update, childScope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
      }
      return result
    }
    case 'UpdateExpression': {
      if (node.argument.type === 'Identifier') {
        switch (node.operator) {
          case '++':
            if (node.prefix) {
              scope.set(node.argument.name, scope.get(node.argument.name) + 1)
              return scope.get(node.argument.name)
            } else {
              scope.set(node.argument.name, scope.get(node.argument.name) + 1)
              return scope.get(node.argument.name) - 1
            }
          case '--':
            if (node.prefix) {
              scope.set(node.argument.name, scope.get(node.argument.name) - 1)
              return scope.get(node.argument.name)
            } else {
              scope.set(node.argument.name, scope.get(node.argument.name) - 1)
              return scope.get(node.argument.name) + 1
            }
        }
      } else if (node.argument.type === 'MemberExpression') {
        let objName = node.argument.object.name
        objName = scope.get(objName)
        let objPro = node.argument.property.name
        switch (node.operator) {
          case '++': {
            if (node.prefix) return ++objName[objPro]
            else return objName[objPro]++
          }
        }
      }
    }
    case 'SwitchStatement': {
      let hasCompare = 0
      let childScope = new Scope({}, scope, 'block'), result

      let g = evaluate(node.discriminant, childScope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let key = rg.value

      for (let obj of node.cases) {
        g = evaluate(obj.test, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let test = rg.value

        g = evaluate(obj, childScope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        let ev = rg.value

        if ((obj.test && test === key) || hasCompare) {
          hasCompare = 1
          result = ev
          if (['continue', 'break', 'return', 'data'].includes(result.type)) break
        }
        if (!obj.test) {
          result = ev
          if (['continue', 'break', 'return', 'data'].includes(result.type)) break
        }
      }
      return result
    }
    case 'SwitchCase': {
      let result
      for (let i = 0; i < node.consequent.length; i++) {

        let g = evaluate(node.consequent[i], scope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let consequent = rg.value

        result = consequent
        if (['continue', 'break', 'return'].includes(result.type)) return result
      }
      return result
    }
    case 'ContinueStatement':
      return {
        type: 'continue',
        value: '',
        labelName: node.label ? node.label.name : null
      }
    case 'BreakStatement': {
      return {
        type: 'break',
        value: '',
        labelName: node.label ? node.label.name : null
      }
    }
    case 'MemberExpression': {
      let g = evaluate(node.object, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let ev = rg.value

      let result = ev
      let pro = node.property.name

      //判断是否需要计算，例如a[i]，i是取值还是取其名

      if (node.computed) {
        g = evaluate(node.property, scope)
        rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next() }
        ev = rg.value

        pro = ev
      }
      if (typeof result[pro] === 'function') {
        return result[pro].bind(result)
      } else return result[pro]
    }
    case 'FunctionExpression': {
      let f = function (...args) {
        let argsEnv = new Scope({}, scope, 'function')
        hoisting(node, argsEnv)
        // 谁调用了函数f，this会得到改变，这里再去获取this的值
        argsEnv.variables['this'] = this
        argsEnv.isDefine['this'] = 'let'
        node.params.map((obj, index) => {
          argsEnv.variables[obj.name] = args[index]
          argsEnv.isDefine[obj.name] = 'let'
        })

        let g = evaluate(node.body, argsEnv)
        let rg = g.next()
        while (!rg.done) { rg = g.next(); }
        let body = rg.value

        return body.value
      }
      if (node.id)
        Object.defineProperty(f, 'name', { value: node.id.name })
      Object.defineProperty(f, 'length', { value: node.params.length })
      return f
    }
    case 'TryStatement': {
      let childScope = new Scope({}, scope, 'block')

      let g = evaluate(node.block, childScope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let block = rg.value

      let result = block


      childScope = new Scope({}, scope, 'block')
      if (result instanceof Error) {
        childScope.isDefine[node.handler.param.name] = 'let'
        childScope.variables[node.handler.param.name] = result.message

        let g = evaluate(node.handler, childScope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let handler = rg.value

        result = handler
      }
      childScope = new Scope({}, scope, 'block')
      if (node.finalizer) {

        let g = evaluate(node.finalizer, childScope)
        let rg = g.next()
        while (!rg.done) { yield rg.value; rg = g.next(); }
        let finalizer = rg.value

        result = finalizer
      }
      return result
    }
    case 'ThrowStatement': {
      let g = evaluate(node.argument, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let result = rg.value

      if (result instanceof Error) return result

      g = evaluate(node.argument, scope)
      rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next() }
      let argument = rg.value

      return new Error(argument)
    }
    case 'CatchClause': {
      let childScope = new Scope({}, scope, 'block')

      let g = evaluate(node.body, childScope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let body = rg.value

      let result = body
      return result
    }
    case 'MetaProperty': {
      let g = evaluate(node.meta, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let meta = rg.value

      let obj = meta
      return obj[node.property.name]
    }
    case 'UnaryExpression': {
      // 特判一下，避免之后找不到变量而抛出异常
      if (node.operator === 'typeof' && scope.find(node.argument.name) === 'notDefined' && node.argument.name) {
        return 'undefined'
      }

      let g = evaluate(node.argument, scope)
      let rg = g.next()
      while (!rg.done) { yield rg.value; rg = g.next(); }
      let argument = rg.value

      switch (node.operator) {
        case 'typeof': {
          if (node.argument.type === 'Literal') {
            return typeof argument
          }
          return typeof argument
        }
        case 'void': {
          return void argument
        }
        case 'delete': {
          if (node.argument.type === 'MemberExpression') {
            let obj = scope.get(node.argument.object.name)
            let pro = node.argument.property.name
            return delete obj[pro]
          } else {
            delete node.argument.name
            return true
          }
        }
        case '!': {
          return !argument
        }
        case '+': return +argument
        case '-': return -argument
        case '~': return ~argument
      }
    }
    case 'YieldExpression': {
      let g = evaluate(node.argument, scope)
      let rg
      while (1) {
        rg = g.next()
        if (rg.done) break
        yield rg.value
      }
      return yield rg.value
    }
    case 'AwaitExpression': {
      let g = evaluate(node.argument, scope)
      let rg = g.next()
      while (!rg.done) {
        rg = g.next()
      }
      if (rg.value instanceof Promise) {
        rg.value.then((data) => {
          return data
        })
      }
      return rg.value
    }
    default: {
      console.log('can not exe:' + node.type);
    }
  }



  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent, 'block');

  const node = acorn.parse(code, {
    ecmaVersion: 2017
  })
  let g = evaluate(node, scope);
  let rg
  while (1) {
    rg = g.next()
    if (rg.done) break
  }
  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope
}


// 变量提升
function hoisting(node, scope) {
  switch (node.type) {
    case 'Program': {
      node.body.forEach(v => {
        hoisting(v, scope)
      })
      return
    }
    case 'FunctionExpression': {
      node.body.body.forEach(v => {
        hoisting(v, scope)
      })
      return
    }
    case 'VariableDeclaration': {
      node.declarations.forEach(v => {
        if (node.kind === 'var')
          scope.declare(node.kind, v.id.name)
      })
      return
    }
    case 'FunctionDeclaration': {
      let childScope = new Scope({}, scope, 'function')
      node.body.body.forEach(v => {
        hoisting(v, childScope)
      })
      if (node.generator) {
        function* gf(...args) {
          childScope.variables['this'] = this
          childScope.isDefine['this'] = 'let'
          childScope.variables['new'] = {
            target: new.target
          }
          childScope.isDefine['new'] = 'let'
          node.params.map((v, index) => {
            childScope.variables[v.name] = args[index]
            childScope.isDefine[v.name] = 'let'
          })
          let g = evaluate(node.body, childScope)
          let rg
          while (1) {
            rg = g.next()
            if (rg.done) break
            yield rg.value
          }
          return rg.value.value
        }
        scope.declare('var', node.id.name)
        scope.set(node.id.name, gf)
        return gf
      }

      if (node.async) {
        let f = function () {
          // 第一步，先做出一个generator
          let func = function* (...args) {
            childScope.variables['this'] = this
            childScope.isDefine['this'] = 'let'
            childScope.variables['new'] = {
              target: new.target
            }
            childScope.isDefine['new'] = 'let'
            node.params.map((v, index) => {
              childScope.variables[v.name] = args[index]
              childScope.isDefine[v.name] = 'let'
            })

            let g = evaluate(node.body, childScope)
            let rg = g.next()
            while (!rg.done) { yield rg.value; rg = g.next(); }
            let body = rg.value

            return body.value
          }

          // 第二步，不断的跑那个generator
          let next = (g) => {
            let rg = g.next()
            if (rg.done) return Promise.resolve(rg.value)
            return next(g).then(r => {
              return r
            })
          }
          return new Promise((resolve) => {
            let g = func()
            resolve(next(g))
          })
        }
        scope.declare('var', node.id.name)
        scope.set(node.id.name, f)
        return f
      }

      let f = function (...args) {
        // 普通函数 每次重新获取this，实现函数的this动态等于其调用者
        childScope.variables['this'] = this
        childScope.isDefine['this'] = 'let'
        childScope.variables['new'] = {
          target: new.target
        }
        childScope.isDefine['new'] = 'let'
        node.params.map((v, index) => {
          childScope.variables[v.name] = args[index]
          childScope.isDefine[v.name] = 'let'
        })

        let g = evaluate(node.body, childScope)
        let rg = g.next()
        //普通函数不需要再继续向上打断
        while (!rg.done) { rg = g.next(); }
        let body = rg.value

        return body.value
      }
      Object.defineProperty(f, 'name', { value: node.id.name })
      Object.defineProperty(f, 'length', { value: node.params.length })
      scope.declare('var', node.id.name)
      scope.set(node.id.name, f)
      return f
    }
    case 'ForStatement': {
      node.body.body.forEach(v => {
        hoisting(v, scope)
      })
    }
    case 'WhileStatement': {
      node.body.body.forEach(v => {
        hoisting(v, scope)
      })
    }
  }
}