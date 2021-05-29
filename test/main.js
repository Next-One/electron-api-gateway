const {app, BrowserWindow} = require('electron')
console.log(process.type)
function createWindow({filePath, x, y}) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    x: x || 200,
    y: y || 200,
    devtool: true,
    webPreferences: {
      nodeIntegration: true,
      preload: '../src/ApiRenderer'
    }
  })
  win.loadFile(filePath)
  win.webContents.openDevTools()
  return win
}

app.whenReady().then(() => {
  const moduleContent = require('../dist')
  console.log('createApi', moduleContent)

  global.apiMain = moduleContent.createApiServer({module: 'main'})
  global.apiMain.register('double', function (num) {
    return num * 2
  })

  global.apiMain.register('setColor', function (color) {
    console.log(color)
  })

  global.apiMain.register('four', function (num) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(num * 4), 1000)
    })
  })

  setTimeout(() => {
    /*global.apiMain.request('render1', 'add', 1)
      .then(console.log)
      .catch(console.error)*/
    global.apiMain.requestByKey('render2/three', 11)
      .then(console.log)
      .catch(console.error)
  }, 1000)
  createWindow({filePath: './render2/index.html', x: 100, y: 300})
  setTimeout(() => {
    // createWindow({filePath: './render2/index.html', x: 550, y: 50})
    createWindow({filePath: './render1/index.html', x: 200, y: 300})
  }, 1000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
