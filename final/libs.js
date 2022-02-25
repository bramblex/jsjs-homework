/**
 * 同步执行生成器直到 return
 * @param {Generator} generator 生成器
 * @returns 包装函数
 */
exports.asyncToGenerator = function (generator) {
  return function () {
    let that = this;
    let args = arguments;

    return new Promise((resolve, reject) => {
      let gen = generator.apply(that, args);

      function _next(val) {
        try {
          var res = gen.next(val);
        } catch (error) {
          return reject(error);
        }

        if (res.done) {
          resolve(res.value);
        } else {
          Promise.resolve(res.value).then(
            (val) => _next(val),
            (err) => gen.throw(err)
          );
        }
      }

      _next();
    });
  };
};

/**
 * 修改对象 obj 上的不可变变量
 * @param {Object} obj
 * @param {String} prop
 * @param {String} val
 */
exports.setObjProperty = function (obj, prop, val) {
  Object.defineProperty(obj, prop, {
    get() {
      return val;
    },
  });
};

/**
 * class MyPromise 手写Promise，暂未用上
 * */

const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

exports.MyPromise = class MyPromise {
  constructor(execute) {
    try {
      execute(this._resolve, this._reject);
    } catch (error) {
      this._reject(error);
    }
  }

  _status = PENDING;
  _value = undefined;

  _resolveQueues = [];
  _rejectQueues = [];

  _resolve = (val) => {
    if (this._status === PENDING) {
      this._status = FULFILLED;
      this._value = val;
      while (this._resolveQueues.length) {
        this._resolveQueues.shift()(val);
      }
    }
  };

  _reject = (err) => {
    if (this._status === PENDING) {
      this._status = REJECTED;
      this._value = err;
      while (this._rejectQueues.length) {
        this._rejectQueues.shift()(err);
      }
    }
  };

  then(onResovle, onReject) {
    const { _status, _value } = this;
    return new MyPromise((resolveNext, rejectNext) => {
      const resolveFunc = (val) => {
        setImmediate(() => {
          try {
            let ret = onResovle(val);
            if (ret instanceof MyPromise) {
              ret.then(resolveNext, rejectNext);
            } else {
              resolveNext(val);
            }
          } catch (error) {
            rejectNext(error);
          }
        });
      };
      const rejectFunc = (val) => {
        setImmediate(() => {
          try {
            let ret = onReject(val);
            if (ret instanceof MyPromise) {
              ret.then(resolveNext, rejectNext);
            } else {
              resolveNext(ret);
            }
          } catch (error) {
            rejectNext(error);
          }
        });
      };
      switch (_status) {
        case PENDING:
          this._resolveQueues(resolveFunc);
          this._rejectQueues(rejectFunc);
          break;
        case FULFILLED:
          resolveFunc(_value);
          break;
        case REJECTED:
          rejectFunc(_value);
          break;
      }
    });
  }

  resolve(val) {
    if (val instanceof MyPromise) return val;
    else return new MyPromise((resolve) => resolve(val));
  }

  reject(val) {
    return new MyPromise((resolve, reject) => reject(val));
  }
};
