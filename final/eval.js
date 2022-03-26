const acorn = require('acorn');

class Scope {
  constructor(initial /* 初始化变量 */, parent) {
  }
}

function step(stack) {
  const current = _top();

  function _eval(node, scope = current.scope) {
    stack.push({ node, scope: scope, context: {} });
  }

  function _return(result) {
    stack.pop();
    const current = _top();
    current.lastReturn = result;
  }

  function _break(label) {
  }

  function _continue(label) {
  }

  function _throw(error) {
  }

  function _top() {
    return stack[stack.length - 1];
  }

  const { node, scope, context, lastReturn } = current;
  try {
    switch (node.type) {

      // Atom 表达式
      case 'Identifier':
        return _return(scope.get(node.name));
      case 'Literal':
        return _return(node.value);
      case 'ThisExpression':
        return _return(scope.get('this'));

      // 数据构造表达式
      case 'ArrayExpression': {
        context.i = context.i || 0;
        context.value = context.value || [];

        if (context.i > 0) {
          context.value.push(lastReturn);
        }

        if (context.i < node.elements.length) {
          return _eval(node.elements[context.i++], scope);
        }
        return _return(context.value);

      }

      case 'ObjectExpression': {
        context.i = context.i || 0;
        context.values = context.values || [];

        if (context.i > 0) {
          context.values.push(lastReturn);
        }

        if (context.i < node.properties.length * 2) {
          const p = node.properties[Math.floor(context.i / 2)];
          if (context.i % 2 == 0) {
            _eval(p.computed ? p.key : { type: 'Literal', value: p.key.name });
          } else {
            _eval(p.value)
          }
          context.i++;
          return;
        }

        const object = {};
        for (let i = 0; i < node.properties.length * 2; i += 2) {
          object[context.values[i]] = context.values[i + 1];
        }
        return _return(object);
      }

      // 一元运算表达式
      case 'UnaryExpression': {
        context.i = context.i || 0;
        if (node.operator === 'delete') {
          // TODO:
          // if (node.argument.type === 'Identifier') {
          // } else if (node.argument.type === 'MemberExpression') {
          // } else {
          //   return _return(true);
          // }
        } else {
          if (context.i > 0) {
            switch (node.operator) {
              case '-': return _return(-lastReturn);
              case '+': return _return(+lastReturn);
              case '!': return _return(!lastReturn);
              case '~': return _return(~lastReturn);
              case 'void': return _return(void lastReturn);
              case 'typeof': return _return(typeof lastReturn);
            }
            throw new Error('Unknown operator: ' + node.operator);
          } else {
            _eval(node.argument);
            context.i++;
            return
          }
        }
      }

      case 'UpdateExpression': {
        // @TODO:
        return
      }

      // 函数表达式
      case 'FunctionExpression': {
        // @TODO:
        return
      }
    }
  } catch (err) {
    _throw(err);
  }
}

function evaluate(node, scope) {
  const stack = [{}];
  stack.push({ node, scope, context: {} });

  while (stack.length > 1) {
    step(stack);
  }

  return stack[0].lastReturn;
}

const scope = new Scope({
  module: {
    exports: {}
  }
});

evaluate(acorn.parseExpressionAt(`{ a: '123', b: '123', c: 123, [123]: 123 }`, 0, { ecmaVersion: 6 }), scope);


// function customEval(code, parent) {

//   const scope = new Scope({
//     module: {
//       exports: {}
//     }
//   }, parent);

//   const node = acorn.parse(code, {
//     ecmaVersion: 6
//   })
//   evaluate(node, scope);

//   return scope.get('module').exports;
// }

// module.exports = {
//   customEval,
//   Scope,
// }