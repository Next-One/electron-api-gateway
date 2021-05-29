const createApiClient = require('../../dist').createApiClient

window.apiManager = createApiClient({module: 'render1'})

const el = {
  add: document.querySelector('#add'),
  num: document.querySelector('#num'),
  sub: document.querySelector('#sub'),
  set: document.querySelector('#set'),
  num2: document.querySelector('#num2'),
  num3: document.querySelector('#num3'),
  double: document.querySelector('#double'),
  num4: document.querySelector('#num4'),
  half: document.querySelector('#half'),
  num5: document.querySelector('#num5'),
  three: document.querySelector('#three'),
  num6: document.querySelector('#num6'),
  four: document.querySelector('#four')
}


el.add.addEventListener('click', () => {
  window.apiManager.request('render2', 'add', el.num.value)
    .then(console.log)
    .catch(console.error)
})

el.sub.addEventListener('click', () => {
  window.apiManager.requestByKey('render2/sub', el.num.value)
    .then(console.log)
    .catch(console.error)
})

el.set.addEventListener('click', () => {
  window.apiManager.requestByKey('render2/set', el.num2.value)
    .then(console.log)
    .catch(console.error)
})

el.double.addEventListener('click', () => {
  window.apiManager.request('main', 'double', el.num3.value)
    .then((value) => {
      el.num3.value = value
    }).catch(console.error)
})


el.half.addEventListener('click', () => {
  window.apiManager.request('render2', 'half', el.num4.value)
    .then((value) => {
      el.num4.value = value
    }).catch(console.error)
})


el.three.addEventListener('click', () => {
  window.apiManager.request('render2', 'three', el.num5.value)
    .then((value) => {
      el.num5.value = value
    }).catch(console.error)
})

el.four.addEventListener('click', () => {
  window.apiManager.request('main', 'four', el.num6.value)
    .then((value) => {
      el.num6.value = value
    }).catch(console.error)
})


function add(value = 1) {
  return el.num.value = Number(el.num.value) + Number(value)
}


function sub(value = 1) {
  el.num.value = Number(el.num.value) - Number(value)
}

function set(value = 1) {
  el.num.value = value
}

function setColor(color = 'red') {
  console.log(color)
  document.body.style.color = color
}


window.apiManager.register('add', add).then(console.log).catch(console.error)
window.apiManager.register('sub', sub).then(console.log).catch(console.error)
window.apiManager.register('setColor', setColor).then(console.log).catch(console.error)
setTimeout(() => {
  window.apiManager.register('set', set).then(console.log).catch(console.error)
}, 2000)
window.apiManager.register('set', set).then(console.log).catch(console.error)

