const {ipcRenderer: ipc, remote} = require('electron')
const ApiInfo = require('./ApiInfo')
const {
  composeKey,
  assert,
  deserializeError,
  decomposeKey,
  serializeError,
  isObject,
  CHANNEL
} = require("./util")


class ApiRenderer{
  constructor(options = {}) {
    this.options = options
    this._msgId = 0
    this._module = options.module
    this.apiManager = new Map()
    this.listeners = new Map()
    this.windowId = remote.getCurrentWindow().id

    this.listenerToMain()
    this.listenerToWindow()
  }

  get module() {
    return this._module
  }

  get msgId() {
    return `${this.module}-${this.windowId || 1}-msg-id-${this._msgId++}`
  }

  async register(api, callback) {
    if (this.hasApi(api)) {
      const text = `Api [module: ${this.module}, api: ${api}] already exists`
      console.warn(text)
      return {
        type: 0,
        text
      }
    }
    const apiInfo = new ApiInfo({
      api,
      module: this.module,
      callback
    })
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.listeners.set(id, {
        resolve,
        reject,
        success: (response) => {
          if (isObject(response) && response.type === 1) {
            this.apiManager.set(apiInfo.key, apiInfo)
          }
        }
      })
      ipc.send(CHANNEL.SEND_REGISTER_RENDERER_TO_MAIN,
        {api, module: this.module, windowId: this.windowId, id})
    })
  }

  async request(module, api, data) {
    if (module === this.module) {
      const apiInfo = this.getApiByName(module, api)
      return apiInfo.callback(data)
    }
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.listeners.set(id, {resolve, reject})
      ipc.send(CHANNEL.SEND_REQUEST_RENDERER_TO_MAIN,
        {id, from: this.module, module, api, data})
    })
  }

  async requestByKey(key, data) {
    const {module, api} = decomposeKey(key)
    return this.request(module, api, data)
  }

  async destroy(api) {
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.listeners.set(id, {
        resolve,
        reject,
        success: (response) => {
          if (isObject(response) && response.type === 1) {
            this.apiManager.delete(composeKey(this.module, api))
          }
        }
      })
      ipc.send(CHANNEL.SEND_DESTROY_RENDERER_TO_MAIN,
        {id, from: this.module, module: this.module, api})
    })
  }

  async broadcastApi(api, data) {
    const values = this.apiManager.values()
    for (const value of values) {
      if (value.api === api) {
        value.callback(data)
        break;
      }
    }
    ipc.send(CHANNEL.SEND_BROADCAST, {api, from: this.module, data})
  }

  /*
   * Logout other process API
   * */
  async destroyUnsafe(module, api) {
    if (this.module === module) {
      return this.destroy(api)
    }
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.listeners.set(id, {resolve, reject})
      ipc.send(CHANNEL.SEND_DESTROY_RENDERER_TO_MAIN,
        {id, module, api, from: this.module})
    })
  }

  hasApi(api) {
    const key = composeKey(this.module, api)
    return this.apiManager.has(key)
  }

  getApiByName(module, api) {
    const key = composeKey(module, api)
    const apiInfo = this.apiManager.get(key)
    if (process.env.NODE_ENV !== 'production') {
      assert(apiInfo, `Api [module: ${module}, api: ${api}] doesn't exist`)
    }
    return apiInfo
  }


  listenerToMain() {
    ipc.on(CHANNEL.RESPONSE_MAIN_TO_RENDERER, this.handleResponseFromMain.bind(this))
    ipc.on(CHANNEL.SEND_REQUEST_MAIN_TO_RENDERER, this._replyApiCall.bind(this))
    ipc.on(CHANNEL.SEND_DESTROY_MAIN_TO_RENDERER, this._replyApiDestroy.bind(this))
    ipc.on(CHANNEL.NO_RESPONSE_BROADCAST, this._handleBroadcast.bind(this))
  }

  listenerToWindow() {
    const win = remote.getCurrentWindow()
    win.on('close', () => {
      this.destroyAllApi()
    })
  }

  destroyAllApi() {
    ipc.send(CHANNEL.SEND_DESTROY_ALL, {module: this.module, windowId: this.windowId})
  }


  async _handleMainMessage({api, data, id, method}) {
    try {
      let response = null
      switch (method) {
        case 'call': {
          const apiInfo = this.getApiByName(this.module, api)
          response = await apiInfo.callback(data)
          break;
        }
        case 'destroy': {
          response = this.apiManager.delete(composeKey(this.module, api))
          break;
        }
        default:
      }
      ipc.send(CHANNEL.RESPONSE_RENDERER_TO_MAIN, {id, response})
    } catch (e) {
      ipc.send(CHANNEL.RESPONSE_RENDERER_TO_MAIN, {id, error: serializeError(e)})
    }
  }

  handleResponseFromMain(event, {id, response, error}) {
    const handler = this.listeners.get(id)
    if (!handler) return
    this.listeners.delete(id)
    if (error) {
      handler.reject(deserializeError(error))
    } else {
      handler.success && handler.success(response)
      handler.resolve(response)
    }
  }

  _replyApiCall(event, {api, data, id}) {
    this._handleMainMessage({api, data, id, method: 'call'})
  }

  _replyApiDestroy(event, {api, id}) {
    this._handleMainMessage({api, id, method: 'destroy'})
  }

  _handleBroadcast(event, {api, data}) {
    const apiInfo = this.getApiByName(this.module, api)
    apiInfo.callback(data)
  }

}

module.exports = ApiRenderer
