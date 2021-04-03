import {CallType, MsgType} from "../config/default";
import {parseMsg, stringifyMsg} from "../util/common";
import {ipcMain, BrowserWindow} from 'electron'

class RendererClient {
  constructor(options) {
    this.moduleId = options.moduleId
    this.module = options.module
    this.client = BrowserWindow.fromId(this.moduleId)
  }

  send(msg) {
    msg = stringifyMsg(msg)
    this.client.webContents.send('main-message', msg)
  }

}

export default class MainApiServer {
  constructor(apiGateway) {
    this.logger = apiGateway.logger
    this.apiGateway = apiGateway
    this.clientMap = new Map()
    this.onRendererMessage = (event, msg) => this._onMessage(event, msg)
  }

  start() {
    ipcMain.on('renderer-message', this.onRendererMessage)
  }

  close(){
    for(const client of this.clientMap.values()){
      client.send(Object.assign({
        id: this.apiGateway.msgId,
        type: 0,
        userName: '',
        password: '',
        msgType: MsgType.LOGIN_TYPE
      }, this.apiGateway.headMsg))
    }
    ipcMain.removeListener('renderer-message', this.onRendererMessage)
  }

  sendResponse(event, msg) {
    this.send(event, {
      msgType: MsgType.RESPONSE_TYPE,
      code: 1,
      status: 200,
      ...msg
    })
  }

  addClient(moduleId, module) {
    if (!this.clientMap.has(moduleId)) {
      this.clientMap.set(moduleId, new RendererClient({
        moduleId,
        module
      }))
    }
  }

  removeClient(moduleId) {
    this.clientMap.delete(moduleId)
  }

  _onMessage(event, msg) {
    msg = parseMsg(msg)
    const {msgType, api, type, id, sourceModule, sourceId} = msg
    // msg必为对象，且有code和data两个属性
    const callback = (message, forward = false) => {
      message.resType = msgType
      if (forward) {
        this.send(event, message)
      } else {
        this.sendResponse(event, {id, ...message})
      }
    }
    try {
      switch (msgType) {
        case MsgType.LOGIN_TYPE: {
          if (Number(type) === 0) {
            this.apiGateway._logout(sourceId, sourceModule)
          }
          break
        }
        case MsgType.REGISTER_TYPE: {
          if (Number(type) === 0) {
            this.apiGateway._destroy({
              api,
              module: sourceModule,
              moduleId: sourceId
            }, callback)
          } else {
            this.addClient(sourceId, sourceModule)
            this.apiGateway._register({
              api,
              module: sourceModule,
              moduleId: sourceId,
              type: CallType.RENDERER,
              client: this.clientMap.get(sourceId)
            }, callback)
          }
          break
        }
        case MsgType.REQUEST_TYPE: {
          this.apiGateway._request(msg, callback)
          break
        }
        case MsgType.BROADCAST_TYPE: {
          this.apiGateway._broadcast(msg)
          callback({code: 1})
          break
        }
        case MsgType.RESPONSE_TYPE: {
          this.apiGateway._forwardResponse(msg)
          break
        }
        case MsgType.JSON_TYPE: {
          this.logger.info('JSONMSG', msg)
          callback({code: 1})
          break
        }
        default:
          throw new Error('不正确的消息类型')
      }
    } catch (e) {
      this.apiGateway.msgIdMapHandler.delete(id)
      callback({data: e, code: 0, status: 500})
    }
  }

  send(eventOrId, msg, callback) {
    let window
    if (eventOrId.sender) {
      window = BrowserWindow.fromWebContents(eventOrId.sender);
    } else {
      window = BrowserWindow.fromId(eventOrId)
    }
    if (window && !window.isDestroyed()) {
      callback && callback()
      this.logger.info('msg---------', msg)
      msg = stringifyMsg(msg)
      window.webContents.send('main-message', msg);
    }
  }

}
