import {CallType, MsgType} from "../config/default";
import SocketChannel from "../Channel/SocketChannel";
import {makeToken} from "../util/common";

export default class SocketApiClient {
  constructor(apiGateway, socket, socketServer) {
    this.apiGateway = apiGateway
    this.socketServer = socketServer
    this.logger = apiGateway.logger
    this.channel = new SocketChannel(socket, apiGateway.options)
    this.module = ''
    this.moduleId = ''
    this.token = ''
  }

  start() {
    this.channel.on("message", this._onMessage.bind(this))
    this.channel.on("close", this.onClose.bind(this))
    this.channel.on("error", this.onError.bind(this))
    this.channel.on('send_message_error', msg => this.apiGateway._onMessage(this.addHead(msg)))
  }

  get headMsg() {
    return {
      timestamp: Date.now(),
      sourceModule: this.module,
      sourceId: this.moduleId
    }
  }

  onClose() {
    this.apiGateway._logout(this.moduleId, this.module)
  }

  onError(e) {
    this.logger.error(e)
  }

  addHead(msg) {
    return Object.assign(msg, this.apiGateway.headMsg)
  }

  send(msg) {
    if (!this.token && !this.apiGateway.options.isWhiteListModule) {
      // 缓存未登录消息和发送失败消息
      return this.channel.sendQueue.push(msg)
    }
    this.channel.send(this.addHead(msg))
  }

  sendResponse(msg) {
    this.send({
      msgType: MsgType.RESPONSE_TYPE,
      code: 1,
      status: 200,
      ...msg
    })
  }


  _onMessage(msg) {
    const {msgType, api, type, id, sourceModule, sourceId, token} = msg
    const callback = (data, forward = false) => {
      data.resType = msgType
      if (forward) {
        this.channel.send(data)
      } else {
        this.sendResponse({id, ...data})
      }
    }

    // 1.在白名单中 2.token存在 3.token相等 4.login消息
    if (!this.apiGateway.options.whiteListModule.includes(sourceModule)
      && !this.channel.token
      && this.channel.token !== token
      && msgType !== MsgType.LOGIN_TYPE
    ) {
      return callback({code: 0, status: 403, data: 'client not logged in'})
    }

    try {
      switch (msgType) {
        case MsgType.LOGIN_TYPE: {
          const isLoginType = Number(type) === 1
          const resType = isLoginType ? MsgType.LOGIN_TYPE : MsgType.LOGOUT_TYPE
          if (this.apiGateway.options.userName === msg.userName
            && this.apiGateway.options.password === msg.password) {
            if (isLoginType) {
              this.token = makeToken()
              this.socketServer.addClient(sourceId, sourceModule, this)
            } else {
              this.channel.resend()
              this.channel.close()
              this.apiGateway._logout(sourceId, sourceModule)
            }
            callback({code: 1, resType, data: this.token})
          } else {
            callback({code: 0, resType, data: 'username or password incorrect'})
          }
          break
        }
        case MsgType.HEARTBEAT_TYPE: {
          this.logger.info('心跳消息', msg)
          break
        }
        case MsgType.REGISTER_TYPE: {
          if (Number(type) === 0) {
            this.apiGateway._destroy({
              api,
              moduleId: sourceId,
              module: sourceModule
            }, callback)
          } else {
            this.apiGateway._register({
              api,
              moduleId: sourceId,
              module: sourceModule,
              type: CallType.SOCKET,
              client: this
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
          const data = JSON.parse(msg.data)
          const combineMsg = Object.assign({
            msgType: type,
            id,
            sourceModule,
            sourceId,
            token,
            timestamp: msg.timestamp
          }, data)
          this._onMessage(combineMsg)
          break
        }
        default:
          throw new Error('error message type')
      }
    } catch (e) {
      this.apiGateway.msgIdMapHandler.delete(id)
      callback({data: e, code: 0, status: 500})
    }
  }

}

