

const https = require('http')
var FormData = require('form-data');
var data = new FormData();
data.append('login', '' + Math.floor(Math.random() * 10000));
data.append('password', '' + Math.floor(Math.random() * 10000));
data.append('action', 'save');
const options = {
  method: 'POST',
  body: `login=${Math.floor(Math.random() * 10000000)}&password=${Math.floor(Math.random() * 10000000)}&action=save`,
}

const req = https.request('http://a2db3491ac4feda13f93f960f52fa522.ctf.bytedance.net/user/register', 
options, res => {
  console.log(`状态码: ${res.statusCode}`)
    console.log(res.headers);
  res.on('data', d => {
    process.stdout.write(d)
  })
})

req.on('error', error => {
  console.error(error)
})

req.write(JSON.stringify(data));
req.end()
