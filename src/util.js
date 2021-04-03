exports.CALL_TYPE = {
  RENDERER: 1, // 渲染进程接口
  MAIN: 2, // 主进程接口
  SOCKET: 3, // socket接口
  NODE: 4 // node进程接口
}


exports.CHANNEL = {
  RESPONSE_RENDERER_TO_MAIN: 'api-response-renderer-to-main',
  RESPONSE_MAIN_TO_RENDERER: 'api-response-main-to-renderer',
  SEND_REGISTER_RENDERER_TO_MAIN: 'api-send-register-renderer-to-main',
  SEND_REQUEST_RENDERER_TO_MAIN: 'api-send-request-renderer-to-main',
  SEND_DESTROY_RENDERER_TO_MAIN: 'api-send-destroy-renderer-to-main',
  SEND_REQUEST_MAIN_TO_RENDERER: 'api-send-request-main-to-renderer',
  SEND_DESTROY_MAIN_TO_RENDERER: 'api-send-destroy-main-to-renderer',
  SEND_BROADCAST: 'api-send-broadcast',
  NO_RESPONSE_BROADCAST: 'api-no-response-broadcast',
  SEND_DESTROY_ALL: 'api-send-destroy-all',
}

exports.composeKey = function (module, api) {
  return `${module}/${api}`
}

exports.decomposeKey = function (key) {
  const seg = key.split('/')
  return {
    module: seg[0],
    api: seg[1]
  }
}

exports.isObject = function (val) {
  return val != null && typeof val === 'object'
}

exports.isArray = Array.isArray


exports.isPromise = function (val) {
  return val && typeof val.then === 'function'
}

exports.assert = function (condition, msg) {
  if (!condition) throw new Error(msg)
}

exports.serializeError = function (e) {
  if (!(e instanceof Error)) return e
  const {message, stack, name, code} = e
  return {
    message,
    stack,
    name,
    code
  }
}

exports.deserializeError = function (obj) {
  if (obj instanceof Error) return obj
  const {message, stack, name, code} = obj
  const e = new Error(message)
  e.stack = stack
  if (name) e.name = name
  if (code) e.code = code
  return e
}

exports.uuid = function (len = 16) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
  let uuid = ''
  for (let i = 0; i < len; i++) uuid += chars[0 | Math.random() * chars.length]
  return uuid
}
