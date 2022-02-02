const acorn = require('acorn');
const Scope = require('./scope')
const BlockInterruption = require('./interrupt')
function evaluate(node, scope) {
  if (!node) return
  switch (node.type) {
    case 'Program': {
      let arr = node.body.map(n => evaluate(n, scope))
      return arr.length ? arr[arr.length - 1] : undefined
    }
    case 'Literal':
      // TODO: 补全作业代码
      return node.value;
    case 'Identifier': {
      return scope.get(node.name);
    }
    case 'ExpressionStatement': {
      return evaluate(node.expression, scope)
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
      // 等式右边的取值
      let leftValue = evaluate(node.left, scope)
      let rightValue = evaluate(node.right, scope)
      // 为对象的属性值赋值 例如obj.a.b = value,暂未实现夹带[]和类似fn()[1]()[2]的语法
      if (node.left.type === 'MemberExpression') {
        let n = node.left
        let propList = []
        while (!n.object.name) {
          propList.push(n.property.name)
          n = n.object
        }
        propList.push(n.property.name)
        let obj = scope.get(n.object.name)
        while (propList.length > 1) {
          let pname = propList.pop()
          obj = obj[pname]
        }
        switch (node.operator) {
          case '=': obj[propList.pop()] = rightValue; break;
          case '+=': obj[propList.pop()] = leftValue + rightValue; break;
          case '-=': obj[propList.pop()] = leftValue - rightValue; break;
          case '/=': obj[propList.pop()] = leftValue / rightValue; break;
          case '*=': obj[propList.pop()] = leftValue * rightValue; break;
          case '%=': obj[propList.pop()] = leftValue % rightValue; break;
          case '<<=': obj[propList.pop()] = leftValue << rightValue; break;
          case '>>=': obj[propList.pop()] = leftValue >> rightValue; break;
          case '>>>=': obj[propList.pop()] = leftValue >>> rightValue; break;
          case '|=': obj[propList.pop()] = leftValue | rightValue; break;
          case '^=': obj[propList.pop()] = leftValue ^ rightValue; break;
          case '&=': obj[propList.pop()] = leftValue & rightValue; break;
        }

      } else if (node.left.type === 'Identifier') {
        switch (node.operator) {
          case '=': scope.set(node.left.name, rightValue); break;
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
      return rightValue
    }
    case 'BlockStatement': {
      // const childScope = new Scope('block', scope)
      let ret
      for (const expression of node.body) {
        // ret = evaluate(expression, childScope)
        ret = evaluate(expression, scope)
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret;
        if (ret instanceof BlockInterruption && ret.getType() === 'break') return ret;
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') return;
      }

      return ret
    }
    case 'FunctionDeclaration': {
      // 匿名函数
      // 命名函数
      return scope.declare('var', node.id.name, function (...args) {
        const nodeScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          nodeScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, nodeScope);
      })


    }
    case 'VariableDeclaration': {
      return node.declarations.forEach(v => {
        if (v.init && v.init.type === 'FunctionExpression' && v.init.id === null) {
          throw new SyntaxError('Function statements require a function name')
        }
        return scope.declare(node.kind, v.id.name, evaluate(v.init, scope))
      })
    }
    case 'IfStatement': {
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope)
    }
    case 'SwitchStatement': {
      let ret
      console.log(node)
      node.cases.forEach(c => {
        // console.log('c.test ---> ', c.test)
        // console.log('node.discriminant -- > ', node.discriminant)
        if (c.test !== null && !(evaluate(c.test, scope) === evaluate(node.discriminant, scope))) return ret
        c.consequent.forEach(e => {
          if (e.type === 'BlockStatement') {
            ret = evaluate(e, new Scope('block', scope))
          } else {
            ret = evaluate(e, scope)
          }
        })
      })
      return ret
    }
    case 'ContinueStatement': {
      return new BlockInterruption('continue');
    }
    case 'BreakStatement': {
      return new BlockInterruption('break')
    }
    case 'WhileStatement': {
      let ret
      const whileScope = new Scope('block', scope)
      while (evaluate(node.test, whileScope)) {
        const whileInnerScope = new Scope('block', whileScope)
        ret = evaluate(node.body, whileInnerScope)
        if (ret instanceof BlockInterruption && ret.getType() === 'continue') continue
        if (ret instanceof BlockInterruption && ret.getType() === 'break') return
        if (ret instanceof BlockInterruption && ret.getType() === 'return') return ret
      }
      return ret
    }
    case 'ForStatement': {
      let ret
      // 包括定义索引等的定义域
      const forScope = new Scope('block', scope)
      for (evaluate(node.init, forScope); evaluate(node.test, forScope); evaluate(node.update, forScope)) {
        // 每次循环内产生内作用域
        const forInnerScope = new Scope('block', forScope)
        ret = evaluate(node.body, forInnerScope)
      }
      return ret
    }
    // 逻辑运算符
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate(node.left, scope) && evaluate(node.right, scope)
        case '||': return evaluate(node.left, scope) || evaluate(node.right, scope)
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
      const left = evaluate(node.left, scope)
      const right = evaluate(node.right, scope)
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
      }
    }
    // enum UnaryOperator {"-" | "+" | "!" | "~" | "typeof" | "void" | "delete"}
    case 'UnaryExpression': {
      switch (node.operator) {
        case '-': return -evaluate(node.argument, scope)
        case '+': return +evaluate(node.argument, scope)
        case '!': return !evaluate(node.argument, scope)
        case '~': return ~evaluate(node.argument, scope)
        case 'typeof': return typeof evaluate(node.argument, scope)
      }
    }
    case 'UpdateExpression': {
      let value = evaluate(node.argument, scope)
      if (node.operator === '++') {
        scope.set(node.argument.name, value + 1)
        return node.prefix ? (value + 1) : value
      } else {
        scope.set(node.argument.name, value - 1)
        return node.prefix ? (value - 1) : value
      }

    }
    // 三目运算符
    case 'ConditionalExpression':
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope)
    //对象
    case 'ObjectExpression':
      {
        let props = node.properties
        const obj = {}
        props.forEach(p => {
          obj[p.key.name] = evaluate(p.value, scope)
        });
        return obj
      }
    case 'MemberExpression': {
      let obj = node.object.name ? scope.get(node.object.name) : evaluate(node.object, scope)
      let pname = node.property.name
      return obj[pname]
    }
    // 数组
    case 'ArrayExpression': {
      return node.elements.map(e => e.value) || []
    }
    case 'CallExpression': {
      // 调用 evaluate(node.callee, env) 来得到 callee 所表示的方法，然后使用 node.arguments 中的参数（解析过的）来调用该方法
      let ret = evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)));
      return ret instanceof BlockInterruption ? ret.value : ret
    }
    case 'FunctionExpression': {
      return function (...args) {
        const nodeScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          nodeScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, nodeScope);
      }
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const funScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          funScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, funScope);
      }
    }
    case 'TryStatement': {
      try {
        const tryScope = new Scope('block', scope)
        evaluate(node.block, tryScope)
      } catch (err) {
        const catchScope = new Scope('block', scope)
        catchScope.declare('let', node.handler.param.name, err)
        return evaluate(node.handler.body, catchScope)
      } finally {
        const finallyScope = new Scope('block', scope)
        evaluate(node.finalizer, finallyScope)
      }
    }
    case 'ThrowStatement': {
      throw evaluate(node.argument, scope)
    }
    case 'EmptyStatement': return
    case 'SequenceExpression': {
      let arr = node.expressions.map(e => evaluate(e, scope))
      return arr[arr.length - 1]
    }
    case 'ReturnStatement': {
      // return { kind: 'return', value: evaluate(node.argument, scope) }
      return new BlockInterruption('return', evaluate(node.argument, scope))
    }

  }
  console.log(node)
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = new Scope('block')) {
  const node = acorn.parse(code, {
    ecmaVersion: 2020
  })
  return evaluate(node, env)
}

module.exports = customerEval