const {ipcMain: ipc, BrowserWindow} = require('electron')
const ApiInfo = require('./ApiInfo')
const {
  composeKey,
  assert,
  isPromise,
  CALL_TYPE,
  serializeError,
  decomposeKey,
  deserializeError,
  CHANNEL,
  isArray
} = require('./util')


class ApiMain {
  constructor(options = {}) {
    this.options = options
    this._module = options.module || 'main'
    this._msgId = 0
    this.apiManager = new Map()
    this.listeners = new Map()
    this.listenerToRenderer()
  }

  get module() {
    return this._module
  }

  get msgId() {
    return `${this.module}-msg-id-${this._msgId++}`
  }

  /*
  * return 1 means success, 0 means failure
  * */
  register(api, callback) {
    const apiInfo = new ApiInfo({
      api,
      callback,
      module: this.module,
      type: CALL_TYPE.MAIN
    })
    return this._register(apiInfo)
  }

  async request(module, api, data) {
    const apiInfo = this.getApiByName(module, api)
    if (module === this.module) {
      return apiInfo.callback(data)
    }
    return new Promise((resolve, reject) => {
      this.requestRenderApi(apiInfo, {
        id: this.msgId,
        from: module,
        module,
        api,
        data
      }, resolve, reject)
    })
  }

  async requestByKey(key, data) {
    const {module, api} = decomposeKey(key)
    return this.request(module, api, data)
  }

  destroy(api) {
    return this._destroy(this.module, api)
  }

  /*
   * Logout other process API
   * */
  async destroyUnsafe(module, api) {
    const apiInfo = this.getApiByName(module, api)
    if (this.module === module) {
      return this.destroy(api)
    }
    return new Promise((resolve, reject) => {
      this.destroyRenderApi(apiInfo, {
        id: this.msgId,
        from: this.module,
        api
      }, resolve, reject)
    })
  }

  _destroy(module, api, windowId) {
    const key = composeKey(module, api)
    const apiInfo = this.apiManager.get(key)
    if (isArray(apiInfo)) {
      const index = apiInfo.findIndex(item => item.windowId === windowId)
      if (index !== -1) {
        apiInfo.splice(index, 1)
      }
      if (index === -1 || apiInfo.length === 0) {
        this.apiManager.delete(key)
      }
      if (apiInfo.length === 1) {
        this.apiManager.set(key, apiInfo[0])
      }
    } else {
      this.apiManager.delete(key)
    }
    return {
      type: 1
    }
  }


  getApiByName(module, api) {
    const key = composeKey(module, api)
    const apiInfo = this.apiManager.get(key)
    if (process.env.NODE_ENV !== 'production') {
      assert(apiInfo, `Api [module: ${module}, api: ${api}] doesn't exist`)
    }
    return apiInfo
  }

  getApiInfoWindow(apiInfo) {
    return BrowserWindow.fromId(apiInfo.windowId)
  }

  _register(apiInfo) {
    const apiInfoOld = this.apiManager.get(apiInfo.key)
    if (!apiInfoOld) {
      this.apiManager.set(apiInfo.key, apiInfo)
      return {
        type: 1
      }
      //  处理渲染进程多开问题
    } else if (apiInfo.type === CALL_TYPE.RENDERER && apiInfo.windowId !== apiInfoOld.windowId) {
      const apiList = isArray(apiInfoOld) ? [...apiInfoOld, apiInfo] : [apiInfoOld, apiInfo]
      this.apiManager.set(apiInfo.key, apiList)
      return {
        type: 1
      }
    }
    return {
      type: 0,
      text: `${apiInfo.toString()} already exists`
    }
  }

  requestRenderApi(apiInfo, args, resolve, reject) {
    this.sendMessageToRender(apiInfo, args, resolve, reject, CHANNEL.SEND_REQUEST_MAIN_TO_RENDERER)
  }

  destroyRenderApi(apiInfo, args, resolve, reject) {
    this.sendMessageToRender(apiInfo, args, resolve, reject, CHANNEL.SEND_DESTROY_MAIN_TO_RENDERER)
  }

