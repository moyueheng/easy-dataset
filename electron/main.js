const { app, BrowserWindow, dialog, shell, ipcMain, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const { updateDatabase } = require('./db-updater');
const { getAppVersion } = require('./util');
const { promises: fsPromises } = require('fs');
const os = require('os');

function setupLogging() {
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFilePath = path.join(logDir, `app-${new Date().toISOString().slice(0, 10)}.log`);

  // 创建自定义日志函数
  global.appLog = (message, level = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    // 同时输出到控制台和日志文件
    console.log(message);
    fs.appendFileSync(logFilePath, logEntry);
  };

  // 捕获全局未处理异常并记录
  process.on('uncaughtException', error => {
    global.appLog(`未捕获的异常: ${error.stack || error}`, 'error');
  });

  return logFilePath;
}

// 检查端口是否被占用
const checkPort = port => {
  return new Promise(resolve => {
    const server = http.createServer();
    server.once('error', () => {
      resolve(true); // 端口被占用
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // 端口未被占用
    });
    server.listen(port);
  });
};

// 是否是开发环境
const isDev = process.env.NODE_ENV === 'development';
const port = 1717;
let mainWindow;
let nextApp;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/imgs/logo.ico')
  });

  // 设置窗口标题
  mainWindow.setTitle(`Easy Dataset v${getAppVersion()}`);
  const loadingPath = url.format({
    pathname: path.join(__dirname, 'loading.html'),
    protocol: 'file:',
    slashes: true
  });
  // 加载 loading 页面时使用专门的 preload 脚本
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(loadingPath);

  // 在开发环境中加载 localhost URL
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${port}`);
    mainWindow.webContents.openDevTools();
  } else {
    // 在生产环境中启动 Next.js 服务
    startNextServer().then(url => {
      mainWindow.loadURL(url);
    });
  }

  // 处理窗口导航事件，将外部链接在浏览器中打开
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // 解析当前 URL 和导航 URL
    const parsedUrl = new URL(navigationUrl);
    const currentHostname = isDev ? 'localhost' : 'localhost';
    const currentPort = port.toString();

    // 检查是否是外部链接
    if (parsedUrl.hostname !== currentHostname || (parsedUrl.port !== currentPort && parsedUrl.port !== '')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // 处理新窗口打开请求，将外部链接在浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url: navigationUrl }) => {
    // 解析导航 URL
    const parsedUrl = new URL(navigationUrl);
    const currentHostname = isDev ? 'localhost' : 'localhost';
    const currentPort = port.toString();

    // 检查是否是外部链接
    if (parsedUrl.hostname !== currentHostname || (parsedUrl.port !== currentPort && parsedUrl.port !== '')) {
      shell.openExternal(navigationUrl);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // 创建菜单
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.maximize();
}

// 清除缓存函数 - 清理logs和local-db目录
async function clearCache() {
  // 清理日志目录
  const logsDir = path.join(app.getPath('userData'), 'logs');
  if (fs.existsSync(logsDir)) {
    // 读取目录下所有文件
    const files = await fsPromises.readdir(logsDir);
    // 删除所有文件
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      await fsPromises.unlink(filePath);
      global.appLog(`已删除日志文件: ${filePath}`);
    }
  }

  // 清理local-db目录，保留db.sqlite文件
  const localDbDir = path.join(app.getPath('userData'), 'local-db');
  if (fs.existsSync(localDbDir)) {
    // 读取目录下所有文件
    const files = await fsPromises.readdir(localDbDir);
    // 删除除了db.sqlite之外的所有文件
    for (const file of files) {
      if (file !== 'db.sqlite') {
        const filePath = path.join(localDbDir, file);
        const stat = await fsPromises.stat(filePath);
        if (stat.isFile()) {
          await fsPromises.unlink(filePath);
          global.appLog(`已删除数据库缓存文件: ${filePath}`);
        } else if (stat.isDirectory()) {
          // 如果是目录，可能需要递归删除，根据需求决定
          // 这里简单实现，如果需要递归删除，可以使用fs-extra等库
          global.appLog(`跳过目录: ${filePath}`);
        }
      }
    }
  }
  return true;
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'quit', label: 'Quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', label: 'Refresh' },
        { type: 'separator' },
        { role: 'resetzoom', label: 'Reset Zoom' },
        { role: 'zoomin', label: 'Zoom In' },
        { role: 'zoomout', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Fullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: 'About Easy Dataset',
              message: `Easy Dataset v${getAppVersion()}`,
              detail: 'An application for creating fine-tuning datasets for large models.',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Visit GitHub',
          click: () => {
            shell.openExternal('https://github.com/ConardLi/easy-dataset');
          }
        }
      ]
    },
    ,
    {
      label: 'More',
      submenu: [
        { role: 'toggledevtools', label: 'Developer Tools' },
        {
          label: 'Open Logs Directory',
          click: () => {
            const logsDir = path.join(app.getPath('userData'), 'logs');
            if (!fs.existsSync(logsDir)) {
              fs.mkdirSync(logsDir, { recursive: true });
            }
            shell.openPath(logsDir);
          }
        },
        {
          label: 'Open Data Directory',
          click: () => {
            const dataDir = path.join(app.getPath('userData'), 'local-db');
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            shell.openPath(dataDir);
          }
        },
        {
          label: 'Open Data Directory (History)',
          click: () => {
            const dataDir = path.join(os.homedir(), '.easy-dataset-db');
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            shell.openPath(dataDir);
          }
        },
        {
          label: 'Clear Cache',
          click: async () => {
            try {
              const response = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['Cancel', 'Confirm'],
                defaultId: 1,
                title: 'Clear Cache',
                message: 'Are you sure you want to clear the cache?',
                detail:
                  'This will delete all files in the logs directory and local database cache files (excluding main database files).'
              });

              if (response.response === 1) {
                // User clicked confirm
                await clearCache();
                dialog.showMessageBox(mainWindow, {
                  type: 'info',
                  title: 'Cleared Successfully',
                  message: 'Cache has been cleared successfully'
                });
              }
            } catch (error) {
              global.appLog(`Failed to clear cache: ${error.message}`, 'error');
              dialog.showErrorBox('Failed to clear cache', error.message);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 启动 Next.js 服务
async function startNextServer() {
  console.log(`Easy Dataset 客户端启动中，当前版本: ${getAppVersion()}`);

  // 设置日志文件路径
  const logDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, `nextjs-${new Date().toISOString().replace(/:/g, '-')}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  // 重定向 console.log 和 console.error
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  console.log = function () {
    const args = Array.from(arguments);
    const logMessage = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ');

    logStream.write(`[${new Date().toISOString()}] [LOG] ${logMessage}\n`);
    originalConsoleLog.apply(console, args);
  };

  console.error = function () {
    const args = Array.from(arguments);
    const logMessage = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ');

    logStream.write(`[${new Date().toISOString()}] [ERROR] ${logMessage}\n`);
    originalConsoleError.apply(console, args);
  };

  // 检查端口是否被占用
  const isPortBusy = await checkPort(port);
  if (isPortBusy) {
    console.log(`端口 ${port} 已被占用，尝试直接连接...`);
    return `http://localhost:${port}`;
  }

  console.log(`启动 Next.js 服务，端口: ${port}`);

  try {
    // 动态导入 Next.js
    const next = require('next');
    nextApp = next({
      dev: false,
      dir: path.join(__dirname, '..'),
      conf: {
        // 配置 Next.js 的日志输出
        onInfo: info => {
          console.log(`[Next.js Info] ${info}`);
        },
        onError: error => {
          console.error(`[Next.js Error] ${error}`);
        },
        onWarn: warn => {
          console.log(`[Next.js Warning] ${warn}`);
        }
      }
    });
    const handle = nextApp.getRequestHandler();

    await nextApp.prepare();

    const server = http.createServer((req, res) => {
      // 记录请求日志
      console.log(`[Request] ${req.method} ${req.url}`);
      handle(req, res);
    });

    return new Promise(resolve => {
      server.listen(port, err => {
        if (err) throw err;
        console.log(`服务已启动，正在打开应用...`);
        resolve(`http://localhost:${port}`);
      });
    });
  } catch (error) {
    console.error('启动服务失败:', error);
    dialog.showErrorBox('启动失败', `无法启动 Next.js 服务: ${error.message}`);
    app.quit();
    return '';
  }
}

