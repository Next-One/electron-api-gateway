import {MsgType, SerializerConfig} from "../config/default";
// import ProtoDefine from "./Message_pb"
// protoc.exe --js_out=import_style=commonjs,binary:./ ./Message.proto

export class MessageSerializer {
  constructor(proto) {
    this.proto = proto
    this.magic = SerializerConfig.MAGIC
    this.msgLen = 0
    this.cache = SerializerConfig.QUALITY.NO_CACHE
    this.msgType = MsgType.CUSTOM_TYPE
    this.data = null
    this.msg = null // msg对象或者包含msgType的{}
  }


  get head() {
    const {magic, msgLen, cache, proto, msgType} = this
    return Buffer.from(magic + msgLen.toString(16).padStart(SerializerConfig.MSG_DATA.MSG_LEN,'0') + cache + proto + msgType)
  }

  serialize(msg) {
    this.msgType = msg.msgType
    this.data = Buffer.from(JSON.stringify(msg))
    this.msgLen = this.head.length + this.data.length
    return Buffer.concat([this.head, this.data])
  }

  deserialize(msg) {
    if (msg.length > 14 && msg.slice(0, 6).toString() === SerializerConfig.MAGIC) {
      this.msgLen = parseInt(msg.slice(6, 14).toString(), 16)
      if (msg.length >= this.msgLen) {
        this.cache = msg.slice(14, 15).toString()
        this.proto = msg.slice(15, 19).toString()
        this.msgType = msg.slice(19, 23).toString()
        this.data = msg.slice(23, this.msgLen)
        this.msg = this.binary2Object()
        return true
      }
    }
    return false
  }

  binary2Object() {
   /* if (this.proto === ProtoType.PROTOBUF) {
      switch (this.msgType) {
        case MsgType.LOGIN_TYPE:
          return (new ProtoDefine.API.LoginMsg.deserializeBinary(this.data)).toObject()
        case MsgType.HEARTBEAT_TYPE:
          return (new ProtoDefine.API.HeartbeatMsg.deserializeBinary(this.data)).toObject()
        case MsgType.REGISTER_TYPE:
          return (new ProtoDefine.API.RegisterMsg.deserializeBinary(this.data)).toObject()
        case MsgType.REQUEST_TYPE:
          return (new ProtoDefine.API.RequestMsg.deserializeBinary(this.data)).toObject()
        case MsgType.BROADCAST_TYPE:
          return (new ProtoDefine.API.BroadcastMsg.deserializeBinary(this.data)).toObject()
        case MsgType.RESPONSE_TYPE:
          return (new ProtoDefine.API.ResponseMsg.deserializeBinary(this.data)).toObject()
        case MsgType.JSON_TYPE:
          return (new ProtoDefine.API.JsonMsg.deserializeBinary(this.data)).toObject()
        default:
          return null
      }
    }*/
    const msg = JSON.parse(this.data.toString())
    return Object.assign({msgType: this.msgType}, msg)
  }
}

/*

class MessageBase {
  constructor(options) {
    this.options = options
    this.sourceModule = options.sourceModule
    this.sourceId = options.sourceId
    this.timestamp = Date.now().toString()
    this.id = options.id
    this.serializer = options.serializer
  }

}

class LoginMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {password, userName, type} = options
    this.password = password
    this.userName = userName
    this.type = type
    this.serializer.msgType = this.msgType = MsgType.LOGIN_TYPE
  }


  serialize() {
    /!*const msg = new ProtoDefine.API.LoginMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)
    msg.setUserName(this.username)
    msg.setPassword(this.password)
    msg.setType(this.type)*!/
    return this.serializer.serialize(this)
  }

}


class HeartbeatMsg extends MessageBase {
  constructor(options) {
    super(options);
    this.serializer.msgType = this.msgType = MsgType.HEARTBEAT_TYPE
  }

  serialize() {
    /!*const msg = new ProtoDefine.API.HeartbeatMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)*!/
    return this.serializer.serialize(this)
  }
}

class RegisterMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {api, type} = options
    this.api = api
    this.type = type
    this.serializer.msgType = this.msgType = MsgType.REGISTER_TYPE
  }

  serialize() {
    /!* const msg = new ProtoDefine.API.RegisterMsg()
     msg.setMsgType(this.msgType)
     msg.setSourceId(this.sourceId)
     msg.setSourceModule(this.sourceModule)
     msg.setTimestamp(this.timestamp)
     msg.setId(this.id)
     msg.setApi(this.api)
     msg.setType(this.type)*!/
    return this.serializer.serialize(this)
  }
}


class RequestMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {api, back, module, data} = options
    this.data = data
    this.api = api
    this.back = back
    this.module = module
    this.serializer.msgType = this.msgType = MsgType.REQUEST_TYPE
  }

  serialize() {
    /!*const msg = new ProtoDefine.API.RequestMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)
    msg.setApi(this.api)
    msg.setBack(this.back)
    msg.setModule(this.module)
    msg.setData(this.data)*!/
    return this.serializer.serialize(this)
  }
}


class BroadcastMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {api, data} = options
    this.data = data
    this.api = api
    this.serializer.msgType = this.msgType = MsgType.BROADCAST_TYPE
  }

  serialize() {
    /!*const msg = new ProtoDefine.API.BroadcastMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)
    msg.setApi(this.api)
    msg.setData(this.data)*!/
    return this.serializer.serialize(this)
  }
}


class ResponseMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {code, data, status, resType} = options
    this.resType = resType
    this.code = code
    this.data = data
    this.status = status || 200
    this.serializer.msgType = this.msgType = MsgType.BROADCAST_TYPE
  }

  serialize() {
    /!*const msg = new ProtoDefine.API.ResponseMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)
    msg.setCode(this.code)
    msg.setData(this.data)
    msg.setStatus(this.status)
    msg.setResType(this.resType)*!/
    return this.serializer.serialize(this)
  }
}


class JsonMsg extends MessageBase {
  constructor(options) {
    super(options);
    const {type, data} = options
    this.data = data
    this.type = type
    this.serializer.msgType = this.msgType = MsgType.JSON_TYPE
  }

  serialize() {
    /!*const msg = new ProtoDefine.API.JsonMsg()
    msg.setMsgType(this.msgType)
    msg.setSourceId(this.sourceId)
    msg.setSourceModule(this.sourceModule)
    msg.setTimestamp(this.timestamp)
    msg.setId(this.id)
    msg.setType(this.type)
    msg.setData(this.data)*!/
    return this.serializer.serialize(this)
  }
}
*/

/*

export class MsgFactory {
  constructor(proto) {
    this.serializer = new MessageSerializer(proto)
  }

  build(msgType, options) {
    options.serializer = this.serializer
    switch (msgType) {
      case MsgType.LOGIN_TYPE:
        return new LoginMsg(options)
      case MsgType.HEARTBEAT_TYPE:
        return new HeartbeatMsg(options)
      case MsgType.REGISTER_TYPE:
        return new RegisterMsg(options)
      case MsgType.REQUEST_TYPE:
        return new RequestMsg(options)
      case MsgType.BROADCAST_TYPE:
        return new BroadcastMsg(options)
      case MsgType.RESPONSE_TYPE:
        return new ResponseMsg(options)
      case MsgType.JSON_TYPE:
        return new JsonMsg(options)
      default:
        return null
    }
  }
}
*/

