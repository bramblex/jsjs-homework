const acorn = require("acorn");
const astring = require('astring');

function evaluate(node, env) {
  if (!Object.prototype.hasOwnProperty.call(env, "declarations")) {
    env["declarations"] = {};
  }
  if (!Object.prototype.hasOwnProperty.call(env, "hasVariableDeclaration")) {
    env["hasVariableDeclaration"] = false;
  }
  switch (node.type) {
    case "Identifier":{
      if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.name)){
        return env["declarations"][node.name]
      }
      return env[node.name];
    }
    case "Literal": {
      return node.value;
    }
    case "BinaryExpression": {
      // 二进制运算符的表达式
      switch (node.operator) {
        case "+":
          return evaluate(node.left, env) + evaluate(node.right, env);
        case "-":
          return evaluate(node.left, env) - evaluate(node.right, env);
        case "*":
          return evaluate(node.left, env) * evaluate(node.right, env);
        case "/":
          return evaluate(node.left, env) / evaluate(node.right, env);
        case "<=":
          return evaluate(node.left, env) <= evaluate(node.right, env);
        case "%":
          return evaluate(node.left, env) % evaluate(node.right, env);
        default:
          throw new Error(
            `Unsupported BinaryExpression operator: ${node.operator} at Location ${node.start}:${node.end}`
          );
      }
    }
    case "LogicalExpression": {
      // 逻辑表达式
      switch (node.operator) {
        case "||":
          return evaluate(node.left, env) || evaluate(node.right, env);
        case "&&":
          return evaluate(node.left, env) && evaluate(node.right, env);
      }
      return;
    }
    case "ConditionalExpression": {
      return evaluate(node.test, env)
        ? evaluate(node.consequent, env)
        : evaluate(node.alternate, env);
    }
    case "ObjectExpression": {
      let obj = {};
      node.properties.map(prop => {
        obj = {...obj, ...evaluate(prop, env)};
      });
      return obj;
    }
    case "Property": {
      let obj = {};
      if (node.key.type === "Identifier") {
        // 键的类型为 Identifier 时不应该去环境中找。而因该原样输出
        obj[node.key.name] = evaluate(node.value, env)
      }else if(node.key.type === "CallExpression") {
        // 键的类型为函数调用，则需要执行
        obj[evaluate(node.key, env)] = evaluate(node.value, env)
      }else if(node.key.type === "ArrowFunctionExpression" || node.key.type === "FunctionExpression") {
        // 箭头函数 或 函数表达式 都应该执行 Function.toString()
        let func = astring.generate(node.key, env);
        func = func.replace(/\r\n|\n/g, "");
        obj[func] = evaluate(node.value, env);
      }else if (node.key.type === "Literal"){
        // 键的类型为 Literal 时 应该取 raw
        obj[node.key.raw] = evaluate(node.value, env)
      }
      return obj;
    }
    case "ArrayExpression": {
      return [...node.elements.map(ele => evaluate(ele, env))];
    }
    case "CallExpression":{
      // 函数调用
      // 取出最外层函数所有参数
      let args = [...node.arguments.map(arg => evaluate(arg, env))];
      // node.callee 是最终生成的函数
      return evaluate(node.callee, env)(...args);
    }
    case "ArrowFunctionExpression": {
      return (...args) => {
        let paramsEnv = {};
        node.params.map(param => {
          paramsEnv[param.name] = args.shift();
        })
        let temp = evaluate(node.body, {...env, ...paramsEnv});
        if (node.body.type === "AssignmentExpression") {
          // body 为赋值表达式 箭头函数会默认返回操作符右边的数值，而该数值 可能(有关联的时候才会) 影响 env
          env[node.body.left.name] && (env[node.body.left.name] = temp);
        }
        return temp;
      }
    }
    case "FunctionExpression": {
      return (...args) => {
        let paramsEnv = {};
        node.params.map(param => {
          paramsEnv[param.name] = args.shift();
        })
        return evaluate(node.body, {...env, ...paramsEnv});
      }
    }
    case "BlockStatement": {
      let res;
      node.body.map(body => {
        if (body.type === "ReturnStatement") {
          res = evaluate(body, env); 
        }else{
          evaluate(body, env);
        }
      });
      return res;
    }
    case "ReturnStatement": {
      return evaluate(node.argument, env);
    }
    case "ExpressionStatement": {
      return evaluate(node.expression, env);
    }
    case "AssignmentExpression": {
      let temp = evaluate(node.right, env);
      switch (node.operator) {
        case "=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] = temp;
          }else {
            env[node.left.name] = temp;
          }
          break;
        case "+=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] += temp;
          }else {
            env[node.left.name] += temp;
          }
          break;
        case "-=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] -= temp;
          }else {
            env[node.left.name] -= temp;
          }
          break;
        case "*=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] *= temp;
          }else {
            env[node.left.name] *= temp;
          }
          break;
        case "/=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] /= temp;
          }else {
            env[node.left.name] /= temp;
          }
          break;
        case "%=":
          if (env["hasVariableDeclaration"] && !Object.prototype.hasOwnProperty.call(env, node.left.name)){
            env["declarations"][node.left.name] %= temp;
          }else {
            env[node.left.name] %= temp;
          }
          break;
      }
      // 赋值表达式返回右边结果
      return temp;
    }
    case "VariableDeclaration": {
      env["hasVariableDeclaration"] = true;
      node.declarations.map(declaration => {
        evaluate(declaration, env);
      });
      break;
    }
    case "VariableDeclarator": {
      env["declarations"][node.id.name] = null;
      if(node.init) {
        switch(node.init.type) {
          case "Identifier":
            env["declarations"][node.id.name] = env["declarations"][node.init.name];
            break;
          default:
            env["declarations"][node.id.name] = evaluate(node.init, env);
            break;
        }
      }
      break;
    }
    case "SequenceExpression": {
      let res = node.expressions.map(expression => {
        return evaluate(expression, env);
      })
      return res.pop();
    }
  }
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6,
  });
  return evaluate(node, env);
}


