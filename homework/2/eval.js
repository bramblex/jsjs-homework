const acorn = require('acorn');

// 查找某变量所在的父级环境
function findEnv(name, env) {
  return env[name] ? env : env.fa && findEnv(name, env.fa);
}

function evaluate(node, env) {
  switch (node.type) {
    // TODO: 补全作业代码
    // 作为叶子节点的字面量和变量直接返回它们的值
    case 'Literal':
      return node.value;
    case 'Identifier':
      return findEnv(node.name, env)[node.name];
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
    // mark,赋值相关的好像不能在环境里直接取变量的值？比如`a = 5, a++, a++`
    // 大概是要先去父级作用域查询，查询不到时再在本作用域新建这个变量？
    case 'UpdateExpression': 
      let value = evaluate(node.argument, env);
      if (node.prefix) {
        return node.operator === '++' ? ++value : --value;
      } else {
        return node.operator === '++' ? value++ : value--;
      }
    case 'AssignmentExpression':
      let protoEnv = findEnv(node.left.name, env);
      return protoEnv ? protoEnv[node.left.name] = evaluate(node.right, env) : env[node.left.name] = evaluate(node.right, env);
    // 逗号都要算一遍，只返回最后一个值
    case 'SequenceExpression':
      return node.expressions.reduce((_, expression) => 
        evaluate(expression, env), undefined);
    // 函数及作用域相关
    case 'FunctionExpression':
      return function (...args) {
        return evaluate(node.body, {
          fa: env,
          ...node.params.reduce((params, param, index) => ({...params, [param.name]: args[index]}), {}),
        });
      };
    case 'ArrowFunctionExpression':
      return function (...args) {
        return evaluate(node.body, {
          fa: env,
          ...node.params.reduce((params, param, index) => ({...params, [param.name]: args[index]}), {}),
        });
      }
    case 'CallExpression':
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  env.fa = null;
  return evaluate(node, env)
}

module.exports = customerEval

customerEval("(n => ((x => n = x)(n + 2), (y => n + y)(3)))(1)");