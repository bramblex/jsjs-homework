const acorn = require('acorn');
const Scope = require('./scope')

function evaluate(node, scope) {
  if (!node) return node
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      if (node.name === 'undefined') return undefined
      if (node.name === 'null') return null
      if (node.name === 'JSON') return JSON
      if (node.name === 'console') return console
      return scope.get(node.name)
    case 'BinaryExpression':
      switch (node.operator) {
        case '+':
          return evaluate(node.left, scope) + evaluate(node.right, scope)
        case '-':
          return evaluate(node.left, scope) - evaluate(node.right, scope)
        case '*':
          return evaluate(node.left, scope) * evaluate(node.right, scope)
        case '**':
          return evaluate(node.left, scope) ** evaluate(node.right, scope)
        case '/':
          return evaluate(node.left, scope) / evaluate(node.right, scope)
        case '<=':
          return evaluate(node.left, scope) <= evaluate(node.right, scope)
        case '>=':
          return evaluate(node.left, scope) >= evaluate(node.right, scope)
        case '>':
          return evaluate(node.left, scope) > evaluate(node.right, scope)
        case '<':
          return evaluate(node.left, scope) < evaluate(node.right, scope)
        case '%':
          return evaluate(node.left, scope) % evaluate(node.right, scope)
        case '|':
          return evaluate(node.left, scope) | evaluate(node.right, scope)
        case '&':
          return evaluate(node.left, scope) & evaluate(node.right, scope)
        case '>>':
          return evaluate(node.left, scope) >> evaluate(node.right, scope)
        case '<<':
          return evaluate(node.left, scope) << evaluate(node.right, scope)
        case '>>>':
          return evaluate(node.left, scope) >>> evaluate(node.right, scope)
        case '===':
          return evaluate(node.left, scope) === evaluate(node.right, scope)
        default:
          console.log(node, 'default');
      }
    case 'LogicalExpression':
      if (node.operator === '&&') {
        return evaluate(node.left, scope) && evaluate(node.right, scope)
      } else
        if (node.operator === '||') {
          return evaluate(node.left, scope) || evaluate(node.right, scope)
        }
    case 'ConditionalExpression':
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope)
      } else {
        return evaluate(node.alternate, scope)
      }
    case 'ObjectExpression':
      let res = {}
      node.properties.map((obj) => {
        res[obj.key.name] = evaluate(obj.value, scope)
        if (obj.value.type === 'FunctionExpression') {
          Object.defineProperty(res[obj.key.name], 'name', { value: obj.key.name })
          if (obj.kind === 'get') {
            Object.defineProperty(res, obj.key.name, {
              get: function () {
                return evaluate(obj.value, scope).apply(res)
              }
            })
          }
          if (obj.kind === 'set') {
            Object.defineProperty(res, obj.key.name, {
              set: function (value) {
                return evaluate(obj.value, scope).call(res, value)
              }
            })
          }

        }
      })
      return res
    case 'NewExpression': {
      if (node.callee.name === 'Error') {
        return new Error(evaluate(node.argument, scope))
      }
      let res = {}
      let childScope = new Scope({ this: res }, scope, 'function')
      let func = evaluate(node.callee, childScope)
      return new (func.bind.apply(func, [null].concat(node.arguments.map(v => (evaluate(v, scope))))))
    }
    case 'ArrayExpression':
      let result = []
      node.elements.map((obj) => {
        result.push(evaluate(obj, scope))
      })
      return result
    case 'CallExpression':
      return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)))
    case 'ArrowFunctionExpression':
      // 箭头函数表达式返回的是一个函数
      let argsEnv = new Scope({}, scope, 'function')
      return function (...args) {
        argsEnv.variables['this'] = scope.get('this')
        argsEnv.isDefine['this'] = 'let'
        node.params.map((arg, index) => {
          argsEnv.variables[arg.name] = args[index]
        })
        let result = evaluate(node.body, argsEnv)
        if (node.body.type !== 'BlockStatement') return result
        return evaluate(node.body, argsEnv).value
      }
    case 'SequenceExpression':
      let SequenceResult
      node.expressions.map((exp, index) => {
        if (index === node.expressions.length - 1) {
          SequenceResult = evaluate(exp, scope)
          return
        }
        evaluate(exp, scope)
      })
      return SequenceResult
    case 'IfStatement':
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope)
      } else {
        if (!node.alternate) return {}
        return evaluate(node.alternate, scope)
      }
    case 'BlockStatement': {
      const child = new Scope({}, scope, 'block')
      let result = {}
      node.body.every((stat) => {
        result = evaluate(stat, child)
        if (!result) return true
        if (result.type === 'continue' || result.type === 'data' || result.type === 'break') return false
        else return true
      })
      return result
    }
    case 'AssignmentExpression':
      let letfName = node.left.name
      let leftPro
      if (node.left.type === 'MemberExpression') {
        if (node.left.object.type === 'ThisExpression') letfName = scope.get('this')
        else if (node.left.object.type === 'MemberExpression') {
          letfName = evaluate(node.left.object, scope)
        } else letfName = scope.get(node.left.object.name)
        leftPro = node.left.property.name
      }
      let rightValue = evaluate(node.right, scope)

      if (scope.find(letfName) === 'notDefined') {
        scope.declare('var', letfName)
      }
      if (node.left.type === 'Identifier') {
        switch (node.operator) {
          case '=':
            scope.set(letfName, rightValue)
            return rightValue
          // return scope.set(letfName, rightValue)
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
    case 'ThisExpression': {
      return scope.get('this')
    }
    case 'WhileStatement': {
      let result
      let childScope = new Scope({}, scope, 'block')
      while (evaluate(node.test, scope)) {
        result = evaluate(node.body, childScope)
        if (['data', 'break'].includes(result.type)) {
          if (result.labelName === node.label || result.labelName === null)
            return result
        }
        if ('continue' === result.type) {
          if (result.labelName === node.label || result.labelName === null) {
            result = {}
            continue
          }
          else return result
        }
      }
      return result
    }
    case 'DoWhileStatement': {
      let result
      let childScope = new Scope({}, scope, 'block')
      do {
        result = evaluate(node.body, childScope)
        if (['data', 'break'].includes(result.type)) {
          if (result.labelName === node.label || result.labelName === null)
            return result
        }
        if ('continue' === result.type) {
          if (result.labelName === node.label || result.labelName === null)
            continue
          else return result
        }
      } while (evaluate(node.test, scope))
      return result
    }
    case 'LabeledStatement': {
      node.body.label = node.label.name
      return evaluate(node.body, scope)
    }
    case 'Program': {
      hoisting(node, scope)
      let result = node.body.map((obj) => {
        return evaluate(obj, scope)
      })
      return result[result.length - 1]
    }
    case 'FunctionDeclaration': {
      return
      let f = function (...args) {
        let childScope = new Scope({}, scope, 'function')
        hoisting(node, childScope)
        node.params.map((v, index) => {
          childScope.variables[v.name] = args[index]
          childScope.isDefine[v.name] = 'let'
        })
        return evaluate(node.body, childScope)
      }
      Object.defineProperty(f, 'name', { value: node.id.name })
      Object.defineProperty(f, 'length', { value: node.params.length })
      scope.declare('var', node.id.name)
      scope.set(node.id.name, f)
      return f
    }
    case 'VariableDeclaration': {
      let res
      node.declarations.forEach(v => {
        res = scope.declare(node.kind, v.id.name)
        if (res === true) {
          if (v.init) scope.set(v.id.name, evaluate(v.init, scope))
          else scope.set(v.id.name, undefined)
        }
        else console.log('context');
      })
      return {
        type: 'execute',
        value: ''
      }
    }
    case 'ExpressionStatement':
      return evaluate(node.expression, scope)
    case 'ReturnStatement':
      return {
        type: 'data',
        value: evaluate(node.argument, scope)
      }
    case 'ForStatement': {
      const childScope = new Scope({}, scope, 'block')
      let result
      result = evaluate(node.init, childScope)
      while (evaluate(node.test, childScope) || !node.test) {
        result = evaluate(node.body, childScope)
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
        evaluate(node.update, childScope)
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
      let key = evaluate(node.discriminant, childScope)

      node.cases.every((obj) => {
        if ((obj.test && evaluate(obj.test, childScope) === key) || hasCompare) {
          hasCompare = 1
          result = evaluate(obj, childScope)
          if (['continue', 'break', 'return', 'data'].includes(result.type)) return false
        }
        if (!obj.test) {
          result = evaluate(obj, childScope)
          if (['continue', 'break', 'return', 'data'].includes(result.type)) return false
        }
        return true
      })

      // node.cases.forEach((obj) => {
      //   if ((obj.test && evaluate(obj.test, childScope) === key)) {
      //     hasCompare = 1
      //     result = evaluate(obj, childScope)
      //     if (['continue', 'break', 'return'].includes(result.type)) return result
      //   }
      //   if (hasCompare === 0 && !obj.test) {
      //     result = evaluate(obj, childScope)
      //   }
      // })
      return result
    }
    case 'SwitchCase': {
      let result
      for (let i = 0; i < node.consequent.length; i++) {
        result = evaluate(node.consequent[i], scope)
        if (['continue', 'break', 'return'].includes(result.type)) return result
        // if (result === 'continue') break
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
      let result = evaluate(node.object, scope)
      let pro = node.property.name
      if (node.computed) pro = evaluate(node.property, scope)
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
        return evaluate(node.body, argsEnv).value
      }
      if (node.id)
        Object.defineProperty(f, 'name', { value: node.id.name })
      Object.defineProperty(f, 'length', { value: node.params.length })
      return f
    }
    case 'TryStatement': {
      let childScope = new Scope({}, scope, 'block')
      let result = evaluate(node.block, childScope)
      childScope = new Scope({}, scope, 'block')
      if (result instanceof Error) {
        childScope.isDefine[node.handler.param.name] = 'let'
        childScope.variables[node.handler.param.name] = result.message
        result = evaluate(node.handler, childScope)
      }
      childScope = new Scope({}, scope, 'block')
      if (node.finalizer) {
        result = evaluate(node.finalizer, childScope)
      }
      return result
    }
    case 'ThrowStatement': {
      let result = evaluate(node.argument, scope)
      if (result instanceof Error) return result
      return new Error(evaluate(node.argument, scope))
    }
    case 'CatchClause': {
      let childScope = new Scope({}, scope, 'block')
      let result = evaluate(node.body, childScope)
      return result
    }
    case 'MetaProperty': {
      let obj = evaluate(node.meta, scope)
      return obj[node.property.name]
    }
    case 'UnaryExpression': {
      switch (node.operator) {
        case 'typeof': {
          if (node.argument.type === 'Literal') {
            return typeof evaluate(node.argument, scope)
          }
          if (scope.find(node.argument.name) === 'notDefined') return 'undefined'
          return typeof evaluate(node.argument, scope)
        }
        case 'void': {
          return void evaluate(node.argument, scope)
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
          return !evaluate(node.argument, scope)
        }
        case '+': return +evaluate(node.argument, scope)
        case '-': return -evaluate(node.argument, scope)
        case '~': return ~evaluate(node.argument, scope)
      }
    }
    case 'YieldExpression': {
      
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
    ecmaVersion: 6
  })
  evaluate(node, scope);
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
          return evaluate(node.body, childScope).value
        }
        scope.declare('var', node.id.name)
        scope.set(node.id.name, gf)
        return gf
      }
      let f = function (...args) {
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
        return evaluate(node.body, childScope).value
      }
      // f.prototype = {}
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