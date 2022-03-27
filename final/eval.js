'use strict';
const acorn = require('acorn');
const Scope = require('./scope');
const Env = require('./env');

function runStep(env) {
  // const current = _top();
  // function _eval(node, returnKey = 'lastReturn', scope = current.scope) {
  //   current.context.__returnKey = returnKey;
  //   stack.push({ node, scope: scope, context: {} });
  // }

  // function _return(result, appends = {}) {
  //   stack.pop();
  //   const current = _top();
  //   current.context[current.context.__returnKey] = result;
  //   Object.assign(current.context, appends);
  // }

  // function _top() {
  //   return stack[stack.length - 1];
  // }

  // const { node, scope, context } = current;
  // switch (node.type) {

  //   // Atom 表达式
  //   case 'Identifier': {
  //     return _return(scope.get(node.name));
  //   }

  //   case 'Literal': {
  //     return _return(node.value);
  //   }

  //   // 基本表达式
  //   case 'ThisExpression': {
  //     return _return(scope.get('this'));
  //   }

  //   case 'ArrayExpression': {
  //     context.i = context.i || 0;
  //     context.value = context.value || [];

  //     if (context.i > 0) {
  //       context.value.push(context.lastReturn);
  //     }

  //     if (context.i < node.elements.length) {
  //       return _eval(node.elements[context.i++]);
  //     }
  //     return _return(context.value);

  //   }

  //   case 'ObjectExpression': {
  //     context.i = context.i || 0;
  //     context.values = context.values || [];

  //     if (context.i > 0) {
  //       context.values.push(context.lastReturn);
  //     }

  //     if (context.i < node.properties.length * 2) {
  //       const p = node.properties[Math.floor(context.i / 2)];
  //       if (context.i % 2 == 0) {
  //         context.lastReturn = p.key.name;
  //       } else {
  //         _eval(p.value)
  //       }
  //       context.i++;
  //       return;
  //     }

  //     const object = {};
  //     for (let i = 0; i < node.properties.length * 2; i += 2) {
  //       object[context.values[i]] = context.values[i + 1];
  //     }
  //     return _return(object);
  //   }

  //   case 'FunctionExpression': {
  //   }

  //   case 'UnaryExpression': {
  //     if (!('argument' in context)) {
  //       return _eval(node.argument, 'argument');
  //     }
  //     if (node.operator === 'delete') {
  //       if (node.argument.type === 'Identifier') {
  //         context.property = node.argument.name;
  //         context.object = scope.get('this');
  //         if (!context.object) {
  //           return _return(true)
  //         }
  //       } else if (node.argument.type === 'MemberExpression') {
  //         if (!('argument' in context)) {
  //           return _eval(node.argument, 'argument');
  //         }
  //         const { _member: { object, property } } = context;
  //         context.object = object;
  //         context.property = property;
  //       } else {
  //         return _return(true);
  //       }

  //       const { object, property } = context;
  //       delete object[property];
  //       return _return(true)
  //     } else {
  //       const { argument } = context;
  //       switch (node.operator) {
  //         case "-": return _return(-argument);
  //         case "+": return _return(+argument);
  //         case "~": return _return(~argument);
  //         case "!": return _return(!argument);
  //         case "typeof": return _return(typeof argument);
  //         case "void": return _return(void argument);
  //       }
  //     }
  //   }

  //   case 'UpdateExpression': {
  //     if (!('argument' in context)) {
  //       return _eval(node.argument, 'argument');
  //     }

  //     if (node.argument.type === 'Identifier') {
  //       const { argument } = context;
  //       switch (node.operator) {
  //         case '++': scope.set(node.argument.name, argument + 1);
  //         case '--': scope.set(node.argument.name, argument - 1)
  //       }
  //     } else if (node.argument.type === 'MemberExpression') {
  //       const { _member: { object, property } } = context;
  //       context.argument = object[property];
  //       const { argument } = context;
  //       switch (node.operator) {
  //         case '++': object[property] = argument + 1;
  //         case '--': object[property] = argument - 1;
  //       }
  //     }

  //     const { argument } = context;
  //     switch (node.operator) {
  //       case '++': return _return(node.prefix ? argument + 1 : argument);
  //       case '--': return _return(node.prefix ? argument - 1 : argument);
  //     }
  //   }

  //   case 'BinaryExpression': {
  //     if (!('left' in context)) {
  //       return _eval(node.left, 'left');
  //     } else if (!('right' in context)) {
  //       return _eval(node.right, 'right');
  //     }

  //     const { left, right } = context;
  //     switch (node.operator) {
  //       case "==": return _return(left == right);
  //       case "!=": return _return(left != right);
  //       case "===": return _return(left === right);
  //       case "!==": return _return(left !== right);
  //       case "<": return _return(left < right);
  //       case "<=": return _return(left <= right);
  //       case ">": return _return(left > right);
  //       case ">=": return _return(left >= right);
  //       case "<<": return _return(left << right);
  //       case ">>": return _return(left >> right);
  //       case ">>>": return _return(left >>> right);
  //       case "+": return _return(left + right);
  //       case "-": return _return(left - right);
  //       case "*": return _return(left * right);
  //       case "/": return _return(left / right);
  //       case "%": return _return(left % right);
  //       case "|": return _return(left | right);
  //       case "^": return _return(left ^ right);
  //       case "&": return _return(left & right);
  //       case "in": return _return(left in right);
  //       case "instanceof": return _return(left instanceof right);
  //     }
  //   }

  //   case 'AssignmentExpression': {
  //   }

  //   case 'LogicalExpression': {
  //   }

  //   case 'MemberExpression': {
  //     if (!('object' in context)) {
  //       return _eval(node.object, 'object');
  //     } else if (!('property' in context)) {
  //       if (node.computed) {
  //         return _eval(node.property, 'property');
  //       }
  //       context.property = node.property.name;
  //     }

  //     const { object, property } = context;
  //     return _return(object[property], { _member: { object, property } });
  //   }

  //   // 基本指令

  // }
}

function evaluate(node, scope) {
  const env = new Env(node, scope);
  while (!env.finished) {
    runStep(env);
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
        env.setValue('resumeArgument', value);
      }

      while (!env.finished) {
        if (runStep(env) === 'interrupt') {
          if (env.error) {
            throw env.exception;
          }
          return { done, value: env.getValue('argument') }
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