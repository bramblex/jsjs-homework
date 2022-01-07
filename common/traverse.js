
const isNode = target =>
  target && typeof target.type === 'string';

const isNodeArray = target =>
  Array.isArray(target) && target[0] && isNode(target[0]);

const isChildNode = target =>
  isNodeArray(target) || isNode(target);

const getChildrenKeys = node =>
  Object.keys(node).filter(key => isChildNode(node[key]));

const traverseChildren = func => (node, ctx) => {
  if (isNode(node)) {
    for (const key of getChildrenKeys(node)) {
      if (Array.isArray(node[key])) {
        for (let i = 0; i < node[key].length; i++) {
          node[key][i] = node[key][i] && func(node[key][i], ctx);
        }
      } else {
        node[key] = func(node[key], ctx);
      }
    }
  }
  return node;
}

const traverse = func => {
  const _traverse = (node, ctx) => func(node, ctx, _traverseChildren);
  const _traverseChildren = traverseChildren(_traverse);
  return _traverse;
};

module.exports = traverse;