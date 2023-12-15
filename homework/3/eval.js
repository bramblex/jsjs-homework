const acorn = require('acorn');

// 处理常量
class SimpleValue {
  constructor (value, kind = '') {
    this.value = value
    this.kind = kind
  }

  set (value) {
    // 禁止重新对const类型变量赋值
    if (this.kind === 'const') {
      throw new TypeError('Assignment to constant variable')
    } else {
      this.value = value
    }
  }

  get () {
    return this.value
  }
}
const standardMap = {
  console: new SimpleValue(console)
}
class Scope {
  constructor (type, parentScope) {
    this.variables = {}

    // 作用域类型，区分函数作用域function和块级作用域block
    this.type = type // function/block//let/var/const
    // 父级作用域
    this.parentScope = parentScope
    // 全局作用域
    this.globalDeclaration = standardMap
    // 当前作用域的变量空间
    this.declaration = Object.create(null)
  }

  /*
   * get/set方法用于获取/设置当前作用域中对应name的变量值
     符合JS语法规则，优先从当前作用域去找，若找不到则到父级作用域去找，然后到全局作用域找。
     如果都没有，就报错
   */
  get (name) {
    if (this.declaration[name]) {
      console.log(this.declaration[name])
      return this.declaration[name]
    } else if (this.parentScope) {
      return this.parentScope.get(name)
    } else if (this.globalDeclaration[name]) {
      return this.globalDeclaration[name]
    }
    throw new ReferenceError(`${name} is not defined`)
  }

  set (name, value) {
    if (this.declaration[name]) {
      this.declaration[name] = value
    } else if (this.parentScope[name]) {
      this.parentScope.set(name, value)
    } else {
      throw new ReferenceError(`${name} is not defined`)
    }
  }

  /**
   * 根据变量的kind调用不同的变量定义方法
   */
  declare (name, value, kind) {
    if (kind === 'var') {
      return this.varDeclare(name, value)
    } else if (kind === 'let') {
      return this.letDeclare(name, value)
    } else if (kind === 'const') {
      return this.constDeclare(name, value)
    } else {
      throw new Error(`canjs: Invalid Variable Declaration Kind of "${kind}"`)
    }
  }

  varDeclare (name, value) {
    let scope = this
    // 若当前作用域存在非函数类型的父级作用域时，就把变量定义到父级作用域
    while (scope.parentScope && scope.type !== 'function') {
      scope = scope.parentScope
    }
    this.declaration[name] = new SimpleValue(value, 'var')
    return this.declaration[name]
  }

  letDeclare (name, value) {
    // 不允许重复定义
    if (this.declaration[name]) {
      throw new SyntaxError(`Identifier ${name} has already been declared`)
    }
    this.declaration[name] = new SimpleValue(value, 'let')
    return this.declaration[name]
  }

  constDeclare (name, value) {
    // 不允许重复定义
    if (this.declaration[name]) {
      throw new SyntaxError(`Identifier ${name} has already been declared`)
    }
    this.declaration[name] = new SimpleValue(value, 'const')
    return this.declaration[name]
  }
}

function evaluate(node, scope) {
  switch (node.type) {
    case 'Literal':
      // TODO: 补全作业代码
      return node.value
    case 'Identifier':
      return scope.get(node.name).value
    case 'ReturnStatement': {
      return evaluate(node.argument, scope)
    }
    case 'ExpressionStatement': {
      return evaluate(node.expression, scope)
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const argsScope = {}
        const params = node.params
        for (let i = 0; i < params.length; i++) {
          argsScope[params[i].name] = args[i]
        }
        return evaluate(node.body, {...scope, ...argsScope})
      }
    }
    case 'BinaryExpression': {
      if (node.operator === '+') {
        return evaluate(node.left, scope) + evaluate(node.right, scope)
      } else if (node.operator === '-') {
        return evaluate(node.left, scope) - evaluate(node.right, scope)
      } else if (node.operator === '*') {
        return evaluate(node.left, scope) * evaluate(node.right, scope)
      } else if (node.operator === '/') {
        return evaluate(node.left, scope) / evaluate(node.right, scope)
      } else if (node.operator === '==') {
        return evaluate(node.left, scope) == evaluate(node.right, scope)
      } else if (node.operator === '!=') {
        return evaluate(node.left, scope) != evaluate(node.right, scope)
      } else if (node.operator === '===') {
        return evaluate(node.left, scope) === evaluate(node.right, scope)
      } else if (node.operator === '!==') {
        return evaluate(node.left, scope) !== evaluate(node.right, scope)
      } else if (node.operator === '<') {
        return evaluate(node.left, scope) < evaluate(node.right, scope)
      } else if (node.operator === '<=') {
        return evaluate(node.left, scope) <= evaluate(node.right, scope)
      } else if (node.operator === '>') {
        return evaluate(node.left, scope) > evaluate(node.right, scope)
      } else if (node.operator === '>=') {
        return evaluate(node.left, scope) >= evaluate(node.right, scope)
      } else if (node.operator === '<<') {
        return evaluate(node.left, scope) << evaluate(node.right, scope)
      } else if (node.operator === '>>') {
        return evaluate(node.left, scope) >> evaluate(node.right, scope)
      } else if (node.operator === '>>>') {
        return evaluate(node.left, scope) >>> evaluate(node.right, scope)
      } else if (node.operator === '%') {
        return evaluate(node.left, scope) % evaluate(node.right, scope)
      } else if (node.operator === '|') {
        return evaluate(node.left, scope) | evaluate(node.right, scope)
      } else if (node.operator === '^') {
        return evaluate(node.left, scope) ^ evaluate(node.right, scope)
      } else if (node.operator === '&') {
        return evaluate(node.left, scope) & evaluate(node.right, scope)
      } else if (node.operator === 'in') {
        return evaluate(node.left, scope) in evaluate(node.right, scope)
      } else if (node.operator === 'instanceof') {
        return evaluate(node.left, scope) instanceof evaluate(node.right, scope)
      }
    }
    case 'CallExpression': {
      return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)))
    }
    case 'BlockStatement': {
      // 有花括号
      const child = new Scope('Block', scope)
      for (const state of node.body) {
        evaluate(state, child)
      }
    }
    case 'Declarations': {
      // 名字
      scope.declare(node.name)
      // init，初始化值set进scope里
      scope.set(node.name, evaluate(node.init, scope))
    }
    case 'VariableDeclaration': {
      // const child = new Scope(node.kind, scope)
      // child.declare()
      for (const val of node.declarations) {
       return scope.declare (val.id.name, evaluate(val.init, scope), node.kind)
      }

    }

    // 赋值的话直接set

    case 'IfStatement': {
      if (evaluate(node.test, scope)) {
        // 后稷
        return evaluate(node.consequent, scope)
      }
    }
    case 'WhileStatement': {
      while (node.test) {
        return evaluate(node.body, scope)
      }
    }

  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node.body[0], env)
}

const temp1 = '(() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })()'
const temp11 = (() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })()
const temp2 = '(()=> {let a = 0; let b = 3; return 1})()'
const test = customerEval(temp1)
console.log(test)
// console.log(temp11)
module.exports = customerEval
