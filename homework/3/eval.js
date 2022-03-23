const acorn = require('acorn');

class Scope {
  constructor(type, parent) {
    this.variables = {}; // name: value
    this.kinds = {}; // name: 'var' | 'let' | 'const'
    this.type = type; // 'function' | 'block' | 'global'
    this.parent = parent;
  }
  declare(kind, name, value) {
    this.variables[name] = value;
    this.kinds[name] = kind;
    return undefined;
  }
  get(name) {
    if (name in this.variables) {
      return this.variables[name];
    } else if (this.parent) {
      return this.parent.get(name);
    } else {
      throw new ReferenceError(`${name} is not defined`);
    }
  }
  set(name, value) {
    try {
      this.get(name); // 已声明，在对应作用域赋值
      if (name in this.variables) {
        if (this.kinds[name] === 'const') { // const不允许赋值
          // TODO: 是这样操作吗qwq
          throw new TypeError('Assignment to constant variable');
        } else {
          return this.variables[name] = value;
        }
      } else if (this.parent) {
        return this.parent.set(name, value);
      }
    } catch(err) { // 未声明，在当前作用域声明并赋值
      if (err instanceof ReferenceError) {
        this.variables[name] = value;
        this.kinds[name] = 'var';
      } else {
        throw err;
      }
    }
  }
}

function evaluate(node, env) {
  switch (node.type) {
    // TODO: 补全作业代码
    // 变量声明相关
    case 'VariableDeclaration':
      node.declarations.forEach(decl => {
        env.declare(node.kind, decl.id.name, decl.init ? evaluate(decl.init, env) : undefined);
      });
      return undefined;
    // 控制流相关
    case 'IfStatement':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case 'ForStatement':
      let forEnv = new Scope('block', env);
      if (node.init) {
        evaluate(node.init, forEnv);
      }
      let forResult = undefined;
      while (evaluate(node.test, forEnv)) {
        forResult = evaluate(node.body, forEnv);
        evaluate(node.update, forEnv);
      }
      return forResult;
    case 'WhileStatement':
      let whileEnv = new Scope('block', env), whileResult = undefined;
      while (evaluate(node.test, whileEnv)) {
        whileResult = evaluate(node.body, whileEnv);
      }
      return whileResult;
    // TODO: try-catch好像不太对qwq
    case 'TryStatement':
      try {
        return evaluate(node.block, env);
      } catch(err) {
        let catchEnv = new Scope('block', env);
        catchEnv.declare('let', node.handler.param.name, err);
        return evaluate(node.handler.body, catchEnv);
      } finally {
        evaluate(node.finalizer, env);
      }
    case 'ThrowStatement':
      throw evaluate(node.argument, env);
    
    // 不知道咋分类qwq
    // body每个部分都跑一遍但只返回最后一个值
    case 'Program':
      return node.body.reduce((_, expression) => 
        evaluate(expression, env), undefined);
    case 'BlockStatement':
      return node.body.reduce((_, expression) => 
        evaluate(expression, env), undefined);
    case 'ExpressionStatement':
      return evaluate(node.expression, env);
    case 'ReturnStatement':
      return evaluate(node.argument, env);
    // 表达式求值相关
    // 作为叶子节点的字面量和变量直接返回它们的值
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env.get(node.name);
    // 数组，对象
    case 'ArrayExpression':
      return node.elements.map(e => evaluate(e, env));
    case 'ObjectExpression':
      return node.properties.reduce((obj, prop) => ({
        ...obj,
        [prop.key.name]: evaluate(prop.value, env),
      }), {});
    // 一些运算相关的表达式((懒得枚举运算符所以直接用eval了嘤~
    case 'BinaryExpression':
      return eval(evaluate(node.left, env) + node.operator + evaluate(node.right, env));
    case 'UnaryExpression':
      return eval(node.operator + evaluate(node.argument, env));
    // 这里有个短路
    case 'LogicalExpression':
      return node.operator === '&&' ?
        evaluate(node.left, env) && evaluate(node.right, env) :
        evaluate(node.left, env) || evaluate(node.right, env);
    case 'ConditionalExpression':
      return evaluate(node.test, env) ?
        evaluate(node.consequent, env) :
        evaluate(node.alternate, env);
    // TODO: QAQ
    case 'MemberExpression':
      return evaluate(node.object, env)[node.computed ? evaluate(node.property, env) : node.property.name];
    // TODO: 仅完成argument为Identifier的情况，对象成员访问会炸掉qwq
    case 'UpdateExpression': 
      let value = evaluate(node.argument, env);
      return env.set(node.argument.name, node.operator === '++' ? value + 1 : value - 1);
    case 'AssignmentExpression':
      switch (node.operator) {
        case '=':
          return env.set(node.left.name || evaluate, evaluate(node.right, env));
        case '+=':
          return env.set(node.left.name, evaluate(node.left, env) + evaluate(node.right, env));
        case '-=':
          return env.set(node.left.name, evaluate(node.left, env) - evaluate(node.right, env));
        case '*=':
          return env.set(node.left.name, evaluate(node.left, env) * evaluate(node.right, env));
        case '/=':
          return env.set(node.left.name, evaluate(node.left, env) / evaluate(node.right, env));
        case '%=':
          return env.set(node.left.name, evaluate(node.left, env) % evaluate(node.right, env));
        case '<<=':
          return env.set(node.left.name, evaluate(node.left, env) << evaluate(node.right, env));
        case '>>=':
          return env.set(node.left.name, evaluate(node.left, env) >> evaluate(node.right, env));
        case '>>>=':
          return env.set(node.left.name, evaluate(node.left, env) >>> evaluate(node.right, env));
        case '&=':
          return env.set(node.left.name, evaluate(node.left, env) & evaluate(node.right, env));
        case '^=':
          return env.set(node.left.name, evaluate(node.left, env) ^ evaluate(node.right, env));
        case '|=':
          return env.set(node.left.name, evaluate(node.left, env) | evaluate(node.right, env));
      }
    // 逗号都要算一遍，只返回最后一个值
    case 'SequenceExpression':
      return node.expressions.reduce((_, expression) => 
        evaluate(expression, env), undefined);
    // 函数及作用域相关
    case 'FunctionExpression':
      return function (...args) {
        let newEnv = new Scope('function', env);
        node.params.forEach((param, index) => newEnv.set(param.name, args[index]));
        return evaluate(node.body, newEnv);
      };
    case 'ArrowFunctionExpression':
      return function (...args) {
        let newEnv = new Scope('function', env);
        node.params.forEach((param, index) => newEnv.set(param.name, args[index]));
        return evaluate(node.body, newEnv);
      };
    case 'CallExpression':
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = new Scope('global')) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

customerEval(`
(() => {
  const obj = {
    runTry: false,
    runError: false,
    runFinally: false,
    errorMsg: null,
  }
  try {
    obj.runTry = true
    throw 'wow'
  } catch (err) {
    obj.errorMsg = err
    obj.runError = true
    return obj
  } finally {
    obj.runFinally = true
  }
})()
`);

module.exports = customerEval