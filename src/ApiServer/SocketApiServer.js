import * as net from "net";
import SocketApiClient from "./SocketApiClient";

export default class SocketApiServer {
  constructor(apiGateway) {
    this.apiGateway = apiGateway
    this.logger = apiGateway.logger
    this.clientMap = new Map()
    this.clientSet = new Set()
  }

  start() {
    this.server = net.createServer(socket => {
      const client = new SocketApiClient(this.apiGateway, socket, this)
      client.start()
      this.clientSet.add(client)
    })
    const params = this.apiGateway.options.path
      ? {path: this.apiGateway.options.path}
      : {port: this.apiGateway.options.port, host: this.apiGateway.options.host}
    this.server.listen(params)
  }

  close(){
    for (const client of this.clientSet) {
      client.socket.close()
    }
    this.server.close()
  }


  addClient(moduleId, module, client) {
    if (!this.clientMap.has(moduleId)) {
      client.module = module
      client.moduleId = moduleId
      this.clientMap.set(moduleId, client)
    }
  }

  removeClient(moduleId) {
    const client = this.clientMap.get(moduleId)
    if (client) {
      this.clientSet.delete(client)
      this.clientMap.delete(moduleId)
    }
  }

}

