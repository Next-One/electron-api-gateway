const ApiRenderer = require('../dist/ApiRenderer').default

global.api = new ApiRenderer({
  module: 'nodeModule',
  moduleId: 'node1',
  clientType: 'SOCKET',
})

global.api.register('pow', function (num) {
  return num * 2
})

global.api.register('cos', function (num) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(num / 2), 1000)
  })
})

let count = 1

setInterval(() => {
  global.api.requestByKey('render2/three', count++)
    .then(console.log)
    .catch(console.error)
}, 1000 * 20)