  listenerToRenderer() {
    ipc.on(CHANNEL.RESPONSE_RENDERER_TO_MAIN, this.handleResponseFromRenderer.bind(this))
    ipc.on(CHANNEL.SEND_REGISTER_RENDERER_TO_MAIN, this.handleRegister.bind(this))
    ipc.on(CHANNEL.SEND_REQUEST_RENDERER_TO_MAIN, this.handleRequest.bind(this))
    ipc.on(CHANNEL.SEND_DESTROY_RENDERER_TO_MAIN, this.handleDestroy.bind(this))
    ipc.on(CHANNEL.SEND_BROADCAST, this.handleBroadcast.bind(this))
    ipc.on(CHANNEL.SEND_DESTROY_ALL, this.handleRendererDestroyAll.bind(this))
  }



  exeApi(apiInfo, data) {
    try {
      if (apiInfo.type === CALL_TYPE.MAIN) {
        apiInfo.callback(data)
      } else if (apiInfo.type === CALL_TYPE.RENDERER) {
        const window = this.getApiInfoWindow(apiInfo)
        window.webContents.send(CHANNEL.NO_RESPONSE_BROADCAST,
          {api: apiInfo.api, data})
      }
    } catch (e) {
    }
  }

  broadcastApi(api, data) {
    this.handleBroadcast(null, {api, from: this.module, data})
  }

  handleBroadcast(event, {api, from, data}) {
    const values = this.apiManager.values()
    const broadcast = (item) => {
      if (item.api === api && from !== item.module) {
        this.exeApi(item, data)
      }
    }
    for (const value of values) {
      if (isArray(value)) {
        value.forEach(broadcast)
      } else {
        broadcast(value)
      }
    }
  }

  handleRendererDestroyAll(event, {module, windowId}) {
    const keys = this.apiManager.keys()
    for (const key of keys) {
      const item = decomposeKey(key)
      if (item.module === module) {
        this._destroy(module, item.api, windowId)
      }
    }
  }

  sendMessage(event, data) {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !window.isDestroyed()) {
      event.sender.send(CHANNEL.RESPONSE_MAIN_TO_RENDERER, data);
    }
  }

  handleRegister(event, {api, module, windowId, id}) {
    const apiInfo = new ApiInfo({
      api,
      module,
      windowId,
      type: CALL_TYPE.RENDERER
    })
    const response = this._register(apiInfo)
    this.sendMessage(event, {response, id})
  }


  sendMessageToRender(apiInfo, args, resolve, reject, channel) {
    const send = api => {
      try {
        const window = this.getApiInfoWindow(api)
        if (!this.listeners.has(args.id)) this.listeners.set(args.id, {resolve, reject})
        window.webContents.send(channel, args)
      } catch (e) {
      }
    }
    if (isArray(apiInfo)) {
      apiInfo.forEach(send)
    } else {
      send(apiInfo)
    }
  }

  handleRequest(event, {id, api, module, from, data}) {
    const resolve = (response) => {
      this.sendMessage(event, {response, id})
    }
    const reject = (e) => {
      this.sendMessage(event, {error: serializeError(e), id})
    }
    try {
      const apiInfo = this.getApiByName(module, api)
      if (isArray(apiInfo) || apiInfo.type === CALL_TYPE.RENDERER) {
        this.requestRenderApi(apiInfo, {
          from,
          module,
          api,
          data,
          id
        }, resolve, reject)
      } else if (apiInfo.type === CALL_TYPE.MAIN) {
        const response = apiInfo.callback(data)
        if (isPromise(response)) {
          response.then(resolve, reject)
        } else {
          resolve(response)
        }
      }
    } catch (e) {
      reject(e)
    }
  }

  handleDestroy(event, {module, api, from, id}) {
    const resolve = (response) => {
      this.sendMessage(event, {response, id})
    }
    const reject = (e) => {
      this.sendMessage(event, {error: serializeError(e), id})
    }
    try {
      if (module === from) {
        resolve(this._destroy(module, api))
      } else {
        const apiInfo = this.getApiByName(module, api)
        if (isArray(apiInfo) || apiInfo.type === CALL_TYPE.RENDERER) {
          this.destroyRenderApi(apiInfo, {
            from,
            module,
            api,
            id
          }, resolve, reject)
        } else if (apiInfo.type === CALL_TYPE.MAIN) {
          resolve(this._destroy(this.module, api))
        }
      }
    } catch (e) {
      resolve({
        type: 0,
        text: e.message
      })
    }
  }

  handleResponseFromRenderer(event, {id, response, error}) {
    const handler = this.listeners.get(id)
    if (!handler) return
    this.listeners.delete(id)
    if (error) {
      handler.reject(deserializeError(error))
    } else {
      handler.resolve(response)
    }
  }

}

module.exports = ApiMain
