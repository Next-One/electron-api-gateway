import {ModuleConfig, MsgType, OptionsConfig} from "../config/default";
import ApiInfo from "../Api/ApiInfo";
import {
  isFunction,
  assert,
  composeKey,
  decomposeKey,
  uuid,
  parseMsg,
  isPromise,
  validatorOptions
} from "../util/common";

let apiClient = null

class ApiClient {
  constructor(options) {
    this.options = validatorOptions(options)
    this.clientType = this.options.clientType
    this.module = this.options.module
    this.moduleId = this.options.moduleId
    this.logger = this.options.logger
    this.apiManager = new Map() // 'module/api' => ApiInfo
    this.msgIdMapHandler = new Map()  // id => callback
    this.msgQueue = []
    this.status = ''
    this.start()
  }

  get msgId() {
    return uuid()
  }

  get headMsg() {
    return {
      timestamp: Date.now(),
      sourceModule: this.module,
      sourceId: this.moduleId
    }
  }

  start() {
    if (this.clientType === OptionsConfig.clientTypes[1]) {
      import('./SocketApiClient').then(this.initClient.bind(this))
    } else {
      import('./RendererApiClient').then(this.initClient.bind(this))
    }
  }

  initClient(clsOrModule) {
    this.client = new clsOrModule.default(this)
    this.client.start()
    this.resend()
  }

  resend() {
    while (this.msgQueue.length && this.client) {
      const msg = this.msgQueue.shift()
      this.client.send(msg)
    }
  }

  send(msg) {
    if (this.client) {
      this.client.send(msg)
    } else {
      this.msgQueue.push(msg)
    }
  }

  sendResponse(msg) {
    this.send({
      msgType: MsgType.RESPONSE_TYPE,
      code: 1,
      status: 200,
      ...msg
    })
  }

  hasApi(api) {
    const key = composeKey(this.module, api)
    return this.apiManager.has(key)
  }

  async register(api, callback) {
    assert(isFunction(callback), `Expected to be a function, but received ${callback}`)
    if (this.hasApi(api)) {
      const apiInfo = this._getApi(api)
      if (apiInfo.has(callback)) {
        const data = `Api [module: ${this.module}, api: ${api}] already exists`
        this.logger.warn(data)
        return data
      }
      apiInfo.add(callback)
      return `Api [module: ${this.module}, api: ${api}] register success`
    }
    const apiInfo = new ApiInfo({
      api,
      callback,
      module: this.module,
      moduleId: this.moduleId
    })
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.msgIdMapHandler.set(id, ({code, data}) => {
        if (code === 1) {
          this.apiManager.set(apiInfo.key, apiInfo)
          resolve(data)
        } else {
          reject(data)
        }
      })
      this.send({api, id, type: 1, msgType: MsgType.REGISTER_TYPE})
    })
  }

  async request(module, api, data, back = 1) {
    if (module === this.module) {
      const key = composeKey(module, api)
      const apiInfo = this.apiManager.get(key)
      assert(apiInfo, `Not Found Api [module: ${module}, api: ${api}]`)
      return apiInfo.callback(data)
    }
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.msgIdMapHandler.set(id, ({code, data}) => {
        if (code === 1) {
          resolve(data)
        } else {
          reject(data)
        }
      })
      this.send({api, id, back, module, data, msgType: MsgType.REQUEST_TYPE})
    })
  }

  async requestByKey(key, data, back = 1) {
    const {module, api} = decomposeKey(key)
    return this.request(module, api, data, back)
  }


  async destroy(api, callback) {
    const apiInfo = this._getApi(api)
    if (!apiInfo) {
      return `Not Found Api [module: ${this.module}, api: ${api}]`
    }
    if (apiInfo.has(callback)) {
      apiInfo.delete(callback)
      if (apiInfo.callback.size > 0) {
        return `Api [module: ${this.module}, api: ${api}] destroy success`
      }
    }
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.msgIdMapHandler.set(id, ({code, data}) => {
        if (code === 1) {
          this.apiManager.delete(composeKey(this.module, api))
          resolve(data)
        } else {
          reject(data)
        }
      })
      this.send({api, id, type: 0, msgType: MsgType.REGISTER_TYPE})
    })
  }

  async broadcast(api, data) {
    this._broadcast(api, data)
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this.msgIdMapHandler.set(id, ({code, data}) => {
        if (code === 1) {
          resolve(data)
        } else {
          reject(data)
        }
      })
      this.send({api, data, id, msgType: MsgType.BROADCAST_TYPE})
    })
  }

  // 关闭客户端
  close() {
    // 重置单例
    apiClient = null
    this.client && this.client.close()
  }

  _getApi(api) {
    const key = composeKey(this.module, api)
    return this.apiManager.get(key)
  }

  _request({api, data, id}) {
    const resolve = data => this.sendResponse({id, data})
    const reject = e => this.sendResponse({id, code: 0, data: e, status: 500})
    const apiInfo = this._getApi(api)
    if (!apiInfo) {
      return this.sendResponse({
        id,
        code: 0,
        status: 404,
        data: `Not Found Api [module: ${this.module}, api: ${api}]`
      })
    }
    let first = true
    for (const callback of apiInfo.callback) {
      try {
        const response = callback(data)
        if (!first) continue
        first = false
        if (isPromise(response)) {
          response.then(resolve, reject)
        } else {
          resolve(response)
        }
      } catch (e) {
        if (!first) continue
        first = false
        reject(e)
      }
    }
  }

  _broadcast(api, data) {
    const apiList = this.apiManager.values()
    for (const apiInfo of apiList) {
      if (apiInfo.api === api) {
        for (const callback of apiInfo.callback) {
          callback(data)
        }
        break;
      }
    }
  }


  _response(msg) {
    const {resType, id} = msg
    const handler = this.msgIdMapHandler.get(id)
    this.msgIdMapHandler.delete(id)
    if (!isFunction(handler)) return
    switch (resType) {
      case MsgType.HEARTBEAT_TYPE: {
        this.logger.info('心跳消息', msg)
        break
      }
      case MsgType.LOGIN_TYPE:
      case MsgType.REGISTER_TYPE:
      case MsgType.REQUEST_TYPE:
      case MsgType.JSON_TYPE:
      default:
        handler(msg)
    }
  }

  _onMessage(msg) {
    msg = parseMsg(msg)
    const {api, data, msgType, type} = msg
    switch (msgType) {
      case MsgType.LOGIN_TYPE: {
        if(type === 0){

        }
        break
      }
      case MsgType.HEARTBEAT_TYPE: {
        this.logger.info('心跳消息', msg)
        break
      }
      case MsgType.REQUEST_TYPE: {
        this._request(msg)
        break
      }
      case MsgType.BROADCAST_TYPE: {
        this._broadcast(api, data)
        break
      }
      case MsgType.RESPONSE_TYPE: {
        this._response(msg)
        break
      }
      case MsgType.JSON_TYPE:
      default:
        this.logger.info('消息', msg)
    }
  }

}


// 单例
export default function createApiClient(options = {}) {
  if (apiClient) {
    return apiClient
  }
  return apiClient = new ApiClient(options)
}
