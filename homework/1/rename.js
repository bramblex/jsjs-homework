const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  const parentNodeStack = []; // stores ancestors
  const isNode = target =>
    target && typeof target.type === 'string';
  const isNodeArray = target =>
    Array.isArray(target) && target[0] && isNode(target[0]);
  const isChildNode = target =>
    isNodeArray(target) || isNode(target);
  const getChildrenKeys = node =>
    Object.keys(node).filter(key => isChildNode(node[key]));
  const isParent = (parent, child) => {
    for (const key of getChildrenKeys(parent)) {
      if (Array.isArray(parent[key])) {
        for (let i = 0; i < parent[key].length; i++) {
          if (parent[key][i] === child) { return [true, key] }
        }
      } else {
        if (parent[key] === child) { return [true, key] }
      }
    }
    return [false, ''];
  }

  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    // find parent and propertyName
    let parent = null, propertyName = ''
    while (parentNodeStack.length > 0) {
      parent = parentNodeStack[parentNodeStack.length - 1]
      let res = isParent(parent, node)
      propertyName = res[1]
      if (res[0]) {
        break
      } else {
        parent = null
        propertyName = ''
        parentNodeStack.pop();
      }
    }
    // console.log(node.type);
    // 模式：type === 'Identifier' 可能是变量名(包括函数名)、属性名、标签。
    // 标签的话会是'label'作为propertyName
    // 属性名在对象声明时，会是'key'作为propertyName
    // 属性名在对象的属性表达式时，会是'property'作为propertyName
    if (node.type === 'Identifier' && node.name === originName && parent !== null && propertyName !== 'property' && propertyName !== 'label' && propertyName !== 'key') {
      // console.log('node:' + node.type);
      // console.log(parent === null ? 'null' : 'parent:' + parent.type);
      // console.log(propertyName);
      node.name = targetName;
    }

    // update parentNodeStack
    parentNodeStack.push(node);

    // 继续往下遍历
    return next(node, ctx)
  })(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  })
  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename