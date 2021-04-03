import {composeKey} from "../util/common";

/*
* 为Api提供统一封装，主进程与渲染进程的apiInfo不一致
* */
export default class ApiInfo {
  constructor(options) {
    this.module = options.module
    this.api = options.api
    // api对应的回调函数，只有主进程提供的api存在callback
    this.callback = options.callback
      ? new Set([options.callback])
      : new Set()
    // api的类型 由主进程设置，渲染进程不用设置。具体有三种类型的api，c++端api，渲染进程api，主进程api
    this.type = options.type
    // api特有的moduleId 根据该字段确定消息接收者
    this.moduleId = options.moduleId
    // 对应一个进程
    this.client = options.client
  }

  destroy(callback){
    return this.callback.delete(callback)
  }

  has(callback){
    return this.callback.has(callback)
  }

  add(callback){
    this.callback.add(callback)
  }


  // api的唯一标识，不同的API不同由客户端定义
  get key() {
    return composeKey(this.module, this.api)
  }

  toString() {
    return `Api [module: ${this.module}, api: ${this.api}]`
  }


}

