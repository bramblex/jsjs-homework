console.log(
  eval(
    `
  var global = "world"  // context can not be rewrite
module.exports = global;
`
  )
);
