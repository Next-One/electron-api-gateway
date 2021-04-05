/*
module.exports = require(process.type === 'browser'
  ? './ApiServer/ApiGateway'
  : './ApiClient/ApiClient')
*/

import createApiServer from './ApiServer/ApiGateway'
import createApiClient from './ApiClient/ApiClient'

export {
  createApiServer,
  createApiClient
}
