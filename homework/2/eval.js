const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    // 字面量
    case 'Literal':
      // TODO: 补全作业代码
      return node.value;
    // 数组字面量
    case 'ArrayExpression':
      return node.elements.map(element => evaluate(element, env));
    // 对象字面量
    case 'ObjectExpression':
      const obj = {};
      // property.kind must be 'init' (not 'get' or 'set')
      for (const property of node.properties) {
        obj[property.key.name] = evaluate(property.value, env);
      }
      return obj;
    // 变量
    case 'Identifier':
      return env[node.name];
    // this, @todo
    case 'ThisExpression':
      return undefined;
    // 一元运算表达式
    case 'UnaryExpression':
      switch (node.operator) {
        case '+': return +evaluate(node.argument, env); // 取正
        case '-': return -evaluate(node.argument, env); // 取负
        case '!': return !evaluate(node.argument, env); // 逻辑取反
        case '~': return ~evaluate(node.argument, env); // 位反
        case 'typeof': return typeof (evaluate(node.argument, env)); // typeof
        case 'void': return void (evaluate(node.argument, env)); // @todo(not sure)
        // delete, delete.argumnet must be a MemberExpression node
        case 'delete': // @todo(not sure)
          return delete evaluate(node.argument.object, env)[node.argument.property.name];
      }
    // ++、--, argument must be an 'Identifier' node
    case 'UpdateExpression':
      if (node.prefix && node.operator === '++') { // 前缀++
        return ++env[node.argument.name];
      } else if (node.prefix && node.operator === '--') { // 前缀--
        return --env[node.argument.name];
      } else if (!node.prefix && node.operator === '++') { // 后缀++
        return env[node.argument.name]++;
      } else if (!node.prefix && node.operator === '--') { // 后缀--
        return env[node.argument.name]--;
      }
    // 二元运算表达式
    case 'BinaryExpression':
      switch (node.operator) {
        // 数值运算
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '%': return evaluate(node.left, env) % evaluate(node.right, env);
        // 位运算
        case '|': return evaluate(node.left, env) | evaluate(node.right, env);
        case '&': return evaluate(node.left, env) & evaluate(node.right, env);
        case '^': return evaluate(node.left, env) ^ evaluate(node.right, env);
        // 移位运算
        case '>>': return evaluate(node.left, env) >> evaluate(node.right, env);
        case '<<': return evaluate(node.left, env) << evaluate(node.right, env);
        case '>>>': return evaluate(node.left, env) >>> evaluate(node.right, env);
        // 关系运算
        case '==': return evaluate(node.left, env) == evaluate(node.right, env);
        case '!=': return evaluate(node.left, env) != evaluate(node.right, env);
        case '===': return evaluate(node.left, env) === evaluate(node.right, env);
        case '!==': return evaluate(node.left, env) !== evaluate(node.right, env);
        case '>': return evaluate(node.left, env) > evaluate(node.right, env);
        case '<': return evaluate(node.left, env) < evaluate(node.right, env);
        case '>=': return evaluate(node.left, env) >= evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
        case 'in': return evaluate(node.left, env) in evaluate(node.right, env); // in
        case 'instanceof': return evaluate(node.left, env) instanceof evaluate(node.right, env); // instanceof
      }
    // 赋值运算, lvalue must be an 'Identifier' node
    case 'AssignmentExpression':
      switch (node.operator) {
        case '=': return env[node.left.name] = evaluate(node.right, env);
        case '+=': return env[node.left.name] += evaluate(node.right, env);
        case '-=': return env[node.left.name] -= evaluate(node.right, env);
        case '*=': return env[node.left.name] *= evaluate(node.right, env);
        case '/=': return env[node.left.name] /= evaluate(node.right, env);
        case '%=': return env[node.left.name] %= evaluate(node.right, env);
        case '|=': return env[node.left.name] |= evaluate(node.right, env);
        case '&=': return env[node.left.name] &= evaluate(node.right, env);
        case '^=': return env[node.left.name] ^= evaluate(node.right, env);
        case '<<=': return env[node.left.name] <<= evaluate(node.right, env);
        case '>>=': return env[node.left.name] >>= evaluate(node.right, env);
        case '>>>=': return env[node.left.name] >>>= evaluate(node.right, env);
      }
    // 逻辑运算
    case 'LogicalExpression':
      switch (node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env);
        case '||': return evaluate(node.left, env) || evaluate(node.right, env);
      }
    // 取成员值
    case 'MemberExpression': return evaluate(node.object)[evaluate(node.property, env)];
    // 三元运算符
    case 'ConditionalExpression':
      return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
    case 'CallExpression':
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    // 逗号表达式
    case 'SequenceExpression':
      let last;
      for (const expression of node.expressions) {
        last = evaluate(expression, env);
      }
      return last;
    // 函数表达式 @todo
    case 'FunctionExpression': return undefined;
    // 箭头函数
    case 'ArrowFunctionExpression':
      if (node.body.type === 'BlockStatement') { // 函数体为代码块 @todo
        return undefined;
      } else { // 函数体为返回值
        return function (...args) {
          // 函数的局部变量
          const funcEnv = {};
          for (let i = 0; i < node.params.length; i++) {
            funcEnv[node.params[i].name] = args[i];
          }
          // 记录没有同名内部变量的外部变量名
          const envMinusFuncEnv = Object.keys(env).filter(varname => funcEnv[varname] === undefined);
          // 新建的函数内的执行环境
          let newEnv = { ...env, ...funcEnv };
          let retVal = evaluate(node.body, newEnv);
          // 函数内对外部变量的修改反映到原环境中
          envMinusFuncEnv.forEach(varname => { env[varname] = newEnv[varname] })
          return retVal;
        }
      }
    // 表达式语句`
    case 'ExpressionStatement':
      return evaluate(node.expression, env);
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval