# ApiGateway  设计

## 使用教程

初始化参数

参数有两种形式options 或 string 。如果是options 则参数分为公用参数，server参数，client参数。如果是string，则该参数直接表示module

### 公共参数

1. `module` `string` 模块名，其他模块根据模块名调用该模块，options中的唯一必传参数。其他皆是可选参数。
2. `path` `string`使用一个 `path` 参数来识别 IPC 端点。 在 Unix 上，本地域也称为 Unix 域。 参数 `path` 是文件系统路径名。 在 Windows 上，本地域通过命名管道实现。路径必须是以 `\\?\pipe\` 或 `\\.\pipe\` 为入口。 会识别平台，默认给Windows `path`加上路径前缀，如果`port`和`path`都没有提供，则默认参数为`{path: 'apiGateway'}`
3. `port` `number` 如果是socket端口号
4. `host`  `string`主机ip地址, 默认localhost
5. `userName`  `string`需要登录时的用户名
6. `password`  `string`需要登录时的密码
7. `logger`  `function or Object`  如果是对象需要提供info,error,warn 三个方法用于输出日志，也可以提供任意一个，如果是函数则函数会接收info，error，warn三种日志输出

### server参数

1. `whiteListModule` `array[string]`白名单列表，受信任的模块名，所有electron的渲染进程都在白名单中

### client参数

1. `isWhiteListModule` `boolean` 该模块是不是白名单模块之一，该参数决定是否需要登录，非render进程，默认false。tip: moduleName必须在`whiteListModule`中，仅针对非renderer进程

```
const ApiGatewaySDK = new window.zksdk.ApiGateway({
  module: 'home' // 应用名称
})
```

### 注册 Api

```
参数
  mockApi: 注册的api名称

ApiGatewaySDK.register('mockApi').then(() => {
  console.log('注册成功！')
}).catch(() => {
  console.log('注册失败！')
})
```

### 请求 Api

```
参数
  targetModuleName: 请求的目标应用名
  targetApi: 请求的目标应用的api
  params: 参数

ApiGatewaySDK.request('targetModuleName', 'targetApi', params).then((data) => {
  console.log(data, '目标应用返回结果')
}).catch((e) => {
  console.log(data, '请求异常')
})
```

### 卸载 Api

```
参数
  mockApi: 要卸载的api

ApiGatewaySDK.destroy('mockApi').then((data) => {
  console.log(data, '卸载成功！')
}).catch((e) => {
  console.log(e, '卸载异常！')
})
```

## 问题

1. 客户端是否需要登录验证， token+白名单
2. socket断了怎么处理，token
3. 消息格式不正确如何容错，丢弃不完整消息
4. 同module支持多个api结果如何返回，返回其中一个结果
5. 如何支持重发消息，client：3次重试，server3次重试
6. 用户配置初始化
7. 客户端连接接口判断path还是port