// 自动更新配置
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.allowDowngrade = false;

  // 检查更新时出错
  autoUpdater.on('error', error => {
    // dialog.showErrorBox('更新错误', `检查更新时出错: ${error.message}`);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message);
    }
  });

  // 检查到更新时
  autoUpdater.on('update-available', info => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  // 没有可用更新
  autoUpdater.on('update-not-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  // 下载进度
  autoUpdater.on('download-progress', progressObj => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  // 下载完成
  autoUpdater.on('update-downloaded', info => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });
}

// 设置 IPC 处理程序
ipcMain.on('get-user-data-path', event => {
  event.returnValue = app.getPath('userData');
});

// 检查更新
ipcMain.handle('check-update', async () => {
  try {
    if (isDev) {
      // 开发环境下模拟更新检查
      return {
        hasUpdate: false,
        currentVersion: getAppVersion(),
        message: '开发环境下不检查更新'
      };
    }

    // 返回当前版本信息，并开始检查更新
    const result = await autoUpdater.checkForUpdates();
    return {
      checking: true,
      currentVersion: getAppVersion()
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    return {
      hasUpdate: false,
      currentVersion: getAppVersion(),
      error: error.message
    };
  }
});

// 下载更新
ipcMain.handle('download-update', async () => {
  try {
    autoUpdater.downloadUpdate();
    return { downloading: true };
  } catch (error) {
    console.error('下载更新失败:', error);
    return { error: error.message };
  }
});

// 安装更新
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
  return { installing: true };
});

