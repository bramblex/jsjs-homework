const acorn = require('acorn');

class Scope {
  constructor(type, parent) {
    this.variables = {}
    this.isDefine = {}
    this.type = type   // function | block
    this.parent = parent
  }
  declare(kind, name) {   // var | const | let
    if (kind === 'const') kind = '-const'
    switch (this.type) {
      case 'function':
        this.isDefine[name] = kind
        break;
      case 'block':
        if (kind === 'var') { // 在块级作用域中var，得交给上一级作用域
          this.parent.declare(kind, name)
        } else {
          this.isDefine[name] = kind
        }
        break;
    }
  }
  get(name) {
    if (this.isDefine[name]) {
      return this.variables[name]
    } else {
      if (this.parent === null) {
        console.log(name, 'get');
        throw new Error('error:not declare')
      } else {
        return this.parent.get(name)
      }
    }
  }
  set(name, value) {
    if (this.isDefine[name]) {
      if (this.isDefine[name] === '-const') {
        this.isDefine[name] = 'const'
        this.variables[name] = value
      } else
        if (this.isDefine[name] === 'const') {
          return new TypeError('Assignment to constant variable')
        } else {
          this.variables[name] = value
        }
    } else {
      if (this.parent === null) {
        throw new Error('error:not declare ' + name)
      } else {
        this.parent.set(name, value)
      }
    }

    // let root = this
    // while (root && root.isDefine[name] === undefined) root = root.parent
    // if (root) {
    //   if (root.isDefine[name] === 'const') {
    //     return new TypeError('Assignment to constant variable')
    //   }
    //   root.variables[name] = value
    // }
  }
}

function evaluate(node, scope) {
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      if (node.name === 'result') {
      }
      if (node.name === 'err') 
        console.log(node);
      return scope.get(node.name)
    case 'BinaryExpression':
      switch (node.operator) {
        case '+':
          return evaluate(node.left, scope) + evaluate(node.right, scope)
        case '-':
          return evaluate(node.left, scope) - evaluate(node.right, scope)
        case '*':
          return evaluate(node.left, scope) * evaluate(node.right, scope)
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
        let argsEnv = new Scope('function', scope)
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
      const child = new Scope('block', scope)
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
      while (evaluate(node.test, scope)) {
        result = evaluate(node.body, scope)
      }
      return
    }
    case 'Program': {
      const programScope = new Scope('function', null)
      let result = node.body.map((obj) => {
        return evaluate(obj, programScope)
      })
      return result[result.length - 1]
    }
    case 'VariableDeclaration':
      return node.declarations.forEach(dec => {
        scope.declare(node.kind, dec.id.name)
        scope.set(dec.id.name, evaluate(dec.init, scope))
      })
    case 'ExpressionStatement':
      return evaluate(node.expression, scope)
    case 'ArrayExpression':
      return node.elements
    case 'ReturnStatement':
      return evaluate(node.argument, scope)
    case 'ForStatement': {
      const childScope = new Scope('block', scope)
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
      let childScope = new Scope('block', scope), result
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
      return function (...args) {
        let argsEnv = new Scope('function', scope)
        node.params.map((obj, index) => {
          argsEnv.variables[obj.name] = args[index]
          argsEnv.isDefine[obj.name] = 'let'
        })
        return evaluate(node.body, argsEnv)
      }
    }
    case 'TryStatement': {
      let result = evaluate(node.block, scope)
      if (result instanceof Error) {
        let childScope = new Scope('block', scope)
        childScope.isDefine[node.handler.param.name] = 'let'
        childScope.variables[node.handler.param.name] = result.message
        result = evaluate(node.handler, childScope)
      }
      if (node.finalizer) {
        evaluate(node.finalizer, scope)
      }
      return result
    }
    case 'ThrowStatement':{
      return new Error(evaluate(node.argument, scope))
    }
    case 'CatchClause':{
      let childScope = new Scope('block', scope)
      let result = evaluate(node.body, childScope)
      return result
    }
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