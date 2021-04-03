const ApiRenderer = require('../../dist/ApiRenderer').default

window.apiManager = new ApiRenderer({module: 'render2'})

const el = {
  add: document.querySelector('#add'),
  num: document.querySelector('#num'),
  sub: document.querySelector('#sub'),
  set: document.querySelector('#set'),
  num2: document.querySelector('#num2'),
  destroyAdd1: document.querySelector('#destroyAdd1'),
  destroyAdd2: document.querySelector('#destroyAdd2'),
  square: document.querySelector('#square'),
  color: document.querySelector('#color'),
  setColor: document.querySelector('#setColor'),
  pow: document.querySelector('#pow'),
  num3: document.querySelector('#num3'),
  cos: document.querySelector('#cos'),
  num4: document.querySelector('#num4'),
}

el.add.addEventListener('click', () => {
  window.apiManager.request('render1', 'add', el.num.value)
    .then(console.log)
    .catch(console.error)
})

el.sub.addEventListener('click', () => {
  window.apiManager.request('render1', 'sub', el.num.value)
    .then(console.log)
    .catch(console.error)
})

el.set.addEventListener('click', () => {
  window.apiManager.request('render1', 'set', el.num2.value)
    .then(console.log)
    .catch(console.error)
})

el.destroyAdd1.addEventListener('click', () => {
  window.apiManager.destroy('render1', 'add')
    .then(console.log)
    .catch(console.error)
})

el.destroyAdd2.addEventListener('click', () => {
  window.apiManager.destroy('render2', 'add')
    .then(console.log)
    .catch(console.error)
})

el.square.addEventListener('click', () => {
  window.apiManager.request('render1', 'square', el.num2.value)
    .then(console.log)
    .catch(console.error)
})


el.setColor.addEventListener('click', () => {
  window.apiManager.broadcast('setColor', el.color.value)
})


el.pow.addEventListener('click', () => {
  window.apiManager.request('nodeModule', 'pow', el.num3.value)
    .then((value) => {
      console.log(value,'-------')
      el.num3.value = value
    })
    .catch(console.error)
})

el.cos.addEventListener('click', () => {
  console.log('---------cos click')
  window.apiManager.request('nodeModule', 'cos', el.num4.value)
    .then((value) => {
      console.log(value,'-------')
      el.num4.value = value
    })
    .catch(console.error)
})

function add(value = 1) {
  el.num.value = Number(el.num.value) + Number(value)
}


function sub(value = 1) {
  el.num.value = Number(el.num.value) - Number(value)
}

function set(value = 0) {
  el.num.value = value
}

function half(value = 0) {
  return value / 2
}

function three(value = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(value * 3)
    }, 1500)
  })
}

function setColor(color = 'red') {
  document.body.style.color = color
}

window.apiManager.register('add', add)
window.apiManager.register('sub', sub)
window.apiManager.register('set', set)
window.apiManager.register('half', half)
window.apiManager.register('setColor', setColor)
window.apiManager.register('three', three)
  .then(console.log)
  .catch(console.error)

console.log(process.type)

