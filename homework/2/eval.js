const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) 
  {
    case 'Literal':
      return node.value;
    case 'Identifier':
      return env[node.name];
    case 'BinaryExpression':
      {
        switch(node.operator)
        {
          case '+':
            return evaluate(node.left, env) + evaluate(node.right, env);
          case '-':
            return evaluate(node.left, env) - evaluate(node.right, env);
          case '*':
            return evaluate(node.left, env) * evaluate(node.right, env);
          case '/':
            return evaluate(node.left, env) / evaluate(node.right, env);
          case '**':
            return evaluate(node.left, env) ** evaluate(node.right, env);
          case '%':
            return evaluate(node.left, env) % evaluate(node.right, env);
          case '>':
            return evaluate(node.left, env) > evaluate(node.right, env);
          case '<':
            return evaluate(node.left, env) < evaluate(node.right, env);
          case '>=':
            return evaluate(node.left, env) >= evaluate(node.right, env);
          case '<=':
            return evaluate(node.left, env) <= evaluate(node.right, env);
          case '==':
            return evaluate(node.left, env) == evaluate(node.right, env);
          case '===':
            return evaluate(node.left, env) === evaluate(node.right, env);
          case '!==':
            return evaluate(node.left, env) !== evaluate(node.right, env);
          case '&':
            return evaluate(node.left, env) & evaluate(node.right, env);
          case '|':
            return evaluate(node.left, env) | evaluate(node.right, env);
          case '^':
            return evaluate(node.left, env) ^ evaluate(node.right, env);
          case '<<':
            return evaluate(node.left, env) << evaluate(node.right, env);
          case '>>':
            return evaluate(node.left, env) >> evaluate(node.right, env);
          case '>>>':
            return evaluate(node.left, env) >>> evaluate(node.right, env);
          case 'instanceof':
            return evaluate(node.left, env) instanceof evaluate(node.right, env);
        }
      }
    case 'LogicalExpression': 
    {
      switch(node.operator)
      {
        case '&&':
          return evaluate(node.left, env) && evaluate(node.right, env);
        case '||':
          return evaluate(node.left, env) || evaluate(node.right, env);
      }
    }
    case 'UnaryExpression': {
      switch(node.operator)
      {
        case '!':
          return !evaluate(node.argument, env);
        case '~':
          return ~evaluate(node.argument, env);
        case 'typeof':
          return typeof evaluate(node.argument, env);
      }
    } 
    case 'UpdateExpression': {
      const flag = node.prefix;
      const argument = node.argument;
      switch(node.operator)
      {
        case '++':
        {
          if (flag) {
            return ++evaluate(argument, env);
          } else {
            return evaluate(argument, env)++;
          }
        }
        case '--':
          {
            if (flag) {
              return --evaluate(argument, env);
            } else {
              return evaluate(argument, env)--;
            }
          }
      }
    }
    case 'ConditionalExpression': 
    {
      if (evaluate(node.test, env)) {
        return evaluate(node.consequent, env);
      } else {
        return evaluate(node.alternate, env);
      }
    }
    case 'CallExpression': {
      const c = evaluate(node.callee, env);
      const args = node.arguments.map(arg => evaluate(arg, env));
      return c(...args);
    }
    case 'ObjectExpression':
      return node.properties.reduce((preProperty, curProperty) => (
        {...preProperty, [curProperty.key.name] : evaluate(curProperty.value, env)}), {});
    case 'ArrayExpression':
      return node.elements.map((element) => evaluate(element, env));
    case 'BlockStatement':
      return node.body.reduce((preStatement, curStatement) => evaluate(curStatement, env), undefined);
    case 'ArrowFunctionStatement':
      return (...args) => {
        return evaluate(node.body, {
          ...env,
          ...node.params.reduce((preParam, curParam, curIdx)=>({...preParam, [curParam.name]: args[curIdx]}), {})
        })
      } 
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