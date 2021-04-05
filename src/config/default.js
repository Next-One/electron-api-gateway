import {uuid} from "../util/common";

export const ModuleConfig = {
  module: 'clientModule',
  moduleId: uuid(),
  path: 'apiGateway',
  port: 29292,
  host: 'localhost',
  isWhiteListModule: true, // 客户端配置是否需要登录,仅在socket client时生效 默认为true
  userName: 'test', // 仅在`supportSocket` 为true生效
  password: 'test123', // 仅在`supportSocket` 为true生效
  whiteListModule: [],
  serializeType: 'json', // 消息序列化方式：json 或者 protobuf
  maxMessageSize: 1024 * 200,
  logger: {
    info: console.log,
    warn: console.warn,
    error: console.error
  }
}


export const CallType = {
  RENDERER: 1, // 渲染进程接口
  MAIN: 2, // 主进程接口
  SOCKET: 3, // socket接口
  NODE: 4 // node进程接口
}


export const ProtoType = {
  JSON: '0101',
  PROTOBUF: '0201'
}

export const MsgType = {
  // * 16进制字符串表示，固定长度4个字节
  LOGIN_TYPE: '0001', // * 登陆
  LOGOUT_TYPE: '0002', // * 登出
  HEARTBEAT_TYPE: '0003', // * 心跳
  REGISTER_TYPE: '0004', // * 注册api，与卸载同api仅参数区别
  DESTROY_TYPE: '0005', // * 注册api，与卸载同api仅参数区别
  REQUEST_TYPE: '0006', // * 请求api
  BROADCAST_TYPE: '0007', // * 广播api
  RESPONSE_TYPE: '0008', // * 响应消息
  JSON_TYPE: '0009', // * json消息
  CUSTOM_TYPE: '0064', // * 100 自定义请求，用户自定义的请求必须>=100
}


export const SerializerConfig = {
  MAGIC: '#api!#',
  HAS_TOKEN: {
    YES: '1',
    NO: '0'
  },
  QUALITY: {
    CACHE: '1',
    NO_CACHE: '0'
  },
  MSG_DATA: {
    MSG_LEN: 8,
    DEF_LEN_STR: '00000000',
    MSG_ID_LEN: 16,
    MSG_TYPE_LEN: 4,
    TOKEN_LEN: 20 // 取决于hasToken的值
  },
  PROTO_TYPE: ProtoType
}
