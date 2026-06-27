import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initDb } from './db/schema'
import { registrarProductos } from './ipc/productos'
import { registrarMateriasPrimas } from './ipc/materiasPrimas'
import { registrarProveedores } from './ipc/proveedores'
import { registrarClientes } from './ipc/clientes'
import { registrarPresupuestos } from './ipc/presupuestos'
import { registrarFacturas } from './ipc/facturas'
import { registrarOrdenesCompra } from './ipc/ordenesCompra'
import { registrarFabricacion } from './ipc/fabricacion'
import { registrarDashboard } from './ipc/dashboard'
import { registrarCaja } from './ipc/caja'
import { registrarEstadisticas } from './ipc/estadisticas'
import { registrarReportes } from './ipc/reportes'
import { registrarAdmin } from './ipc/admin'
import { registrarRemitos } from './ipc/remitos'
import { registrarAjustes } from './ipc/ajustes'

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Fijarap - Sistema de Gestión',
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDb()

  registrarProductos()
  registrarMateriasPrimas()
  registrarProveedores()
  registrarClientes()
  registrarPresupuestos()
  registrarFacturas()
  registrarOrdenesCompra()
  registrarFabricacion()
  registrarDashboard()
  registrarCaja()
  registrarEstadisticas()
  registrarReportes()
  registrarAdmin()
  registrarRemitos()
  registrarAjustes()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
