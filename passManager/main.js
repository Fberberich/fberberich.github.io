const { app, BrowserWindow, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const CryptoJS = require('crypto-js')
const keytar = require('keytar')

let mainWindow
const DB_FILE = path.join(app.getPath('userData'), 'passwords.json')
const SERVICE_NAME = 'PasswordManager'
const CREDENTIAL_NAME = 'encryption-key'

// Get or create encryption key
async function getEncryptionKey() {
  let key = await keytar.getPassword(SERVICE_NAME, CREDENTIAL_NAME)
  if (!key) {
    // Generate a new random key if none exists
    key = CryptoJS.lib.WordArray.random(32).toString()
    await keytar.setPassword(SERVICE_NAME, CREDENTIAL_NAME, key)
  }
  return key
}

// Initialize database if it doesn't exist
function initializeDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]))
  }
}

// Encrypt password
async function encryptPassword(password) {
  const key = await getEncryptionKey()
  return CryptoJS.AES.encrypt(password, key).toString()
}

// Decrypt password
async function decryptPassword(encryptedPassword) {
  const key = await getEncryptionKey()
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// Read passwords from database
async function readPasswords() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8')
    const passwords = JSON.parse(data)
    // Decrypt passwords when reading
    const decryptedPasswords = []
    for (const pwd of passwords) {
      const decryptedPassword = await decryptPassword(pwd.password)
      decryptedPasswords.push({
        ...pwd,
        password: decryptedPassword
      })
    }
    return decryptedPasswords
  } catch (error) {
    console.error('Error reading passwords:', error)
    return []
  }
}

// Write passwords to database
async function writePasswords(passwords) {
  try {
    // Encrypt passwords before saving
    const encryptedPasswords = []
    for (const pwd of passwords) {
      const encryptedPassword = await encryptPassword(pwd.password)
      encryptedPasswords.push({
        ...pwd,
        password: encryptedPassword
      })
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(encryptedPasswords, null, 2))
  } catch (error) {
    console.error('Error writing passwords:', error)
  }
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
  initializeDB()
  createWindow()
})

// Handle IPC messages
ipcMain.on('save-password', async (event, passwordData) => {
  const passwords = await readPasswords()
  passwords.push(passwordData)
  await writePasswords(passwords)
  event.reply('passwords-updated', passwords)
})

ipcMain.on('get-passwords', async (event) => {
  const passwords = await readPasswords()
  event.reply('passwords-updated', passwords)
})

ipcMain.on('search-passwords', async (event, searchTerm) => {
  const passwords = await readPasswords()
  const filteredPasswords = passwords.filter(pwd => 
    pwd.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pwd.username.toLowerCase().includes(searchTerm.toLowerCase())
  )
  event.reply('passwords-updated', filteredPasswords)
})

ipcMain.on('delete-password', async (event, service) => {
  const passwords = await readPasswords()
  const updatedPasswords = passwords.filter(pwd => pwd.service !== service)
  await writePasswords(updatedPasswords)
  event.reply('passwords-updated', updatedPasswords)
})

ipcMain.on('clear-passwords', (event) => {
  writePasswords([])
  event.reply('passwords-updated', [])
})