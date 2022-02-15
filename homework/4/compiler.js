const acorn = require('acorn')

function traverse(node, env) {
  switch (node.type) {
    // TODO: 补全作业代码
    // env.stats.push(<指令>)
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function compile(sourceCode) {
  const stats = [];
  const root = acorn.parse(sourceCode, { ecmaVersion: 6 })
  traverse(root, { stats })
  return stats;
}

module.exports = compile;