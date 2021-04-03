import {MsgType, SerializerConfig} from "../config/default";
import {isString} from "../util/common";

export class Serializer {
  constructor(proto) {
    this.proto = proto
    this.magic = SerializerConfig.MAGIC
    this.msgLen = 0
    this.cache = SerializerConfig.QUALITY.NO_CACHE
    this.msgType = MsgType.CUSTOM_TYPE
    this.token = ''
    this.data = null
    this.msg = null // msg对象或者包含msgType的{}
  }

  get hasToken() {
    return (isString(this.token) && this.token.length === SerializerConfig.MSG_DATA.TOKEN_LEN)
      ? SerializerConfig.HAS_TOKEN.YES
      : SerializerConfig.HAS_TOKEN.NO
  }


  get head() {
    let {magic, msgLen, cache, proto, msgType, token, hasToken} = this
    if (!hasToken) token = ''
    return Buffer.from(
      magic
      + msgLen.toString(16).padStart(SerializerConfig.MSG_DATA.MSG_LEN, '0')
      + cache
      + proto
      + msgType
      + hasToken
      + token
    )
  }

  serialize(msg, token) {
    this.msgType = msg.msgType
    this.token = token
    this.data = Buffer.from(JSON.stringify(msg))
    this.msgLen = this.head.length + this.data.length
    return Buffer.concat([this.head, this.data])
  }

  deserialize(msg) {
    if (msg.length > 14) {
      const magic = msg.slice(0, 6).toString()
      if (magic === SerializerConfig.MAGIC) {
        this.msgLen = parseInt(msg.slice(6, 14).toString(), 16)
        if (msg.length >= this.msgLen) {
          this.cache = msg.slice(14, 15).toString()
          this.proto = msg.slice(15, 19).toString()
          this.msgType = msg.slice(19, 23).toString()
          const hasToken = msg.slice(23, 24).toString()
          // 消息头部分分为有token和无token两种条件
          if (hasToken === SerializerConfig.HAS_TOKEN.YES) {
            this.token = msg.slice(24, 44).toString()
            this.data = msg.slice(44, this.msgLen)
          } else {
            this.token = ''
            this.data = msg.slice(24, this.msgLen)
          }
          this.msg = Object.assign({msgType: this.msgType, token: this.token},
            JSON.parse(this.data.toString()))
          return true
        }
      } else {
        const msgString = msg.toString()
        // 丢弃不完整消息，保证程序可用。
        // todo 不完整消息重发
        const index = msgString.indexOf(SerializerConfig.MAGIC)
        if (index > -1) {
          this.msgLen = index
          return true
        }
      }
    }
    return false
  }

}
