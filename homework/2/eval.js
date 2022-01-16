const acorn = require('acorn');

function evaluate(node, env) {
  switch (node.type) {
    case 'Literal':
    // TODO: 补全作业代码
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
  const node = acorn.parseExpressionAt(code, 0, {
    ecmaVersion: 6
  })
  console.log(node)
  // return evaluate(node, env)
}

module.exports = customerEval
