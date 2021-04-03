import {CallType, ModuleConfig, MsgType} from "../config/default";
import {assert, composeKey, decomposeKey, isFunction, isPromise, uuid, validatorOptions} from "../util/common";
import ApiInfo from "../Api/ApiInfo";
import MainApiServer from "./MainApiServer";
import SocketApiServer from "./SocketApiServer";


class ApiGateway {
  constructor(options = {}) {
    this.options = validatorOptions(options)
    this.module = this.options.serverModule
    this.moduleId = this.options.moduleId
    this.logger = this.options.logger
    this.apiManager = new Map() // 'module/api' => ApiInfo
    this.msgIdMapHandler = new Map() // id => callback
    this.mainApiServer = new MainApiServer(this)
    this.start()
  }

  start() {
    this.mainApiServer.start()
    if (this.options.supportSocket) {
      this.socketApiServer = new SocketApiServer(this)
      this.socketApiServer.start()
    }
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

  getApiByName(module, api) {
    const key = composeKey(module, api)
    const apiInfo = this.apiManager.get(key)
    if (process.env.NODE_ENV !== 'production') {
      assert(apiInfo, `Api [module: ${module}, api: ${api}] doesn't exist`)
    }
    return apiInfo
  }

  hasApi(api) {
    const key = composeKey(this.module, api)
    return this.apiManager.has(key)
  }

  register(api, callback) {
    if (this.hasApi(api)) {
      const data = `Api [module: ${this.module}, api: ${api}] already exists`
      this.logger.warn(data)
      return data
    }
    const apiInfo = new ApiInfo({
      api,
      callback,
      module: this.module,
      moduleId: this.moduleId,
      type: CallType.MAIN
    })
    this.apiManager.set(apiInfo.key, apiInfo)
  }

  request(module, api, data) {
    if (module === this.module) {
      const apiInfo = this.getApiByName(module, api)
      return apiInfo.callback(data)
    }
    return new Promise((resolve, reject) => {
      const id = this.msgId
      this._request({module, api, data, id, msgType: MsgType.REQUEST_TYPE},
        ({code, data}) => code === 1 ? resolve(data) : reject(data)
      )
    })
  }

  requestByKey(key, data) {
    const {module, api} = decomposeKey(key)
    return this.request(module, api, data)
  }

  destroy(api) {
    return this.apiManager.delete(composeKey(this.module, api))
  }

  broadcast(api, data) {
    const apiList = this.apiManager.values()
    const msg = {
      data,
      api,
      msgType: MsgType.BROADCAST_TYPE,
      id: this.msgId
    }
    for (const apiInfo of apiList) {
      if (apiInfo.api === api) {
        this._execApi(apiInfo, data, msg)
      }
    }
  }

  close(){
    apiGateway = null
    this.mainApiServer.close()
    if(this.socketApiServer){
      this.socketApiServer.close()
    }
  }


  _execApi(apiInfo, data, msg) {
    try {
      if (apiInfo.type === CallType.MAIN) {
        apiInfo.callback(data)
      } else if (apiInfo.type === CallType.RENDERER) {
        apiInfo.client.send(msg)
      } else if (apiInfo.type === CallType.SOCKET) {
        apiInfo.client.send(msg)
      }
    } catch (e) {
      this.logger.error(e)
    }
  }

  /*
  *   暂时不支持module多开
  *   不支持同name同module的api
  *   多次注册同一api会被覆盖，以最后一次有效
  * */
  _register(options, callback) {
    const apiInfo = new ApiInfo(options)
    const has = this.apiManager.has(apiInfo.key)
    this.apiManager.set(apiInfo.key, apiInfo)
    callback({
      code: 1,
      data: has
        ? `${apiInfo.toString()} already covered`
        : `${apiInfo.toString()} register success`
    })
  }

  _destroy(msg, callback) {
    const {module, api} = msg
    try {
      const apiInfo = this.getApiByName(module, api)
      this.apiManager.delete(apiInfo.key)
      callback({code: 1, resType: MsgType.DESTROY_TYPE})
    } catch (e) {
      callback({code: 0, resType: MsgType.DESTROY_TYPE, data: e})
    }
  }

  _request(msg, callback) {

    try {
      const key = composeKey(msg.module, msg.api)
      const apiInfo = this.apiManager.get(key)
      if (!apiInfo) {
        return callback({
          code: 0,
          status: 404,
          data: `Not Found Api [module: ${msg.module}, api: ${msg.api}]`
        })
      }
      switch (apiInfo.type) {
        case CallType.MAIN: {
          const response = apiInfo.callback(msg.data)
          const resolve = data => callback({code: 1, data})
          if (isPromise(response)) {
            response.then(resolve, e => callback({code: 0, data: e}))
          } else {
            resolve(response)
          }
          break
        }
        case CallType.RENDERER: {
          console.log('-----RENDERER', msg)
          this.msgIdMapHandler.set(msg.id, callback)
          apiInfo.client.send(msg)
          break
        }
        case CallType.SOCKET: {
          console.log('-----SOCKET', msg)
          this.msgIdMapHandler.set(msg.id, callback)
          apiInfo.client.send(msg)
          break
        }
        default: {
          throw new Error('Error callType')
        }
      }
    } catch (e) {
      this.msgIdMapHandler.delete(msg.id)
      callback({code: 0, data: e})
    }
  }

  _broadcast(msg) {
    const {sourceModule, api, data} = msg
    const apiList = this.apiManager.values()
    for (const apiInfo of apiList) {
      if (apiInfo.api === api && sourceModule !== apiInfo.module) {
        this._execApi(apiInfo, data, msg)
      }
    }
  }

  _forwardResponse(msg) {
    const handler = this.msgIdMapHandler.get(msg.id)
    console.log('__for', msg)
    if (!isFunction(handler)) return
    this.msgIdMapHandler.delete(msg.id)
    handler(msg, true)
  }

  _logout(sourceId, sourceModule) {
    this.mainApiServer.removeClient(sourceId)
    if (this.socketApiServer) {
      this.socketApiServer.removeClient(sourceId)
    }
    const keyList = this.apiManager.keys()
    for (const key of keyList) {
      const {module} = decomposeKey(key)
      if (module === sourceModule) {
        this.apiManager.delete(key)
      }
    }
  }

}

let apiGateway = null
// 单例
export default function createApiGateway(options = {}) {
  if(apiGateway){
    return apiGateway
  }
  return apiGateway =  new ApiGateway(options)
}
