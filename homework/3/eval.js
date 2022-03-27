const acorn = require('acorn');

function evaluate(node, env) {
  console.log("type:", node.type)
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name].value;
    case 'Program':
      return evaluateBlock(node.body, env);
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

// 解析{}或者Program中的代码
function evaluateBlock(body, env) {
  for (const statement of body) {
    if (statement.type === 'ContinueStatement') {
      return 'continue'
    }
    const result = evaluateStatement(statement, env)
    if (result === 'continue') {
      return;
    }
    if (result != undefined && result != null) {
      return result;
    }
  }
  return;
}

// 解析语句
function evaluateStatement(statement, env) {
  console.log("statement", statement.type)
  switch (statement.type) {
    case 'TryStatement':
      return evaluateTryStatement(statement, env);
    case 'VariableDeclaration':
      for (const declaration of statement.declarations) {
        env[declaration.id.name] = {
          value: evaluateExpression(declaration.init, env),
          constant: statement.kind === 'const',
        };
      }
      break;
    case 'ExpressionStatement':
      return evaluateExpression(statement.expression, env);
    case 'IfStatement':
      console.log(evaluateExpression(statement.test, env));
      if (evaluateExpression(statement.test, env)) {
        return evaluateBlock(statement.consequent.body, env);
      } else {
        return evaluateBlock(statement.alternate.body, env);
      }
    case 'ForStatement':
      evaluateStatement(statement.init, env);
      while(evaluateExpression(statement.test, env)) {
        for (const expression of statement.body.body) {
          evaluateExpression(expression, env);
        }
        evaluateExpression(statement.update, env);
      }
      return;
    case 'WhileStatement':
      while(evaluateExpression(statement.test, env)) {
        evaluateBlock(statement.body.body, env)
      }
      return;
    case 'BlockStatement':
      return evaluateBlock(statement.body, env);
    case 'SwitchStatement':
      const discriminant = evaluateExpression(statement.discriminant, env)
      for (const caseItem of statement.cases) {
        if (evaluateExpression(caseItem.test) === discriminant) {
          return evaluateBlock(caseItem.consequent)
        }
      }
      return;
    case 'ReturnStatement':
      console.log(evaluateExpression(statement.argument, env))
      return evaluateExpression(statement.argument, env);
  }
}

// 解析表达式语句
function evaluateExpression(node, env) {
  console.log("expression", node.type)
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name].value;
    case 'ArrayExpression':
      const arr = [];
      for (const element of node.elements) {
        arr.push(evaluate(element, env));
      }
      return arr;
    case 'ObjectExpression':
      const obj = {};
      for (const prop of node.properties) {
        obj[prop.key.name] = evaluateExpression(prop.value, env);
      }
      return obj;
    case 'BinaryExpression':
      if (node.operator === '+') {
        return evaluate(node.left, env) + evaluate(node.right, env);
      } else if (node.operator === '-') {
        return evaluate(node.left, env) - evaluate(node.right, env);
      } else if (node.operator === '/') {
        return evaluate(node.left, env) / evaluate(node.right, env);
      } else if (node.operator === '*') {
        return evaluate(node.left, env) * evaluate(node.right, env);
      } else if (node.operator === '<=') {
        return evaluate(node.left, env) <= evaluate(node.right, env);
      } else if (node.operator === '<') {
        return evaluate(node.left, env) < evaluate(node.right, env);
      } else if (node.operator === '>') {
        return evaluate(node.left, env) > evaluate(node.right, env);
      } else if (node.operator === '>=') {
        return evaluate(node.left, env) >= evaluate(node.right, env);
      } else if (node.operator === '==') {
        return evaluate(node.left, env) == evaluate(node.right, env);
      }
      break;
    case 'ConditionalExpression':
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    case 'LogicalExpression':
      if (node.operator === '||') {
        return evaluate(node.left, env) || evaluate(node.right, env);
      } else if (node.operator === '&&') {
        return evaluate(node.left, env) && evaluate(node.right, env);
      }
      break;
    case 'ExpressionStatement':
      return evaluateExpression(node.expression, env);
    case 'CallExpression':
      return evaluateExpression(node.callee, env)(...node.arguments.map(arg => evaluateExpression(arg, env)));
    case 'ArrowFunctionExpression':
      return function(...args) {
        const argEnv = {};
        for (const i in node.params) {
          argEnv[node.params[i].name] = { 
            value: args[i],
            constant: false,
          }
        }
        return evaluateStatement(node.body, {...env, ...argEnv});
      }
    case 'FunctionExpression':
      return function(...args) {
        console.log("args", args)
        const argEnv = {};
        for (const i in node.params) {
          argEnv[node.params[i].name] = { 
            value: args[i],
            constant: false,
          }
        }
        return evaluateStatement(node.body, {...env, ...argEnv});
      }
    case 'MemberExpression':
      const value = env[node.object.name].value
      switch (node.property.name) {
        case 'push':
          return function(...args) {
            console.log("args", args)
            value.push(args[0])
            console.log("value", value)
          }
      }
      return;
    case 'AssignmentExpression':
      const right = evaluateExpression(node.right, env);
      if (node.left.type === 'MemberExpression') {
        switch (node.operator) {
          case '=':
            env[node.left.object.name].value[node.left.property.name] = right;
            return;
        }
      }
      if (env[node.left.name].constant) {
        throw new TypeError('Assignment to constant variable');
      }
      switch (node.operator) {
        case '=':
          env[node.left.name].value = right;
          return;
        case '+=':
          env[node.left.name].value += right;
          return;
        case '*=':
          env[node.left.name].value *= right;
          return;
      }
      return;
    case 'UpdateExpression':
      switch (node.operator) {
        case '++':
          env[node.argument.name].value++;
      }
      return;
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

// 解析try{}catch语句
function evaluateTryStatement(node, env) {
  for (const statement of node.block.body) {
    // finally 必须在返回前执行
    if (statement.type === 'ReturnStatement') {
      const result = evaluateBlock(node.finalizer, env);
      if (result !== undefined) {
        return result;
      }
    } else if (statement.type === 'ThrowStatement') {
      const err = evaluateExpression(statement.argument, env);
      env['err'] = {
        value: err,
        constant: false,
      }
      return evaluateCatchClause(node, env);
    }
    const result = evaluateStatement(statement, env)
    if (result !== undefined && result !== null) {
      return result;
    }
  }
  return;
}

function evaluateCatchClause(node, env) {
  for (const statement of node.handler.body.body) {
    // finally 必须在返回前执行
    if (statement.type === 'ReturnStatement') {
      const result = evaluateBlock(node.finalizer.body, env);
      if (result !== undefined) {
        return result;
      }
    }
    const result = evaluateStatement(statement, env)
    if (result !== undefined && result !== null) {
      return result;
    }
  }
  return;
}
function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval