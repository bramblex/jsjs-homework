const customerEval = require('./eval')


const result = customerEval('((x,y)=>x+y)(2,3)');

console.log(result);