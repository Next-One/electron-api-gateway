const {composeKey} = require("./util");

/*
* 为Api提供统一封装，主进程与渲染进程的apiInfo不一致
* */
class ApiInfo {
  constructor(options) {
    this._module = options.module
    this.api = options.api
    // api对应的回调函数，只有主进程提供的api存在callback
    this.callback = options.callback
    // api的类型 由主进程设置，渲染进程不用设置。具体有三种类型的api，c++端api，渲染进程api，主进程api
    this.type = options.type
    // 渲染进程 api特有的窗口Id
    this.windowId = options.windowId
  }

  get module() {
    return this._module
  }

  // api的唯一标识，不同的API不同由客户端定义
  get key() {
    return composeKey(this.module, this.api)
  }

  toString() {
    return `Api [module: ${this.module}, api: ${this.api}]`
  }


}

module.exports = ApiInfo
