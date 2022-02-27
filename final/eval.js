const acorn = require('acorn');

class Scope {
  constructor(initial /* 初始化变量 */, parent) {
  }
}

function evaluate(node, scope) {
  switch (node.type) {
    case 'Literal':
    // TODO: 补全作业代码
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

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