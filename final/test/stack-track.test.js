const test = require('ava');
const { customEval, Scope } = require('../eval');

test("not defined", t => {
  const scope = new Scope();

  try {
    customEval(
      `function get(){
  var a = 123;
  console.log(b);
}
  
get();`,
      scope
    );
    t.fail("it should throw an error");
  } catch (err) {
    // ignore
  }
});
