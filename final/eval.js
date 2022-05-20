const acorn = require('acorn');
const Scope = require('./scope');

function evaluate(node, env) {
  return evaluate_(node, env).next().value;
}

//构造器函数
function* evaluate_(node, env) {
  switch (node.type) {
    case 'Literal': {
      return node.value;
    }
    case 'Identifier': {
      //undefined不是字面量
      if (node.name === 'undefined') return undefined;
      return env.get(node.name);
    }
    //本来使用generator后函数似乎是应该递归改循环的，但感觉有些积重难返，
    //所以仅仅对可能出现yield的地方进行了完善，这样写肯定是不完备的
    case 'BinaryExpression': {
      let left_ = evaluate_(node.left, env);
      let right_ = evaluate_(node.right, env);

      while (true) {
        left = left_.next();
        if (left?.done) {
          left = left.value;
          break;
        }
        else yield left.value;
      }
      while (true) {
        right = right_.next();
        if (right?.done) {
          right = right.value;
          break;
        }
        else yield right.value;
      }

      switch (node.operator) {
        case '-': return left - right;
        case '+': return left + right;
        case '*': return left * right;
        case '/': return left / right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        case '<': return left < right;
        case '>': return left > right;
        case '%': return left % right;
        case '==': return left == right;
        case '!=': return left != right;
        case '===': return left === right;
        case '!==': return left !== right;
        case '<<': return left << right;
        case '>>': return left >> right;
        case '>>>': return left >>> right;
        case '**': return left ** right;
        case 'instanceof': return left instanceof right;
      }
    }
    case 'LogicalExpression': {
      let left = evaluate_(node.left, env).next().value;
      let right = evaluate_(node.right, env).next().value;
      switch (node.operator) {
        case '&&': return left && right;
        case '||': return left || right;
        case '&': return left & right;
        case '|': return left | right;
      }
    }
    //注意对象连续赋值时指针指向问题，在预编译阶段被赋值对象的指针指向就已经确定了
    case 'AssignmentExpression': {
      //如果是MemberExpression，先把被赋值对象拿出来
      let continuous = node.right.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' ?
        env.getobject(node.left) : undefined;
      let right = evaluate_(node.right, env).next().value;
      switch (node.operator) {
        case '=': return env.set(node.left, right, continuous);
        case '+=': return env.set(node.left, evaluate_(node.left, env).next().value + right, continuous);
        case '-=': return env.set(node.left, evaluate_(node.left, env).next().value - right, continuous);
        case '*=': return env.set(node.left, evaluate_(node.left, env).next().value * right, continuous);
        case '/=': return env.set(node.left, evaluate_(node.left, env).next().value / right, continuous);
        case '%=': return env.set(node.left, evaluate_(node.left, env).next().value % right, continuous);
      }
    }
    case 'UpdateExpression': {
      switch (node.operator) {
        case '++': return node.prefix ? evaluate_(node.argument, env).next().value : env.set(node.argument, evaluate_(node.argument, env).next().value + 1);
        case '--': return node.prefix ? evaluate_(node.argument, env).next().value : env.set(node.argument, evaluate_(node.argument, env).next().value - 1);
      }
    }
    case 'UnaryExpression': {
      switch (node.operator) {
        case 'typeof': {
          let a;
          try {
            a = typeof evaluate_(node.argument, env).next().value;
          } catch (e) {
            a = 'undefined';
          }
          return a;
        }
        case 'void': return void evaluate_(node.argument, env).next().value;
        case 'delete': {
          if (node.argument.type !== 'MemberExpression') throw new Error(`Delete Error: Argument of type ${node.type} cannot be delete`)
          else if (node.argument.computed) {
            return delete evaluate_(node.argument.object, env).next().value[evaluate_(node.argument.property, env).next().value]
          }
          else {
            return delete evaluate_(node.argument.object, env).next().value[node.argument.property.name]
          }
        }
        case '!': return !evaluate_(node.argument, env).next().value;
        case '+': return +evaluate_(node.argument, env).next().value;
        case '-': return -evaluate_(node.argument, env).next().value;
        case '~': return ~evaluate_(node.argument, env).next().value;
      }
    }
    //注意memberexpression
    case 'CallExpression': {
      let args = node.arguments.map(arg => evaluate_(arg, env).next().value);
      let callee = evaluate_(node.callee, env).next().value;
      if (node.callee.type === 'MemberExpression') {
        let obj = evaluate_(node.callee.object, env).next().value;
        return callee.apply(obj, args);
      }
      else {
          return callee(args);    
      }
    }
    case 'NewExpression': {
      let func = evaluate_(node.callee, env).next().value;
      let args = node.arguments.map((arg) => evaluate_(arg, env).next().value);
      env.variable['newtarget'] = func; //返回构造函数
      return new (func.bind.apply(func, [null].concat(args)));
    }
    //new.target，没有想到很好的实现方法，只能到scope中去找
    case 'MetaProperty': {
      try {
        return env.get('newtarget');
      }
      catch (err) {
        return undefined;
      }
    }
    case 'IfStatement': {
      if (evaluate_(node.test, env).next().value) return evaluate_(node.consequent, env).next().value;
      else return node.alternate ? evaluate_(node.alternate, env).next().value : undefined
    }
    case 'WhileStatement': {
      let return_;
      while (evaluate_(node.test, env).next().value) {
        return_ = evaluate_(node.body, env).next().value
        //如果return_有type属性代表它是continue, return或break，执行相应操作，下同
        if (return_ && return_.type) {
          //找label
          if (return_.label && (!node.label || node.label && return_.label !== node.label))
            return return_;
          else if (return_.type === 'continue') continue;
          else if (return_.type === 'return') return return_;
          else if (return_.type === 'break') break;
        }
      }
      return;
    }
    case 'DoWhileStatement': {
      let return_;
      do {
        return_ = evaluate_(node.body, env).next().value
        if (return_ && return_.type) {
          if (return_.label && (!node.label || node.label && return_.label !== node.label))
            return return_;
          else if (return_.type === 'continue') continue;
          else if (return_.type === 'return') return return_;
          else if (return_.type === 'break') break;
        }
      } while (evaluate_(node.test, env).next().value);
      return;
    }
    case 'ForStatement': {
      let return_;
      let forscope = new Scope({}, env, 'block')
      for (node.init && evaluate_(node.init, forscope).next().value;
        node.test ? evaluate_(node.test, forscope).next().value : true;
        node.update && evaluate_(node.update, forscope).next().value) {
        return_ = evaluate_(node.body, forscope).next().value;
        if (return_ && return_.type) {
          if (return_.label && !node.label || return_.label && node.label && return_.label !== node.label)
            return return_;
          else if (return_.type === 'continue') continue;
          else if (return_.type === 'return') return return_;
          else if (return_.type === 'break') break;
        }
      }
      return;
    }
    case 'SwitchStatement': {
      const discriminant = evaluate_(node.discriminant, env).next().value;
      const switchscope = new Scope({}, env, 'block');
      let return_;
      for (const i of node.cases) {
        if (i.test && evaluate_(i.test, switchscope).next().value === discriminant || !i.test) {
          let return_;
          for (const c of i.consequent) {
            return_ = evaluate_(c, switchscope).next().value;
            if (return_ && return_.type) {
              return return_;
            }
          }
        }
      }
      return return_;
    }
    case 'ConditionalExpression': {
      return evaluate_(node.test, env).next().value ? evaluate_(node.consequent, env).next().value : evaluate_(node.alternate, env).next().value;
    }
    case 'ExpressionStatement': {
      let return_, generator;
      generator = evaluate_(node.expression, env);
      while (true) {
        return_ = generator.next();
        if (return_?.done) {
          return return_.value;
        }
        else yield return_.value;
      }
    }
    case 'ThisExpression': {
      try {
        return env.get('this');
      }
      catch (err) {
        return undefined;
      }
    }
    case 'ObjectExpression': {
      let obj = {};
      node.properties.forEach(p => {
        let v = p.value;
        if (p.value.type === 'FunctionExpression') v.name = p.key.name;
        value = evaluate_(v, env).next().value;
        if (p.kind === 'init') obj[p.key.name] = value;
        else if (p.kind === 'get') obj.__defineGetter__(p.key.name, value);
        else if (p.kind === 'set') obj.__defineSetter__(p.key.name, value);
      })
      return obj;
    }
    case 'MemberExpression': {
      //[] or .
      if (node.computed) return evaluate_(node.object, env).next().value[evaluate_(node.property, env).next().value];
      else return evaluate_(node.object, env).next().value[node.property.name];
    }
    case 'ArrayExpression': {
      return node.elements.map(e => evaluate_(e, env).next().value)
    }
    case 'FunctionExpression': {
      const a = function (...args) {
        //有this
        const env_ = new Scope({ 'this': this }, env, 'function')
        node.params.forEach((p, i) => {
          env_.declare('let', p.name, args[i]);
        })
        const a = evaluate_(node.body, env_).next().value;
        if (a && a?.type === 'return') return a.value;
        else return a;
      };
      //用Proxy拦截
      const handler = new Proxy(a, {
        get(target, name) {
          if (name === 'length') return node.params.length;
          else if (name === 'name') {
            if (node?.id?.name) return node.id.name;
            else if (node?.name) return node.name;
            else return ""
          }
          else return target[name];
        }
      })

      return handler;
    }
    case 'ArrowFunctionExpression': {
      const a = (...args) => {
        //没有this
        const env_ = new Scope({}, env, 'function')
        node.params.forEach((p, i) => {
          env_.declare('let', p.name, args[i]);
        })
        const a = evaluate_(node.body, env_).next().value;
        if (a && a?.type === 'return') return a.value;
        else return a;
      };
      const handler = new Proxy(a, {
        get(target, name) {
          if (name === 'length') return node.params.length;
          else if (name === 'name') {
            if (node?.id?.name) return node.id.name;
            else return ""
          }
          else return target[name];
        }
      })

      return handler;
    }
    //从左至右结合
    case 'SequenceExpression': {
      return node.expressions.reduce((_, expression) => evaluate_(expression, env).next().value, {});
    }
    case 'ContinueStatement': {
      return { 'type': 'continue', 'label': node?.label?.name }
    }
    case 'BreakStatement': {
      return { 'type': 'break', 'label': node?.label?.name }
    }
    case 'ReturnStatement': {
      return {
        type: 'return',
        value: evaluate_(node.argument, env).next().value
      }
    }
    case 'VariableDeclaration': {
      for (const vd of node.declarations) {
        let generator, init;
        if (vd.init) {
          generator = evaluate_(vd.init, env);
          //yield不仅可以在表达式各种"Expression"中使用，还可以出现在变量声明中
          while (true) {
            init = generator.next();
            if (init?.done) {
              init = init.value;
              break;
            }
            else yield init.value;
          }
        }
        env.declare(node.kind, vd.id.name, init)
      }
      return;
    }
    case 'LabeledStatement': {
      node.body.label = node.label.name;
      return evaluate_(node.body, env).next().value;
    }
    case 'ThrowStatement': {
      throw evaluate_(node.argument, env).next().value;
    }
    case 'TryStatement': {
      let try_, catch_, final_;
      try {
        try_ = evaluate_(node.block, env).next().value;
      } catch (err) {
        if (node.handler) {
          const errorscope = new Scope({}, env, 'block');
          errorscope.declare('let', node.handler.param.name, err);
          catch_ = evaluate_(node.handler, errorscope).next().value;
        }
      } finally {
        if (node.finalizer) final_ = evaluate_(node.finalizer, env).next().value;
      }
      return catch_ || try_ || final_ ;
    }
    case 'CatchClause': {
      return evaluate_(node.body, env).next().value;
    }
    case 'AwaitExpression':
    case "YieldExpression": {
      yield evaluate_(node.argument, env).next().value;
      return;
    }
    case 'BlockStatement': {
      //创建作用域
      const blockscope = new Scope({}, env, 'block');
      declaration(node, blockscope);
      let return_, generator;
      //遍历块中的每条语句，直到return或循环结束
      for (const node_ of node.body) {
        if (node_.type === 'FunctionDeclaration') continue;
        generator = evaluate_(node_, blockscope);
        while (true) {
          return_ = generator.next();
          if (return_?.done) {
            return_ = return_.value;
            break;
          }
          else yield return_.value;
        }
        if (return_ && return_.type)
          return return_
      }
      return;
    }
    case 'Program': {
      declaration(node, env);
      let return_;
      for (const node_ of node.body) {
        //函数已被提升，pass
        if (node_.type === 'FunctionDeclaration') continue;
        return_ = evaluate_(node_, env).next().value;
        if (return_ && return_.type === 'return') return return_.value;
      }

      return return_;
    }
    // TODO: 补全作业代码
  }

  throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

//function和var的提升
function declaration(node_, env) {
  node_.body.forEach(node => {
    switch (node.type) {
      //var的提升
      //let和const也有提升，但所谓的“死区”不知道如何实现，遂干脆不写
      case 'VariableDeclaration': {
        if (node.kind === 'var')
          return node.declarations.forEach(vd => {
            //仅声明不初始化，undefined
            env.declare(node.kind, vd.id.name, undefined)
          })
        else return;
      }
      //提升函数声明
      case 'FunctionDeclaration': {
        let function_;
        //生成器函数
        if (node.generator) {
          function_ = function* (...args) {
            const env_ = new Scope({ 'this': this }, env, 'function')
            node.params.forEach((p, i) => {
              env_.declare('let', p.name, args[i]);
            })
            let generator = evaluate_(node.body, env_);
            let a;
            //直到done === true
            while (true) {
              a = generator.next();
              if (a?.done) {
                a = a.value;
                break;
              }
              else yield a.value;
            }
            if (a && a?.type === 'return') return a.value
            else return a;
          }
        }
        //async
        //Referrence：https://juejin.cn/post/6844904102053281806
        else if (node.async) {
          //先转换为生成器
          let generator = function* (...args) {
            const env_ = new Scope({ 'this': this }, env, 'function')
            node.params.forEach((p, i) => {
              env_.declare('let', p.name, args[i]);
            })
            let generator_ = evaluate_(node.body, env_);
            let a;
            while (true) {
              a = generator_.next();
              if (a?.done) {
                a = a.value;
                break;
              }
              else yield a.value;
            }
            if (a && a?.type === 'return') return a.value
            else return a;
          }
          function_ = function () {
            const gen = generator();
            return new Promise((resolve, reject) => {
              const next_ = (key, arg) => {
                let return_;
                try {
                  return_ = gen[key](arg);
                } catch (err) {
                  //如果报错就reject
                  return reject(err);
                }
                //完成则resolve
                if (return_.done) return resolve(return_.value);
                else {
                  //迭代，一步一步执行到每一个yield
                  return Promise.resolve(return_.value).then(
                    (value) => {
                      next_('next', value);
                    },
                    //try gen['throw'](err)，被catch到，接着reject
                    (err) => {
                      next_('throw', err);
                    }
                  )
                }
              }
              next_('next');
            })
          }
        }
        //普通函数
        else {
          function_ = function (...args) {
            const env_ = new Scope({ 'this': this }, env, 'function')
            node.params.forEach((p, i) => {
              env_.declare('let', p.name, args[i]);
            })
            const a = evaluate_(node.body, env_).next().value;
            if (a && a?.type === 'return') return a.value
            else return a;
          }
        }
        //这里不能像functionexpression那样用Proxy，否则定义的函数对象的constructor
        //和函数对象的constructor不一致
        Object.defineProperty(function_, "name", {
          get() {
            if (node?.id?.name) return node.id.name;
            else return ""
          },
        });
        Object.defineProperty(function_, "length", {
          get() {
            return node.params.length;
          },
        });

        return env.declare('let', node.id.name, function_);
      }
    }
  })
}

function customEval(code, parent) {

  const scope = new Scope({
    module: {
      exports: {}
    }
  }, parent);

  const node = acorn.parse(code, {
    ecmaVersion: 8
  })
  evaluate(node, scope);
  return scope.get('module').exports;
}

module.exports = {
  customEval,
  Scope,
}