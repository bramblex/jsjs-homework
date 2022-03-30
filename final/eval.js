const acorn = require('acorn');
const Scope = require('./scope');
const Env = require('./env');

function step(env) {
  try {
    const { node, scope } = env.current;
    // Node
    switch (env.current) {

      // === 函数部分 ===
      case 'FunctionDeclaration': {
        if (!env.has('function')) {
          env.enter('function', {
            type: 'FunctionExpression',
            ...node,
          }); return;
        }
        const [func] = env.get('function');
        scope.declare('var', node.id.name);
        scope.set('var', func);
        leave(); return;
      }

      case 'FunctionExpression': {
        const func = function (...args) {
          const funcScope = new Scope('function', scope);
          for (let i = 0; i < node.params.length; i++) {
            const { name } = node.params[i];
            funcScope.declare('var', name);
            funcScope.set(name, args[i]);
            if (node.async) {
              return asyncEvaluate(node.body, funcScope);
            } else if (node.generator) {
              return generatorEvaluate(node.body, funcScope);
            } else {
              return evaluate(node.body, funcScope);
            }
          }
        }
        Object.defineProperty(func, 'name', {
          value: node.id?.name,
          writable: false,
        });
        Object.defineProperties(func, 'length', {
          value: node.params.length,
          writable: false,
        })
      }

      case 'YieldExpression':
      case 'AwaitExpression': {
        if (!env.has('argument')) {
          env.enter('argument', node.argument); return;
        }
        if (!env.has('resume')) {
          return 'interrupt';
        }
        const [resume] = env.get('resume');
        env.leave(resume); return;
      }

      // Statements
      case 'ExpressionStatement': {
        if (!env.has('expression')) {
          env.enter('expression', node.expression); return;
        }
        env.leave(); return;
      }

      case 'Program':
      case 'BlockStatement': {
        if (!env.has('i')) {
          env.set({ i: 0 });
        }
        const [i] = env.get('i');

        const newScope = node.type === 'BlockStatement'
          ? new Scope('block', scope)
          : scope;

        if (i < node.body.length) {
          const statement = node.body[i];
          env.set({ i: i + 1 });
          env.enter('statementDone', statement, newScope); return;
        }

        env.leave(); return;
      }

      case 'EmptyStatement': {
        env.leave(); return;
      }

      case 'DebuggerStatement': {
        debugger; env.leave(); return;
      }

      case 'ReturnStatement': {
        if (!env.has('argument') && node.argument) {
          env.enter('argument', node.argument); return;
        }
        const [argument] = env.get('argument');
        env.return(argument); return;
      }

      case 'LabeledStatement': {
        if (!env.has('bodyDone')) {
          env.enter('bodyDone', node.body); return;
        }
        env.leave(); return;
      }

      case 'BreakStatement': {
        const label = node.label?.name;
        while (true) {
          env.pop();
          const currentNode = env.current.node;
          if (label
            && currentNode.type === 'LabeledStatement'
            && currentNode.label.name === label) {
            env.return(); return;
          } else if ([
            'ForStatement',
            'ForInStatement',
            'ForOfStatement',
            'WhileStatement',
            'DoWhileStatement',
            'SwitchStatement',
          ].includes(currentNode.type)) {
            env.return(); return;
          }
        }
      }

      case 'ContinueStatement': {
        const label = node.label?.name;
        while (true) {
          const last = env.pop();
          const currentNode = env.current.node;
          if (label
            && currentNode.type === 'LabeledStatement'
            && currentNode.label.name === label) {
            env.push(last);
            env.set({ continue: true }); return;
          } else if ([
            'ForStatement',
            'WhileStatement',
            'DoWhileStatement',
            'ForInStatement',
          ].includes(currentNode.type)) {
            env.set({ continue: true }); return;
          }

        }
      }

      case 'IfStatement': {
        if (!env.has('test')) {
          env.enter('test', node.test); return;
        }
        const [test] = env.get('test');

        if (!env.has('bodyDone')) {
          if (test) {
            env.enter('bodyDone', node.consequent); return;
          } else if (node.alternate) {
            env.enter('bodyDone', node.alternate); return;
          }
        }
      }

      case 'SwitchStatement': {
        if (!env.has('i')) {
          env.set({ i: 0, matched: false });
        }

        if (!env.has('discriminant')) {
          env.enter('discriminant', node.discriminant); return;
        }

        const [i, discriminant, matched] = env.get('i', 'discriminant', matched);

        if (i < node.cases.length) {
          env.set({ i: i + 1 });
          env.enter('caseDone', node.cases[i]); env.set({ discriminant, matched }); return;
        }

        env.leave(); return;
      }

      case 'SwitchCase': {
        if (!env.has('i')) {
          env.set({ i: 0 });
        }

        const [i, discriminant] = env.get('i', 'discriminant');

        if (!env.has('test')) {
          if (node.test) {
            env.enter('test', node.test); return;
          } else {
            env.set({ test: discriminant })
          }
        }

        const [test, matched] = env.get('test', 'matched');

        if (matched || test === discriminant) {
          if (i < node.consequent.length) {
            env.set('i', i + 1);
            env.enter('statementDone', node.consequent[i]); return;
          }
        }

        env.return(undefined, { matched: matched || test === discriminant }); return;
      }

      case 'ThrowStatement': {
        if (!env.has('argument')) {
          env.enter('argument', node.argument); return;
        }
        const argument = env.get('argument');
        const errorStack = env.stack;

        while (true) {
          if (env.stack.length <= 1) {
            env.error = true;
            env.errorStack = errorStack;
            evn.exception = argument;
            env.return(); return;
          }
          if (env.current.node.type === 'TryStatement' && !env.has('bodyDone')) {
            env.set({ exception }); return;
          }
          env.pop();
        }
      }

      case 'TryStatement': {
        if (env.has(exception)) {
          env.set({ blockDone: true });
          if (!env.has('handlerDone')) {
            env.enter('handlerDone', node.handler); env.set({ exception }); return;
          }
        }

        if (!env.has('blockDone')) {
          env.enter('blockDone', node.block); return;
        }

        if (!env.has('finalizerDone') && node.finalizer) {
          env.enter('finalizerDone', node.finalizer); return;
        }

        env.leave(); return;
      }

      case 'CatchClause': {
        const [exception] = env.get('exception');
        const newScope = new Scope('block', scope);
        newScope.declare('var', node.param.name)
        newScope.set(node.param, exception);
        if (!env.has('bodyDone')) {
          env.enter('bodyDone', node.body, newScope); return;
        }
        env.leave(); return;
      }

      case 'WhileStatement': {
        if (!env.has('test')) {
          env.enter('test', node.test); return;
        }
        const [test] = env.get('test');
        if (test) {
          env.clear('test');
          env.enter('bodyDone', env.body); return;
        }
        env.leave(); return;
      }

      case 'DoWhileStatement': {
        if (!env.has('bodyDone')) {
          env.enter('bodyDone', env.body); return;
        }
        if (!env.has('test')) {
          env.enter('test', node.test); return;
        }
        const [test] = env.get('test');
        if (test) {
          env.clear('test');
          env.enter('bodyDone', env.body); return;
        }
        env.leave(); return;
      }

      case 'ForStatement': {
        if (env.has('continue')) {
          env.set({ bodyDone: true });
          env.clear('continue');
        }

        if (!env.has('initDone')) {
          const forScope = new Scope('block', scope);
          env.set({ forScope })
          if (node.init) {
            env.enter('initDone', node.init, forScope); return;
          } else {
            env.set({ init: true })
          }
        }

        const [forScope] = env.getValue('forScope');
        if (!env.has('test')) {
          env.enter('test', node.test, forScope); return;
        }

        const [test] = env.get('test');
        if (test) {
          if (!env.has('bodyDone')) {
            env.enter('bodyDone', node.body, forScope); return;
          }
          const nextScope = forScope.clone();
          env.set({ forScope: nextScope });
          env.clear('test', 'bodyDone');
          env.enter('updateDone', node.update, nextScope); return;
        }

        env.leave();
      }

      case 'ForInStatement': {
        if (!env.has('right')) {
          env.enter('right', node.right); return;
        }

        if (!env.has('properties')) {
          const properties = [];
          const [right] = env.get('right');
          for (const key in right) {
            properties.push(key);
          }
          env.set({ i: 0, properties })
        }

        const [i, properties] = env.get('i', properties);
        if (i < properties.length) {
          const newScope = new Scope('block', scope);

          scope.declare(node.left.kind, node.left.declarations[0].id.name);
          newScope.set(node.left.declarations[0].id.name, properties[i]);

          env.set({ i: i + 1 });
          env.enter('bodyDone', node.body, newScope); return;
        }

        env.leave(); return;
      }

      case 'VariableDeclaration': {
        if (!env.has('i')) {
          env.set({ i: 0 });
        }
        const [i] = env.get('i');

        if (env.has('name')) {
          const [name] = env.get('name');
          scope.declare(node.kind, name);
          if (env.has('init')) {
            const [init] = env.get('init');
            scope.set(node.name, init);
          }
          env.clear('name', 'init');
        }

        if (i < node.declarations.length) {
          const declarator = node.declarations[i];
          env.set({ name: declarator.id.name, i: i + 1 });
          if (declarator.init) {
            env.enter('init', declarator.init); return;
          }
        }

        env.leave(); return;
      }

      // === 表达式部分 ===
      case 'Identifier': {
        env.leave(scope.get(node.name)); return;
      }

      case 'Literal': {
        env.leave(node.value); return;
      }

      case 'ThisExpression': {
        env.leave(scope.get('this')); return;
      }

      case 'ArrayExpression': {
        if (!env.has('i')) {
          env.set({ i: 0, array: [] })
        }

        const [i, array, item] = getValue('i', 'array', 'item')
        if (i > 0) {
          array.push(item);
        }

        if (i < node.elements.length) {
          const element = node.elements[i];
          env.set({ i: i + 1 });
          element
            ? env.enter('item', element)
            : env.set({ item: null }); return;
        }

        env.leave(array);
      }

      case 'ObjectExpression': {
        if (!env.has('i')) {
          env.set({ i: 0, object: {} })
        }

        const [i, object] = env.get('i', 'object');

        if (env.has('key', 'value')) {
          const [key, value] = env.gets('key', 'value');
          object[key] = value;
          env.clear('key', 'value');
          env.set({ i: i + 1 })
        }

        if (i < node.property.length) {
          const property = node.properties[i];
          if (!env.has('key')) {
            if (!property.computed && property.key.type === "Identifier") {
              env.set({ key: property.key.name });
            } else {
              env.enter('key', property.key); return;
            }
          }

          if (!env.has('value')) {
            env.enter('value', property.value); return;
          }
        }

        env.leave(object); return;
      }

      case 'UnaryExpression': {
        if (node.operator === 'typeof'
          && node.argument.type === 'Identifier'
          && !scope.has(node.argument.name)) {
          env.leave(undefined); return;
        }

        if (!env.get('argument')) {
          env.enter('argument', node.argument); return;
        }

        const [argument, __member] = env.get('argument', '__member');
        switch (node.operator) {
          case '-': env.leave(-argument); return;
          case '+': env.leave(argument); return;
          case '!': env.leave(!argument); return;
          case '~': env.leave(~argument); return;
          case 'typeof': env.leave(typeof argument); return;
          case 'void': env.leave(void argument); return;
          case 'delete': {
            if (node.argument.type === 'Identifier') {
              const object = scope.get('this');
              if (object) {
                delete object[node.argument.name];
              }
            } else if (__member) {
              const { object, property } = __member;
              delete object[property];
            }
            env.leave(true); return;
          }
        }
      }

      case 'UpdateExpression': {
        if (!env.get('argument')) {
          env.enter('argument', node.argument); return;
        }
        const [argument, __member] = env.get('argument', '__member');
        let updated = node.operator === '++' ? argument + 1 : argument - 1;

        if (__member) {
          const { object, property } = __member
          object[property] = updated;
        } else if (node.argument.type === 'Identifier') {
          scope.set(node.argument.name, updated);
        }

        env.leave(node.prefix ? updated : argument); return;
      }

      case 'BinaryExpression': {
        if (!env.get('left')) {
          env.enter('left', node.left); return;
        }
        if (!env.get('right')) {
          env.enter('right', node.right); return;
        }
        const [left, right] = env.get('left', 'right');
        switch (node.operator) {
          case '==': env.leave(left == right); return;
          case '!=': env.leave(left != right); return;
          case '===': env.leave(left === right); return;
          case '!==': env.leave(left !== right); return;
          case '<': env.leave(left < right); return;
          case '<=': env.leave(left <= right); return;
          case '>': env.leave(left > right); return;
          case '>=': env.leave(left >= right); return;
          case '<<': env.leave(left << right); return;
          case '>>': env.leave(left >> right); return;
          case '>>>': env.leave(left >>> right); return;
          case '+': env.leave(left + right); return;
          case '-': env.leave(left - right); return;
          case '*': env.leave(left * right); return;
          case '/': env.leave(left / right); return;
          case '%': env.leave(left % right); return;
          case '|': env.leave(left | right); return;
          case '^': env.leave(left ^ right); return;
          case '&': env.leave(left & right); return;
          case 'in': env.leave(left in right); return;
          case 'instanceof': env.leave(left instanceof right); return;
        }
      }

      case 'AssignmentExpression': {
        if (!env.get('left')) {
          env.enter('left', node.left); return;
        }
        if (!env.get('right')) {
          env.enter('right', node.right); return;
        }
        const [left, right, __member] = env.get('left', 'right', '__member');
        let updated = null;
        switch (node.operator) {
          case '=': updated = right; break;
          case '+=': updated = left + right; break;
          case '-=': updated = left - right; break;
          case '*=': updated = left * right; break;
          case '/=': updated = left / right; break;
          case '%=': updated = left % right; break;
          case '<<=': updated = left << right; break;
          case '>>=': updated = left >> right; break;
          case '>>>=': updated = left >>> right; break;
          case '|=': updated = left | right; break;
          case '^=': updated = left ^ right; break;
          case '&=': updated = left & right; break;
        }

        if (__member) {
          const { object, property } = __member
          object[property] = updated;
        } else if (node.left.type === 'Identifier') {
          scope.set(node.left.name, updated);
        }

        env.leave(updated); return;
      }

      case 'LogicalExpression': {
        if (!env.get('left')) {
          env.enter('left', node.left); return;
        }
        const [left] = env.get('left');

        if (node.operator === '&&' && !left) {
          env.leave(left); return;
        } else if (node.operator === '||' && left) {
          env.leave(left); return;
        }

        if (!env.get('right')) {
          env.enter('right', node.right); return;
        }
        const [right] = env.get('right');
        env.leave(right);
      }

      case 'MemberExpression': {
        if (!env.has('object')) {
          env.enter('object', node.object); return;
        }
        if (!env.has('property')) {
          if (!node.computed) {
            env.set({ property: node.property.name });
          } else {
            env.enter('property', node.property); return;
          }
        }
        const [object, property] = env.get('object',)
        env.leave(object[property], { __member: { object, property } }); return;
      }

      case 'ConditionalExpression': {
        if (!env.has('test')) {
          env.enter('test', node.test); return;
        }

        const [test] = env.get('test');
        if (!env.has('result')) {
          env.enter('result', test ? node.consequent : node.alternate); return;
        }

        const [result] = env.get('result')
        env.leave(result); return;
      }

      case 'CallExpression': {
        if (!env.has('callee')) {
          env.enter('callee', node.callee); return;
        }

        if (!env.has('arguments')) {
          env.enter('arguments', { type: 'ArrayExpression', elements: node.arguments, }); return;
        }

        const [callee, arguments, __member] = env.get('callee', 'arguments', '__member');
        const thisArgument = __member ? __member.object : null;
        const result = callee.apply(thisArgument, arguments);
        env.leave(result); return;
      }

      case 'NewExpression': {
        if (!env.has('callee')) {
          env.enter('callee', node.callee); return;
        }

        if (!env.has('arguments')) {
          env.enter('arguments', { type: 'ArrayExpression', elements: node.arguments, }); return;
        }

        const [callee, arguments] = env.get('callee', 'arguments',);
        const object = new (callee.bind.apply(func, [null, ...arguments]));
        env.leave(object); return;
      }

      case 'SequenceExpression': {
        if (!env.has('expressions')) {
          env.enter('expressions', { type: 'ArrayExpression', elements: node.expressions }); return;
        }
        const [expressions] = env.get('expressions');
        env.leave(expressions[expressions.length - 1]); return;
      }
    }

    env.throw(new Error(`Unsorted Syntax ${node.type}`));
  } catch (exception) {
    env.throw(exception); // 运行时错误
  }
}


