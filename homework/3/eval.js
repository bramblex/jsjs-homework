const acorn = require('acorn');
const Scope = require('./scope')
function evaluate(node, scope) {
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
    // case 'FunctionDeclaration': {
    //   scope.declare
    // }
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
      const childScope = new Scope("Block", scope)
      let ret
      for (const expression of node.body) {
        ret = evaluate(expression, childScope)
      }
      if (ret && ret.kind === 'return') return ret.value;
      if (ret && ret.kind === 'break') return ret;
      if (ret && ret.kind === 'continue') return;
      return ret
    }
    case 'VariableDeclaration': {
      return node.declarations.forEach(v => scope.declare(node.kind, v.id.name, evaluate(v.init, scope)))
    }
    case 'IfStatement': {
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope)
    }
    case 'WhileStatement': {
      while (evaluate(node.test, scope)) {
        evaluate(node.body, scope)
      }
      return
    }
    case 'ForStatement': {
      let ret
      const forScope = new Scope('block', scope)
      for (evaluate(node.init, forScope); evaluate(node.test, forScope); evaluate(node.update, forScope)) {
        ret = evaluate(node.body, forScope)
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
          Array
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
          obj[p.key.name] = evaluate(p.value)
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
      return evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)));
    }
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const childScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          childScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, childScope);
      }
    }

    case 'EmptyStatement': return
    case 'ReturnStatement': {
      return { kind: 'return', value: evaluate(node.argument, scope) }
    }

  }
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = new Scope('block')) {
  const node = acorn.parse(code, {
    ecmaVersion: 2020
  })
  return evaluate(node, env)
}

module.exports = customerEval