const test = require("ava");
const { customEval, Scope } = require("../../eval");

test("ThisExpression", (t) => {
  const scope = new Scope();

  const func = customEval(
    `
function t(){
  this.name = "hello";
  return this;
}

module.exports = t;
  `,
    scope
  );

  const ctx = {};

  func.call(ctx);

  t.deepEqual(ctx.name, "hello");
});

test("ThisNestExpression", (t) => {
  const func = customEval(`
    function f(){
      let b = 1;
      let a = {
        b:2,
        c: ()=>{
          if(this) this.b += 1
        },
        d: function() {
          if(this) this.b += 1
        }
      }
      a.d();
      return [a.b , b];
    }
    module.exports = f;
  `);
  t.deepEqual(func(), [3, 1]);
});
