const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("if", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  isTrue: false
};

if (true){
  obj.isTrue = true;
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.isTrue === "boolean");
  t.true(obj.isTrue);
});

test("if-else", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  isTrue: false
};

if (false){
  obj.isTrue = true;
}else{
  obj.isTrue = true;
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.isTrue === "boolean");
  t.true(obj.isTrue);
});

test("if else-else if", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  block: ''
};

if (false){
  obj.block = "if";
}else if(true){
  obj.block = "else if";
}

module.exports = obj;
  `,
    scope
  );

  t.deepEqual(obj.block, "else if");
});

test("if-else-else if-else", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  block: ''
};

if (false){
  obj.block = "if";
}else if(false){
  obj.block = "else if";
}else{
  obj.block = "else";
}

module.exports = obj;
  `,
    scope
  );

  t.deepEqual(obj.block, "else");
});
