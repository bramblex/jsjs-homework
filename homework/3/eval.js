const acorn = require('acorn');
const scope = require('./scope');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal': {
      return node.value;
    }
    case 'Identifier': {
      return env.get(node.name);
    }
    case 'BinaryExpression': {
      switch (node.operator) {
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
        case '<': return evaluate(node.left, env) < evaluate(node.right, env);
        case '>': return evaluate(node.left, env) > evaluate(node.right, env);
        case '%': return evaluate(node.left, env) % evaluate(node.right, env);
        case '==': return evaluate(node.left, env) == evaluate(node.right, env);
        case '!=': return evaluate(node.left, env) != evaluate(node.right, env);
        case '===': return evaluate(node.left, env) === evaluate(node.right, env);
        case '!==': return evaluate(node.left, env) !== evaluate(node.right, env);
        case '<<': return evaluate(node.left, env) << evaluate(node.right, env);
        case '>>': return evaluate(node.left, env) >> evaluate(node.right, env);
      }
    }
    case 'LogicalExpression': {
      switch (node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env);
        case '||': return evaluate(node.left, env) || evaluate(node.right, env);
      }
    }
    case 'AssignmentExpression': {
      switch (node.operator) {
        case '=': return env.set(node.left, evaluate(node.right, env));
        case '+=': return env.set(node.left, evaluate(node.left, env) + evaluate(node.right, env));
        case '-=': return env.set(node.left, evaluate(node.left, env) - evaluate(node.right, env));
        case '*=': return env.set(node.left, evaluate(node.left, env) * evaluate(node.right, env));
        case '/=': return env.set(node.left, evaluate(node.left, env) / evaluate(node.right, env));
      }
    }
    case 'UpdateExpression': {
      switch (node.operator) {
        case '++': return node.prefix ? evaluate(node.argument, env) : env.set(node.argument, evaluate(node.argument, env) + 1);
        case '--': return node.prefix ? evaluate(node.argument, env) : env.set(node.argument, evaluate(node.argument, env) - 1);
      }
    }
    //注意参数
    case 'CallExpression': {
      return evaluate(node.callee, env)(...node.arguments.map(arg =>
        evaluate(arg, env)
      ));
    }
    case 'IfStatement': {
      if (evaluate(node.test, env)) return evaluate(node.consequent, env);
      else return node.alternate ? evaluate(node.alternate, env) : undefined
    }
    case 'WhileStatement': {
      let return_;
      while (evaluate(node.test, env)) {
        return_ = evaluate(node.body, env)
        if (return_ && return_.type) {
          if(return_.label && (!node.label || node.label && return_.label !== node.label))
            return return_;
          else if (return_.type === 'continue') continue;
          else if (return_.type === 'return') return return_;
          else if(return_.type === 'break') break;
        }
      }
      return;
    }
    case 'ForStatement': {
      let return_;
      let forscope = new scope('block', env)
      for (node.init && evaluate(node.init, forscope); node.test && evaluate(node.test, forscope); node.update && evaluate(node.update, forscope)) {
        return_ = evaluate(node.body, forscope);
        if (return_ && return_.type) {
          if(return_.label && !node.label || return_.label && node.label && return_.label !== node.label)
            return return_;
          else if (return_.type === 'continue') continue;
          else if (return_.type === 'return') return return_;
          else if(return_.type === 'break') break;
        }
      }
      return;
    }
    case 'SwitchStatement': {
      const discriminant = evaluate(node.discriminant, env);
      const switchscope = new scope('block', env);
      let return_;
      for (const i of node.cases) {
        if (i.test && evaluate(i.test, switchscope) === discriminant || !i.test) {
          let return_;
          for (const c of i.consequent) {
            return_ = evaluate(c, switchscope);
            if (return_ && return_.type) {
              return return_;
            }
          }
        }
      }
      return return_;
    }
    case 'ConditionalExpression': {
      return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
    }
    case 'ExpressionStatement': {
      return evaluate(node.expression, env);
    }
    case 'ObjectExpression': {
      let obj = {};
      //注意key
      node.properties.forEach(p => {
        obj[p.key.name] = evaluate(p.value, env);
      })
      return obj;
    }
    case 'MemberExpression': {
      return evaluate(node.object, env)[node.property.name];
    }
    case 'ArrayExpression': {
      return node.elements.map(e => {
        return evaluate(e, env);
      })
    }
    case 'FunctionExpression':
    case 'ArrowFunctionExpression': {
      return function (...args) {
        const env_ = new scope('function', env)
        node.params.forEach((p, i) => {
          env_.declare('let', p.name, args[i]);
        })
        const a = evaluate(node.body, env_);
        if(a && a?.type==='return') return a.value;
      };
    }
    case 'ContinueStatement': {
      return { 'type': 'continue', 'label': node?.label?.name }
    }
    case 'BreakStatement': {
      return { 'type': 'break', 'label': node?.label?.name }
    }
    case 'ReturnStatement': {
      return {
        type: 'return',
        value: evaluate(node.argument, env)
      }
    }
    case 'VariableDeclaration': {
      const a = node.declarations.forEach(vd => {
        env.declare(node.kind, vd.id.name, vd.init ? evaluate(vd.init, env) : null)
      })
      return a;
    }
    case 'LabeledStatement': {
      node.body.label = node.label.name;
      return evaluate(node.body, env);
    }
    case 'ThrowStatement': {
      throw evaluate(node.argument, env);
    }
    case 'TryStatement': {
      let try_, catch_, final_;
      try {
        try_ = evaluate(node.block, env);
      } catch (err) {
        const errorscope = new scope('block', env);
        errorscope.declare('let', node.handler.param.name, err);
        catch_ = evaluate(node.handler, errorscope);
      } finally {
        if (node.finalizer)
          final_ = evaluate(node.finalizer, env);
      }
      return catch_ || final_ || try_;
    }
    case 'CatchClause': {
      return evaluate(node.body, env);
    } 
    case 'BlockStatement': {
      const blockscope = new scope('block', env);
      let return_;
      for (const node_ of node.body) {
        return_ = evaluate(node_, blockscope);
        if (return_ && return_.type)
          return return_
      }
      return;
    }
    case 'Program': {
      const globalscope = new scope('global', null);
      let return_;
      for (const node_ of node.body) {
        return_ = evaluate(node_, globalscope);
        if (return_ && return_.type === 'return') return return_.value;
      }
      return return_;
    }
    // TODO: 补全作业代码
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval