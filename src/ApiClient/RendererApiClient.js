import {MsgType} from "../config/default";
import {stringifyMsg} from "../util/common";
import {ipcRenderer, remote} from 'electron'


export default class RendererApiClient {
  constructor(apiClient) {
    this.apiClient = apiClient
    this.logger = apiClient.logger
    this.client = remote.getCurrentWindow()
    apiClient.moduleId = this.client.id
    this.onMainMessage = (event, msg) => this.apiClient._onMessage(msg)
  }

  start() {
    ipcRenderer.on('main-message', this.onMainMessage)
    this.client.on('close', this.close.bind(this))
  }

  close() {
    this.logout()
    ipcRenderer.removeListener('main-message', this.onMainMessage)
  }

  logout() {
    this.send({
      type: 0,
      id: this.apiClient.msgId,
      userName: '',
      password: '',
      msgType: MsgType.LOGIN_TYPE
    })
  }


  send(msg) {
    msg = stringifyMsg(msg)
    ipcRenderer.send('renderer-message', Object.assign(msg, this.apiClient.headMsg))
  }

}
