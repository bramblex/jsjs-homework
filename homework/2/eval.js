const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      return node.value
    case 'Identifier':
      return env[node.name]
    case 'BinaryExpression': {
      switch (node.operator) {
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '%': return evaluate(node.left, env) % evaluate(node.right, env);
        case '<': return evaluate(node.left, env) < evaluate(node.right, env);
        case '>': return evaluate(node.left, env) > evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
        case '>=': return evaluate(node.left, env) >= evaluate(node.right, env);
        case '<<': return evaluate(node.left, env) << evaluate(node.right, env);
        case '>>': return evaluate(node.left, env) >> evaluate(node.right, env);
        case '^': return evaluate(node.left, env) ^ evaluate(node.right, env);
        case '|': return evaluate(node.left, env) | evaluate(node.right, env);
        case '&': return evaluate(node.left, env) & evaluate(node.right, env);
        case '==': return evaluate(node.left, env) == evaluate(node.right, env);
        case '===': return evaluate(node.left, env) === evaluate(node.right, env);
        case '!=': return evaluate(node.left, env) != evaluate(node.right, env);
        case '!==': return evaluate(node.left, env) !== evaluate(node.right, env);
        case 'in': return evaluate(node.left, env) in evaluate(node.right, env);
        case 'instanceof': return evaluate(node.left, env) instanceof evaluate(node.right, env);
      }
    }
    case 'LogicalExpression':
      if(node.operator === '&&') {
        return evaluate(node.left,env) && evaluate(node.right, env)
      }else if (node.operator === '||') {
      return evaluate(node.left,env) || evaluate(node.right, env)
    }else return ;
    case 'CallExpression':
      // if(node.callee.name === 'throwError')return env['throwError']();
      // else
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));

    case 'ArrowFunctionExpression': {
      // const args = node.params.map(e => e.name);
      return function (...args) {
        let argsEnv = {}
        node.params.map( (item,index) => {
          argsEnv[item.name] = args[index]
        })
        // const argsEnv = node.params.reduce((argsEnv, param, idx) => ({ ...argsEnv, [param.name]: args[idx] }), { ...env });

        return evaluate(node.body,{...env, ...argsEnv});
      };
    }

    case 'ConditionalExpression':
      if(evaluate(node.test,env)) {
        return evaluate(node.consequent, env)
      }else {
        return evaluate(node.alternate, env)
      }
    case 'ObjectExpression':
      let tmpDict = {};
      for (item of node.properties){
        tmpDict[item.key.name] = evaluate(item.value)
      }
      return tmpDict
    case 'ArrayExpression':
      return node.elements.map((item, index) => {
        return evaluate(item)
      })
    case 'SequenceExpression':
      return node.expressions.forEach(item => evaluate(item, env))
    case 'AssignmentExpression':{
      return env[evaluate(node.left,env)] = env[evaluate(node.right,env)]
    }
    // TODO: 补全作业代码
  }

  // throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  // console.log(node)
  return evaluate(node, env)
}

module.exports = customerEval
