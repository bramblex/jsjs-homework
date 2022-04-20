const acorn = require('acorn');
const Scope = require('./scope')

function evaluate(node, scope) {
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      if (node.name === 'undefined') return undefined
      if (node.name === 'null') return null
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
        default:
          console.log(node,'default');
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
          Object.defineProperty(res[obj.key.name], 'name',{value: obj.key.name})
        }
      })
      return res
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
      return function (...args) {
        let argsEnv = new Scope({}, scope, 'function')
        node.params.map((arg, index) => {
          argsEnv.variables[arg.name] = args[index]
        })
        return evaluate(node.body, argsEnv)
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
        return evaluate(node.alternate, scope)
      }
    case 'BlockStatement': {
      const child = new Scope({}, scope, 'block')
      let result
      node.body.every((stat) => {
        result = evaluate(stat, child)
        if (result === 'continue') return false
        else return true
      })
      return result
    }
    case 'AssignmentExpression':
      let rightValue = evaluate(node.right, scope)
      let letfName = node.left.name

      if (node.left.type === 'Identifier') {
        switch (node.operator) {
          case '=':
            return scope.set(letfName, rightValue)
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
          letfName = scope.get(node.left.object.name)
          let leftPro = node.left.property.name
          switch (node.operator) {
            case '=':
              letfName[leftPro] = rightValue
              return letfName[leftPro]
          }
        }
    case 'WhileStatement': {
      let result
      let childScope = new Scope({}, scope, 'block')
      while (evaluate(node.test, scope)) {
        result = evaluate(node.body, childScope)
      }
      return result
    }
    case 'Program': {
      let result = node.body.map((obj) => {
        return evaluate(obj, scope)
      })
      return result[result.length - 1]
    }
    case 'FunctionDeclaration': {
      let f = function (...args) {
        let childScope = new Scope({}, scope, 'function')
        node.params.map((v,index) => {
          childScope.variables[v.name] = args[index]
          childScope.isDefine[v.name] = 'let'
        })
        return evaluate(node.body, childScope)
      }
      Object.defineProperty(f,'name',{
        value: node.id.name
      })
      Object.defineProperty(f,'length',{
        value: node.params.length
      })

      scope.declare('var', node.id.name)
      scope.set(node.id.name, f)
      return f
    }
    case 'VariableDeclaration':
      return node.declarations.forEach(v => {
        if (scope.declare(node.kind, v.id.name)) {
          if (v.init) scope.set(v.id.name, evaluate(v.init, scope))
                else  scope.set(v.id.name, undefined)
        }
        else console.log('context');
      })
    case 'ExpressionStatement':
      return evaluate(node.expression, scope)
    // case 'ArrayExpression':
    //   return node.elements
    case 'ReturnStatement':
      return evaluate(node.argument, scope)
    case 'ForStatement': {
      const childScope = new Scope({}, scope, 'block')
      let result
      result = evaluate(node.init, childScope)
      while (evaluate(node.test, childScope)) {
        result = evaluate(node.body, childScope)
        evaluate(node.update, childScope)
      }
      return result
    }
    case 'UpdateExpression': {
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
    }
    case 'SwitchStatement': {
      let childScope = new Scope({}, scope, 'block'), result
      let key = evaluate(node.discriminant, childScope)
      node.cases.forEach((obj) => {
        if (evaluate(obj.test, childScope) === key) {
          result = evaluate(obj, childScope)
        }
      })
      return result
    }
    case 'SwitchCase': {
      let result
      for (let i = 0; i < node.consequent.length; i++) {
        result = evaluate(node.consequent[i], scope)
        if (result === 'continue') break
      }
      return result
    }
    case 'ContinueStatement':
      return 'continue'
    case 'MemberExpression': {
      let result = evaluate(node.object, scope)
      return result[node.property.name].bind(result)
    }
    case 'FunctionExpression': {
      let f = function (...args) {
        let argsEnv = Scope({},scope, 'function')
        node.params.map((obj, index) => {
          argsEnv.variables[obj.name] = args[index]
          argsEnv.isDefine[obj.name] = 'let'
        })
        return evaluate(node.body, argsEnv)
      }
      if (node.id)
      Object.defineProperty(f,'name',{value:node.id.name})
      Object.defineProperty(f,'length',{value:node.params.length})
      return f
    }
    case 'TryStatement': {
      let result = evaluate(node.block, scope)
      if (result instanceof Error) {
        let childScope = new Scope({}, scope, 'block')
        childScope.isDefine[node.handler.param.name] = 'let'
        childScope.variables[node.handler.param.name] = result.message
        result = evaluate(node.handler, childScope)
      }
      if (node.finalizer) {
        evaluate(node.finalizer, scope)
      }
      return result
    }
    case 'ThrowStatement': {
      return new Error(evaluate(node.argument, scope))
    }
    case 'CatchClause': {
      let childScope = new Scope({}, scope, 'block')
      let result = evaluate(node.body, childScope)
      return result
    }
    case 'MetaProperty':{
      if (node.meta.name === 'new' && node.property.name==='target') {
        return undefined
      }
    }
  }



  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent);

  const node = acorn.parse(code, {
    ecmaVersion: 6
  })
  evaluate(node, scope);

  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}