const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("break with label", t => {
  const scope = new Scope();

  const i = customEval(
    `
var i = 1;
loop1:
while(true){
  i++;
  break loop1;
}

module.exports = i;
  `,
    scope
  );
  t.deepEqual(i, 2);
});

test("continue with label", t => {
  const scope = new Scope();

  const { i, arr } = customEval(
    `
var i = 10;
var arr = [];
loop1:
while(i > 0){
  if (i % 2 === 1){
    i--;    
    continue; 
  }
  arr.push(i);  
  i--;  
}

module.exports = {i, arr};
  `,
    scope
  );
  t.deepEqual(i, 0);
  t.deepEqual(arr, [10, 8, 6, 4, 2]);
});
