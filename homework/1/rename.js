const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');
const isNode = target =>
  target && typeof target.type === 'string';
const nodeMap= new Map([
  //函数声明
['FunctionDeclaration',['id']],
//变量声明
['VariableDeclarator',['id']],
//二元运算表达式节点
['BinaryExpression',['left','right']],
//赋值表达式节点
['AssignmentExpression',['left','right']],
//逻辑运算表达式节点
['LogicalExpression',['left','right']],
//成员表达式节点
['MemberExpression',['object']],
//对象表达式中的属性节点
['Property',['value']],
//一元运算表达式节点
['UnaryExpression',['argument']],
//update 运算表达式节点(++,--)
['UpdateExpression',['argument']],
//条件表达式，三元运算表达式
['ConditionalExpression',['alternate','consequent']],
//函数调用表达式
['CallExpression',['callee','arguments']],
//逗号运算符构建的表达式
['SequenceExpression',['expressions']],
])


function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    if(nodeMap.has(node.type)){
      let list=nodeMap.get(node.type);
      for(const index in list){
        let child=list[index];
        if(node[child].type==='Identifier' && node[child].name===originName){
          node[child].name=targetName;
        }
      }
    }

    // 继续往下遍历
    return next(node, ctx);
  })(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  });

  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename;
