import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { LitterDb } from './db'
import { AgentService } from './agent/service'
import { FakeAgentService } from './agent/fake'
import { registerIpc } from './ipc'
import type { AgentEvent } from '@shared/types'

let win: BrowserWindow | null = null
let db: LitterDb | null = null
let agent: AgentService | FakeAgentService | null = null

function emitToRenderer(ev: AgentEvent): void {
  win?.webContents.send('agent:event', ev)
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: 'Litter',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#F3F1EC',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win?.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const libraryDir = path.join(app.getPath('userData'), 'library')
  const dbPath =
    process.env.LITTER_DB_PATH ?? path.join(app.getPath('userData'), 'litter.sqlite3')
  db = new LitterDb(dbPath)

  agent = process.env.LITTER_FAKE_AGENT
    ? new FakeAgentService({ db, emit: emitToRenderer })
    : new AgentService({ db, libraryDir, emit: emitToRenderer })

  registerIpc(db, agent)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  agent?.shutdown()
  db?.close()
})