// 当 Electron 完成初始化时创建窗口
app.whenReady().then(async () => {
  // 在 app.whenReady 前调用
  const logFilePath = setupLogging();

  try {
    // 设置数据库路径
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'local-db');
    const dbFilePath = path.join(dataDir, 'db.sqlite');
    const dbJSONPath = path.join(dataDir, 'db.json');
    fs.writeFileSync(path.join(process.resourcesPath, 'root-path.txt'), dataDir);

    // 确保数据目录存在
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`数据目录已创建: ${dataDir}`);
    }

    // 设置数据库连接字符串 (Prisma 格式)
    const dbConnectionString = `file:${dbFilePath}`;
    process.env.DATABASE_URL = dbConnectionString;

    // 仅在开发环境记录日志
    const logs = {
      userDataPath,
      dataDir,
      dbFilePath,
      dbConnectionString,
      dbExists: fs.existsSync(dbFilePath)
    };
    global.appLog(`数据库配置: ${JSON.stringify(logs)}`);

    if (!fs.existsSync(dbFilePath)) {
      global.appLog('数据库文件不存在，正在初始化...');

      try {
        const resourcePath =
          process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '..', 'prisma', 'template.sqlite')
            : path.join(process.resourcesPath, 'prisma', 'template.sqlite');

        const resourceJSONPath =
          process.env.NODE_ENV === 'development'
            ? path.join(__dirname, '..', 'prisma', 'sql.json')
            : path.join(process.resourcesPath, 'prisma', 'sql.json');

        global.appLog(`resourcePath: ${resourcePath}`);

        if (fs.existsSync(resourcePath)) {
          fs.copyFileSync(resourcePath, dbFilePath);
          global.appLog(`数据库已从模板初始化: ${dbFilePath}`);
        }

        if (fs.existsSync(resourceJSONPath)) {
          fs.copyFileSync(resourceJSONPath, dbJSONPath);
          global.appLog(`数据库SQL配置已初始化: ${dbJSONPath}`);
        }
      } catch (error) {
        console.error('数据库初始化失败:', error);
        dialog.showErrorBox('数据库初始化失败', `应用无法初始化数据库，可能需要重新安装。\n错误详情: ${error.message}`);
      }
    } else {
      // 数据库文件存在，检查是否需要更新
      global.appLog('检查数据库是否需要更新...');
      try {
        const resourcesPath =
          process.env.NODE_ENV === 'development' ? path.join(__dirname, '..') : process.resourcesPath;

        const isDev = process.env.NODE_ENV === 'development';

        // 更新数据库
        const result = await updateDatabase(userDataPath, resourcesPath, isDev, global.appLog);

        if (result.updated) {
          global.appLog(`数据库更新成功: ${result.message}`);
          global.appLog(`执行的版本: ${result.executedVersions.join(', ')}`);
        } else {
          global.appLog(`数据库无需更新: ${result.message}`);
        }
      } catch (error) {
        console.error('数据库更新失败:', error);
        global.appLog(`数据库更新失败: ${error.message}`, 'error');

        // 非致命错误，只提示但不阻止应用启动
        dialog.showMessageBox({
          type: 'warning',
          title: '数据库更新警告',
          message: '数据库更新过程中出现错误，部分功能可能受影响。',
          detail: `错误详情: ${error.message}\n\n您可以继续使用应用，但如果遇到问题，请重新安装应用。`,
          buttons: ['继续']
        });
      }
    }
  } catch (error) {
    console.error('应用初始化过程中发生错误:', error);
    dialog.showErrorBox(
      '应用初始化错误',
      `启动过程中发生错误，可能影响应用功能。
错误详情: ${error.message}`
    );
  }

  createWindow();
  // 设置自动更新
  setupAutoUpdater();

  // 应用启动完成后的一段时间后自动检查更新
  setTimeout(() => {
    if (!isDev) {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('自动检查更新失败:', err);
      });
    }
  }, 10000); // 10秒后检查更新
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  if (nextApp) {
    console.log('正在关闭 Next.js 服务...');
    // 这里可以添加清理 Next.js 服务的代码
  }
});

ipcMain.on('log', (event, { level, message }) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  // 只在客户端环境下写入文件
  if (!isDev || true) {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logEntry);
  }

  // 同时输出到控制台
  console[level](message);
});
