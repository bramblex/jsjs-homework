const acorn = require('acorn');

class Scope {
  constructor(type, parent) {
    this.variables = {}; // name: value
    this.kinds = {}; // name: 'var' | 'let' | 'const'
    this.type = type; // 'function' | 'block'
    this.parent = parent;
  }
  declare(kind, name) {
    this.variables[name] = undefined;
    this.kinds[name] = kind;
    return undefined;
  }
  get(name) {
    if (this.variables[name]) {
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
      if (this.variables[name]) {
        if (this.kinds[name] == 'const') { // const不允许赋值
          throw new TypeError('Assignment to constant variable');
        } else {
          return this.variables[name] = value;
        }
      } else if (this.parent) {
        return this.parent.set(name, value);
      }
    } catch(err) { // 未声明，在当前作用域声明并赋值
      this.variables[name] = value;
      this.kinds[name] = 'var';
    }
  }
}

function evaluate(node, env) {
  switch (node.type) {
    // TODO: 补全作业代码
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
    // 取对象成员
    case 'MemberExpression':
      return evaluate(node.object, env)[node.computed ? evaluate(node.property, env) : node.property.name];
    // TODO: 自增作用域问题
      case 'UpdateExpression': 
      let value = evaluate(node.argument, env);
      if (node.prefix) {
        return node.operator === '++' ? ++value : --value;
      } else {
        return node.operator === '++' ? value++ : value--;
      }
    case 'AssignmentExpression':
      return env.set(node.left.name, evaluate(node.right, env));
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

module.exports = customerEval