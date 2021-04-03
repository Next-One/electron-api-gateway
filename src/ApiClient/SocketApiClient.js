import {MsgType} from "../config/default";
import net from "net";
import SocketChannel from "../Channel/SocketChannel";

export default class SocketApiClient {
  constructor(apiGateway) {
    this.apiGateway = apiGateway
    this.logger = apiGateway.logger
    const params = this.apiGateway.options.path
      ? {path: this.apiGateway.options.path}
      : {port: this.apiGateway.options.port, host: this.apiGateway.options.host}
    this.socket = net.createConnection(params, this.login.bind(this))
    this.loginCount = 0
    this.channel = new SocketChannel(this.socket, apiGateway.options)
  }

  start() {
    this.channel.on('message', msg => this.apiGateway._onMessage(msg))
    this.channel.on('close', this.logout.bind(this))
    this.channel.on('error', e => this.logger.error(e))
    this.channel.on('send_message_error', msg => this.apiGateway._onMessage(this.addHead(msg)))
    process.on('exit', (code) => {
      this.logger.info(`process exit code: ${code}`)
      this.logout()
    });
  }

  close() {
    this.logout()
    this.channel.close()
  }

  logout() {
    this.channel.resend()
    this.channel.write(this.addHead({
      id: this.apiGateway.msgId,
      type: 0,
      userName: this.apiGateway.options.userName,
      password: this.apiGateway.options.password,
      msgType: MsgType.LOGIN_TYPE
    }))
  }


  login() {
    const id = this.apiGateway.msgId
    this.apiGateway.msgIdMapHandler.set(id, ({code, data}) => {
      if (code === 1) {
        this.channel.token = data
        this.channel.resend()
      } else {
        if (this.loginCount >= 3) {
          throw new Error(data)
        }
        this.loginCount++
        this.login()
      }
    })
    this.channel.write(this.addHead({
      id,
      type: 1,
      userName: this.apiGateway.options.userName,
      password: this.apiGateway.options.password,
      msgType: MsgType.LOGIN_TYPE
    }))
  }

  addHead(msg) {
    return Object.assign(msg, this.apiGateway.headMsg)
  }

  send(msg) {
    this.channel.send(this.addHead(msg))
  }


}

