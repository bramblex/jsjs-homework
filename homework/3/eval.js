const acorn = require('acorn');
const Scope = require('./scope');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
      // TODO: 补全作业代码
      return node.value;
    case 'Identifier':
      return env.get(node.name);
    // case 'RegExpLiteral':
    case 'Program':
      const arr = node.body.map(e => e ? evaluate(e, env) : undefined);
      return arr ? arr[arr.length - 1] : undefined;
    case 'ExpressionStatement':
      return evaluate(node.expression, env);
    // case 'Directive':
    case 'BlockStatement': {
      const scope = new Scope('block', env);
      let ret;
      for (const e of node.body) {
        ret = evaluate(e, scope);
        if (ret && ret.kind === 'return') return ret.value;
        if (ret && ret.kind === 'break') return ret;
        if (ret && ret.kind === 'continue') return;
      }
      return ret;
    }
    case 'EmptyStatement':
      return;
    case 'DebuggerStatement':
      return { kind: 'debugger' };
    case 'WithStatement':
      return { kind: 'with' };
    case 'ReturnStatement':
      return { kind: 'return', value: evaluate(node.argument, env) };
    case 'LabeledStatement':
      return { kind: 'label' };
    case 'BreakStatement':
      return { kind: 'break' };
    case 'ContinueStatement':
      return { kind: 'continue' };
    case 'IfStatement': {
      const scope = new Scope('block', env);
      if (evaluate(node.test, scope)) {
        return evaluate(node.consequent, scope);
      }
      return node.alternate ? evaluate(node.alternate, scope) : null;
    }
    case 'SwitchStatement': {
      const disc = evaluate(node.discriminant, env);
      const cases = node.cases;
      let ret;
      for (const el of cases) {
        if (evaluate(el.test, env) === disc) {
          for (const e of el.consequent) {
            ret = evaluate(e, env);
            if (ret && ret.kind === 'continue') return 'continue';
          }
        }
      }
      return ret;
    }
    case 'ThrowStatement':
      throw evaluate(node.argument, env);
    case 'TryStatement': {
      let ret;
      try {
        ret = evaluate(node.block, env);
      } catch (error) {
        const param = node.handler.param.name;
        env.declare('let', param);
        env.set(param, error);
        ret = evaluate(node.handler, env);
      } finally {
        if (node.finalizer) evaluate(node.finalizer, env);
      }
      return ret;
    }
    case 'CatchClause':
      return evaluate(node.body, env);
    case 'WhileStatement': {
      const scope = new Scope('block', env);
      let ret;
      while (evaluate(node.test, scope)) {
        ret = evaluate(node.body, scope);
      }
      return ret;
    }
    case 'DoWhileStatement': {
      let ret;
      do {
        ret = evaluate(node.body, env);
        if (ret && ret.kind === 'break') break;
        if (ret && ret.kind === 'return') return ret.value;
      } while (evaluate(node.test, env));
      return;
    }
    case 'ForStatement': {
      const scope = new Scope('block', env);
      evaluate(node.init, scope);
      let ret;
      while (evaluate(node.test, scope)) {
        ret = evaluate(node.body, scope);
        evaluate(node.update, scope);
      }
      return ret;
    }
    // case 'ForInStatement':
    case 'FunctionDeclaration': {
      env.declare('const', node.id.name);
      return env.set(node.id.name, function (...params) {
        const scope = new Scope('function', env);
        const args = node.params.map(e => e.name);
        args.forEach((arg, idx) => {
          scope.declare('let', arg);
          scope.set(arg, params[idx]);
        });
        return evaluate(node.body, scope);
      })
    }
    case 'VariableDeclaration':
      return node.declarations.forEach(e => {
        env.declare(node.kind, e.id.name);
        if (e.init) env.set(e.id.name, evaluate(e.init, env));
      });
    // case 'ThisExpression':
    case 'ArrayExpression':
      return node.elements.map(el => evaluate(el, env));
    case 'ObjectExpression':
      return node.properties.reduce((obj, e) => ({ ...obj, [e.key.name]: evaluate(e.value, env) }), {});
    // case 'Property':
    // kind: "init" | "get" | "set";
    case 'FunctionExpression': {
      const scope = new Scope('function', env);
      const args = node.params.map(e => e.name);
      const fun = function (...params) {
        args.forEach((arg, idx) => {
          scope.declare('let', arg);
          scope.set(arg, params[idx]);
        });
        return evaluate(node.body, scope);
      };
      if (node.id) {
        scope.declare('const', node.id.name);
        scope.set(node.id.name, fun);
      }
      return fun;
    }
    // case 'UnaryExpression':
    // case 'UnaryOperator':
    //  "-" | "+" | "!" | "~" | "typeof" | "void" | "delete"
    case 'UpdateExpression': {
      const prefix = node.prefix;
      const name = node.argument.name;
      const value = env.get(name);
      switch (node.operator) {
        case '++':
          env.set(name, value + 1);
          return prefix ? value + 1 : value;
        case '--':
          env.set(name, value - 1);
          return prefix ? value - 1 : value;
      }
    }
    case 'BinaryExpression':
      switch (node.operator) {
        case '==': return evaluate(node.left, env) == evaluate(node.right, env);
        case '!=': return evaluate(node.left, env) != evaluate(node.right, env);
        case '===': return evaluate(node.left, env) === evaluate(node.right, env);
        case '!==': return evaluate(node.left, env) !== evaluate(node.right, env);
        case '<': return evaluate(node.left, env) < evaluate(node.right, env);
        case '<=': return evaluate(node.left, env) <= evaluate(node.right, env);
        case '>': return evaluate(node.left, env) > evaluate(node.right, env);
        case '>=': return evaluate(node.left, env) >= evaluate(node.right, env);
        case '<<': return evaluate(node.left, env) << evaluate(node.right, env);
        case '>>': return evaluate(node.left, env) >> evaluate(node.right, env);
        case '>>>': return evaluate(node.left, env) >>> evaluate(node.right, env);
        case '+': return evaluate(node.left, env) + evaluate(node.right, env);
        case '-': return evaluate(node.left, env) - evaluate(node.right, env);
        case '*': return evaluate(node.left, env) * evaluate(node.right, env);
        case '/': return evaluate(node.left, env) / evaluate(node.right, env);
        case '%': return evaluate(node.left, env) % evaluate(node.right, env);
        case '|': return evaluate(node.left, env) | evaluate(node.right, env);
        case '^': return evaluate(node.left, env) ^ evaluate(node.right, env);
        case '&': return evaluate(node.left, env) & evaluate(node.right, env);
        case 'in': return evaluate(node.left, env) in evaluate(node.right, env);
        case 'instanceof': return evaluate(node.left, env) instanceof evaluate(node.right, env);
      }
    case 'AssignmentExpression':
      if (node.left.type === 'Identifier') {
        const param = node.left.name;
        const value = env.get(param);
        switch (node.operator) {
          case '=': return env.set(param, evaluate(node.right, env));
          case '+=': return env.set(param, value + evaluate(node.right, env));
          case '-=': return env.set(param, value - evaluate(node.right, env));
          case '*=': return env.set(param, value * evaluate(node.right, env));
          case '/=': return env.set(param, value / evaluate(node.right, env));
          case '%=': return env.set(param, value % evaluate(node.right, env));
        }
      } else {
        const obj = node.left.object.name;
        const prop = node.left.property.name;
        let value = evaluate(node.right, env);
        switch (node.operator) {
          case '=': break;
          case '+=': value += env.get(obj); break;
          case '-=': value -= env.get(obj); break;
          case '*=': value *= env.get(obj); break;
          case '/=': value /= env.get(obj); break;
          case '%=': value %= env.get(obj); break;
          case '<<=': value <<= env.get(obj); break;
          case '>>=': value >>= env.get(obj); break;
          case '>>>=': value >>>= env.get(obj); break;
          case '|=': value |= env.get(obj); break;
          case '^=': value ^= env.get(obj); break;
          case '&=': value &= env.get(obj); break;
        }
        env.set(obj, { ...env.get('obj'), [prop]: value });
        return value;
      }
    case 'LogicalExpression':
      switch (node.operator) {
        case '&&': return evaluate(node.left, env) && evaluate(node.right, env);
        case '||': return evaluate(node.left, env) || evaluate(node.right, env);
      }
    case 'MemberExpression': {
      const name = node.object.name;
      const value = env.get(name);
      const prop = node.property.name;
      if (value instanceof Array) {
        switch (prop) {
          case 'push': return (i) => {
            const ret = value.push(i);
            env.set(name, value);
            return ret;
          };
          case 'pop': return (i) => {
            const ret = value.pop(i);
            env.set(name, value);
            return ret;
          };
        }
      } else return value[prop];
    }
    case 'ConditionalExpression':
      if (evaluate(node.test, env)) return evaluate(node.consequent, env);
      else return evaluate(node.alternate, env);
    case 'CallExpression':
      return evaluate(node.callee, env)(...node.arguments.map(arg => evaluate(arg, env)));
    // // case 'NewExpression':
    case 'SequenceExpression':
      return node.expressions.reduce((_, expression) => evaluate(expression, env));
    case 'ArrowFunctionExpression': {
      const args = node.params.map(e => e.name);
      const scope = new Scope('function', env);
      return (...params) => {
        args.forEach((arg, idx) => {
          scope.declare('let', arg);
          scope.set(arg, params[idx]);
        });
        return evaluate(node.body, scope);
      };
    }
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  env = new Scope();
  const node = acorn.parse(code, 0, {
    ecmaVersion: 6
  })
  return evaluate(node, env)
}

module.exports = customerEval