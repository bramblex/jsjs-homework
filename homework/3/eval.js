const acorn = require('acorn');
const Scope = require('./scope')
const BlockInterruption = require('./interrupt')
/**
 * 
 * @param {Node} node AST节点
 * @param {Scope} scope 当前作用域 Scope
 * @param {JSON} config 配置项（label）
 * @author: 钟雅乐
 * @date : 2022-2-2 
 * @returns node为js表达式时返回运算结果
 */
function evaluate(node, scope, config) {
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
      let rightValue = evaluate(node.right, scope)
      if (node.left.type === 'Identifier') {
        // 直接给变量赋值
        let leftValue = evaluate(node.left, scope)
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
        return scope.get(node.left.name)
      } else if (node.left.type === 'MemberExpression') {
        // 给对象的内部属性赋值
        let [leftObj, leftPropName] = evaluate(node.left, scope, { setObjPropVal: true })
        let leftValue = leftObj[leftPropName]
        switch (node.operator) {
          case '=': leftObj[leftPropName] = rightValue; break;
          case '+=': leftObj[leftPropName] = leftValue + rightValue; break;
          case '-=': leftObj[leftPropName] = leftValue - rightValue; break;
          case '/=': leftObj[leftPropName] = leftValue / rightValue; break;
          case '*=': leftObj[leftPropName] = leftValue * rightValue; break;
          case '%=': leftObj[leftPropName] = leftValue % rightValue; break;
          case '<<=': leftObj[leftPropName] = leftValue << rightValue; break;
          case '>>=': leftObj[leftPropName] = leftValue >> rightValue; break;
          case '>>>=': leftObj[leftPropName] = leftValue >>> rightValue; break;
          case '|=': leftObj[leftPropName] = leftValue | rightValue; break;
          case '^=': leftObj[leftPropName] = leftValue ^ rightValue; break;
          case '&=': leftObj[leftPropName] = leftValue & rightValue; break;
        }
        return leftObj[leftPropName];
      }
    }
    case 'BlockStatement': {
      let ret
      for (const expression of node.body) {
        ret = evaluate(expression, scope)
        if (ret instanceof BlockInterruption) return ret;
      }
      return ret
    }
    case 'FunctionDeclaration': {
      // 命名函数
      return scope.declare('var', node.id.name, function (...args) {
        const nodeScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          nodeScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, nodeScope);
      })
    }
    // 变量声明
    case 'VariableDeclaration': {
      return node.declarations.forEach(v => {
        if (v.init && v.init.type === 'FunctionExpression' && v.init.id === null) {
          // 未给普通函数声明又未将之赋给变量
          throw new SyntaxError('Function statements require a function name')
        }
        return scope.declare(node.kind, v.id.name, evaluate(v.init, scope))
      })
    }
    // If
    case 'IfStatement': {
      return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope)
    }
    // Switch
    case 'SwitchStatement': {
      let ret
      node.cases.forEach(c => {
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
      let label = config ? config.label : undefined
      const whileScope = new Scope('block', scope)
      while (evaluate(node.test, whileScope)) {
        const whileInnerScope = new Scope('block', whileScope)
        ret = evaluate(node.body, whileInnerScope)
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
      let label = config ? config.label : undefined
      // 包括定义索引等的定义域
      const forScope = new Scope('block', scope)
      for (evaluate(node.init, forScope); evaluate(node.test, forScope); evaluate(node.update, forScope)) {
        // 每次循环内产生内作用域
        const forInnerScope = new Scope('block', forScope)
        // 运行while内代码
        ret = evaluate(node.body, forInnerScope)
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
      return evaluate(node.body, scope, {
        label: node.label.name
      })
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
    // ++ 和 --
    case 'UpdateExpression': {
      let preValue = evaluate(node.argument, scope)
      if (node.argument.type === 'MemberExpression') {
        let [obj, objPropName] = evaluate(node.argument, scope, { setObjPropVal: true })
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
      // 是否设置属性内部值
      let isSetObjPropVal = config?.setObjPropVal
      let obj = node.object.name ? scope.get(node.object.name) : evaluate(node.object, scope)
      let pname = node.computed ? evaluate(node.property, scope) : node.property.name
      return isSetObjPropVal ? [obj, pname] : obj[pname]
    }
    // 数组
    case 'ArrayExpression': {
      return node.elements.map(e => e.value) || []
    }
    // 调用执行函数
    case 'CallExpression': {
      let ret = evaluate(node.callee, scope)(...node.arguments.map(arg => evaluate(arg, scope)));
      return ret instanceof BlockInterruption ? ret.value : ret
    }
    // 普通函数
    case 'FunctionExpression': {
      return function (...args) {
        const funScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          funScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, funScope);
      }
    }
    // 箭头函数
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const funScope = new Scope('function', scope)
        node.params.forEach((param, i) => {
          funScope.declare('let', param.name, args[i])
        })
        return evaluate(node.body, funScope);
      }
    }
    // try
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
    // throw
    case 'ThrowStatement': {
      throw evaluate(node.argument, scope)
    }
    case 'EmptyStatement': return
    case 'SequenceExpression': {
      let arr = node.expressions.map(e => evaluate(e, scope))
      return arr[arr.length - 1]
    }
    // return
    case 'ReturnStatement': {
      return new BlockInterruption('return', evaluate(node.argument, scope))
    }

  }
  // console.log(node)
  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = new Scope('block')) {
  const node = acorn.parse(code, {
    ecmaVersion: 2020
  })
  return evaluate(node, env)
}

module.exports = customerEval