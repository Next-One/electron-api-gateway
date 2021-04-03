import {ModuleConfig, OptionsConfig} from "../config/default";

export function composeKey(module, api) {
  return `${module}/${api}`
}

export function decomposeKey(key) {
  const seg = key.split('/')
  return {
    module: seg[0],
    api: seg[1]
  }
}

export const isArray = Array.isArray
export const isObject = val => val != null && typeof val === "object"
export const isFunction = val => typeof val === "function"
export const isPromise = val => val && typeof val.then === "function"
export const isString = val => typeof val === 'string'
export const isNumber = val => typeof val === 'number'
export const isObjOrArray = val => typeof val === 'string' && '{['.includes(val[0])


export function assert(condition, msg) {
  if (!condition) throw new Error(msg)
}

export function serializeError(e) {
  if (!(e instanceof Error)) return e
  const {message, stack, name, code} = e
  return {
    message,
    stack,
    name,
    code
  }
}

export function deserializeError(obj) {
  if (obj instanceof Error) return obj
  if (!isObject(obj)) return obj
  const {message, stack, name, code} = obj
  const e = new Error(message)
  e.stack = stack
  if (name) e.name = name
  if (code) e.code = code
  return e
}

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')

export function uuid(len = 16) {
  let uuid = ''
  for (let i = 0; i < len; i++) uuid += chars[0 | Math.random() * chars.length]
  return uuid
}

export function stringifyMsg(msg) {
  let {data, code, ...other} = msg
  if (code == null || data == null) return msg
  code = Number(code)
  if (code === 0) {
    data = serializeError(data)
  }
  return {
    code,
    data: isObject(data)
      ? JSON.stringify(data)
      : data == null
        ? ''
        : data,
    ...other
  }
}

export function parseMsg(msg) {
  let {data, code, ...other} = msg
  if (code == null || data == null) return msg
  code = Number(code)
  data = isObjOrArray(data)
    ? JSON.parse(data)
    : data === ''
      ? null
      : data
  if (code === 0) {
    data = deserializeError(data)
  }
  return {
    code,
    data,
    ...other
  }
}

export function makeToken() {
  const token = Date.now() + Math.floor(Math.random() * 3600000) + ''
  return Buffer.from(token).toString('base64')
}

export function decodeToken(token) {
  return Buffer.from(token, 'base64').toString()
}

function validatorLogger(logger, o) {
  if (isObject(logger)) {
    if (isFunction(logger)) {
      o.logger = {
        info: logger,
        error: logger,
        warn: logger
      }
    } else {
      o.logger = {
        info: isFunction(logger.info) ? logger.info : ModuleConfig.logger.info,
        error: isFunction(logger.error) ? logger.error : ModuleConfig.logger.error,
        warn: isFunction(logger.warn) ? logger.warn : ModuleConfig.logger.warn,
      }
    }
  } else {
    o.logger = ModuleConfig.logger
  }
}


function validatorSocketInfo({path, port, host}, o) {
  // 默认优先使用path
  if (isString(path)) {
    o.path = process.platform === 'win32' ? `\\\\?\\pipe\\${path}` : path
  } else if (isNumber(port)) {
    o.port = port
    o.host = isString(host) ? host : 'localhost'
  } else {
    path = ModuleConfig.path
    o.path = process.platform === 'win32' ? `\\\\?\\pipe\\${path}` : path
  }
}

function validatorAuthInfo(rest, o) {
  if (process.type === 'browser') {
    // electron main
    o.userName = rest.userName || ModuleConfig.userName
    o.password = rest.password || ModuleConfig.password
    o.whiteListModule = rest.whiteListModule
    o.isWhiteListModule = true;
  } else {
    // socket client
    o.clientType = OptionsConfig.clientTypes[1]
    o.userName = rest.userName || ModuleConfig.userName
    o.password = rest.password || ModuleConfig.password
    o.isWhiteListModule = rest.isWhiteListModule === true;
  }
}


export function validatorOptions(options) {
  assert((isObject(options) && isString(options.module)) || isString(options),
    `options.module or options expected String, but received ${options}`)
  if (isString(options)) options = {module: options}
  const {logger, module, ...rest} = options
  const o = Object.create(null)
  o.module = module
  o.moduleId = uuid()
  validatorLogger(logger, o)
  if (process.type === 'renderer') {
    // renderer client
    // 如果是渲染进程客户端，验证到此结束直接返回
    o.clientType = OptionsConfig.clientTypes[0]
    return o
  }
  validatorSocketInfo(rest, o)
  validatorAuthInfo(rest, o)
  return o
}

