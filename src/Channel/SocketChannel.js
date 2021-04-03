import {MsgType, ProtoType} from "../config/default";
import {Serializer} from "../Serializer/Serializer";
import {parseMsg, stringifyMsg} from "../util/common";
import {EventEmitter} from "events";


export default class SocketChannel extends EventEmitter {
  constructor(socket, options) {
    super()
    this.options = options
    this.logger = options.logger
    this.socket = socket
    this.serializer = new Serializer(options.serializeType === 'protobuf'
      ? ProtoType.PROTOBUF
      : ProtoType.JSON)
    this.receiverQueue = [] // msg 接收到的消息列表
    this.sendQueue = [] // msg 发送给服务端的消息列表
    this.buffer = Buffer.alloc(0)
    this.token = ''
    this.socket.on("data", this.onData.bind(this))
    this.socket.on("close", hadError => this.emit('close', hadError))
    this.socket.on("error", e => this.emit('error', e))
  }

  onData(buf) {
    this.buffer = Buffer.concat([this.buffer, buf])
    while (this.serializer.deserialize(this.buffer)) {
      if (this.serializer.msg) {
        this.receiverQueue.push(this.serializer.msg)
        this.serializer.msg = null
      }
      this.buffer = this.buffer.slice(this.serializer.msgLen)
    }
    // 如果大于最大消息长度表示是错误值,直接清空
    if (this.buffer.length > this.options.maxMessageSize) {
      this.buffer = Buffer.alloc(0)
    }
    while (this.receiverQueue.length) {
      const msg = this.receiverQueue.shift()
      this.emit('message', parseMsg(msg))
    }
  }

  close() {
    if (!this.socket.destroyed) this.socket.destroy()
  }

  // 三次重试
  send(msg) {
    this.sendQueue.push(msg)
    this.resend()
  }

  resend() {
    while (this.sendQueue.length
    && this.socket.writable
    && !this.socket.destroyed) {
      this.write(this.sendQueue.shift())
    }
  }

  write(msg) {
    const strMsg = stringifyMsg(msg)
    const buffer = this.serializer.serialize(strMsg, this.token)
    buffer.id = msg.id
    buffer.count = buffer.count ? ++buffer.count : 1
    this.socket.write(buffer, e => {
      if (e) {
        this.logger.error(e)
        if (buffer.count <= 3) {
          this.sendQueue.push(msg)
        } else {
          // 三次写入失败直接回复
          this.emit('send_message_error', {
            msgType: MsgType.RESPONSE_TYPE,
            id: msg.id,
            code: 0,
            status: 500,
            data: 'message sending failed'
          })
        }
      }
    })
  }
}