function evaluate(node, scope) {
  const env = new Env(node, scope);
  while (!env.finished) {
    step(env);
    if (env.error) {
      throw env.exception;
    }
  }
  return env.result;
}

function generatorEvaluate(node, scope) {
  const env = new Env(node, scope);
  let done = false;

  return {
    next(value) {
      if (done) {
        return { done, value: undefined };
      }

      if (env.current.node.type === 'YieldExpression') {
        env.set({ resume: value });
      }

      while (!env.finished) {
        if (runStep(env) === 'interrupt') {
          if (env.error) {
            throw env.exception;
          }
          const [yieldValue] = env.get('argument');
          return { done, value: yieldValue }
        }
      }
      done = true;
      return { done, value: env.result };
    },
    return(value) {
      done = true;
      return { done, value };
    },
    throw(exception) {
      if (done) {
        return { done, value: undefined };
      }
      env.throw(exception);
      return this.next();
    }
  };
}

function asyncEvaluate(node, scope) {
  return new Promise((resolve, reject) => {
    const gen = generatorEvaluate(node, scope);

    const step = (value) => {
      const { done, value } = gen.next(value);
      if (done) {
        resolve(value);
      } else {
        if (typeof value?.then === 'function') {
          value.then(step);
          value.catch(reject);
        } else {
          step(value);
        }
      };
    };

    step();
  })
}

const scope = new Scope({
  module: {
    exports: {}
  }
});

evaluate(acorn.parseExpressionAt(`{ array: [1 + 2 + 3] }`, 0, { ecmaVersion: 6 }), scope);


function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent);

  const node = acorn.parse(code, {
    ecmaVersion: 6
  })
  evaluate(node, scope);

  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}