// let a = 1, b = 2, c = 3, d = 4;
// console.log(((a, b, c, d) => (d) => a + b + c + d)(a, b, c, d)(d));
// console.log(evals("((a, b, c, d) => (d) => a + b + c + d)(a, b, c, d)(d)", {a: 1, b: 2, c: 3, d: 4}));

// console.log(((a, b) => (c, d) => c = d)(1, 2)(3, 4));
// console.log(evals("((a, b) => (c, d) => c = d)(1, 2)(3, 4)"));

// 该测试用例无法通过
// console.log(({[((a, b) => b => b)(1)(2)]: "this is a",true: "this is a",[(() => [1, 2, 3, 4, 5, 6, 7])()]: "this is a",[(function(){return{1:2,3:4}})]: "this. is a"}));
// console.log(evals('({[((a, b) => b => b)(1)(2)]: "this is a",true: "this is a",[(() => [1, 2, 3, 4, 5, 6, 7])()]: "this is a",[(function(){return{1:2,3:4}})]: "this. is a"})'));

// console.log(({ [((a, b) => b => b)(1)(2)]: "this is a", true: "this is a", [() => [1, 2, 3, 4, 5, 6, 7]]: "this is a", [function(){ return {1: 2, 3: 4} }]: "this. is a", [(function(a, b){ a /= a / b; b %= b % a; return {1: a, 3: b} })(1, 2)]: "this is test case", [(function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2)]: (function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2) }));
// console.log(evals('({ [((a, b) => b => b)(1)(2)]: "this is a", true: "this is a", [() => [1, 2, 3, 4, 5, 6, 7]]: "this is a", [function(){ return {1: 2, 3: 4} }]: "this. is a", [(function(a, b){ a /= a / b; b %= b % a; return {1: a, 3: b} })(1, 2)]: "this is test case", [(function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2)]: (function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2) })'));

// console.log((function(a, b){ return {1: a, 3: b} })(1, 2));
// console.log(evals('(function(a, b){ return {1: a, 3: b} })(1, 2)'));

// console.log((function(a, b){ a = a / b; b = b % a; return {1: a, 3: b} })(1, 2));
// console.log(evals('(function(a, b){ a = a / b; b = b % a; return {1: a, 3: b} })(1, 2)'));

// console.log((function(a, b){ a /= a / b; b %= b % a; return {1: a, 3: b} })(1, 2));
// console.log(evals('(function(a, b){ a /= a / b; b %= b % a; return {1: a, 3: b} })(1, 2)'));

// console.log((function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2));
// console.log(evals('(function(a, b){ let temp, id = 2, c = temp; temp = a; a = b; b = temp; return {1: a, 3: b} })(1, 2)'));

// console.log((n => (x => n = x)(n + 2))(1));
// console.log(evals('(n => (x => n = x)(n + 2))(1)'));

// console.log((n => ((x => n = x)(n + 2), (y => n + y)(3)))(1));
// console.log(evals('(n => ((x => n = x)(n + 2), (y => n + y)(3)))(1)'));

module.exports = customerEval