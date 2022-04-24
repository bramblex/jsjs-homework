const Scope = require('./scope')
const eval = require('./eval')
// 由于引入 evaluate 出现了些问题，所以该文件暂时废弃
// const evaluate = eval.evaluate
console.log(eval, 'eval');

function hoisting(node, scope) {
  switch (node.type) {
    case 'Program':{
      node.body.forEach(v => {
        if (v.type === 'VariableDeclaration') hoisting(v,scope)
      })
      return
    }
    case 'FunctionExpression': {
      node.body.body.forEach(v => {
        if (v.type === 'VariableDeclaration') hoisting(v,scope)
        if (v.type === 'FunctionDeclaration') hoisting(v,scope)
      })
      return
    }
    case 'VariableDeclaration':{
      node.declarations.forEach(v => {
        if (node.kind === 'var')
        scope.declare(node.kind, v.id.name)
      })
      return
    }
    case 'FunctionDeclaration':{
      let f = function (...args) {
        let childScope = new Scope({}, scope, 'function')
        node.params.map((v, index) => {
          childScope.variables[v.name] = args[index]
          childScope.isDefine[v.name] = 'let'
        })
        return evaluate(node.body, childScope)
      }
      Object.defineProperty(f, 'name', { value: node.id.name })
      Object.defineProperty(f, 'length', { value: node.params.length })
      scope.declare('var', node.id.name)
      scope.set(node.id.name, f)
      return f
    }
  }
}

module.exports = hoisting
