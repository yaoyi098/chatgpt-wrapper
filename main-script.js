const { ipcRenderer } = require("electron");
const urlSetting = document.querySelector("#url-setting");
const proxySetting = document.querySelector("#proxy-setting");
const proxySwitch = document.querySelector("#proxy-switch");
const openDevtool = document.querySelector("#open-devtool");
const information = document.querySelector("#show-information");
const webview = document.querySelector("#webview");

let oldUrlSetting = urlSetting.value;
let oldProxySetting = proxySetting.value;
let proxyOn = false;
let timer = null;
let config = {};

function proxySwitchText() {
  if (proxyOn) {
    proxySwitch.innerHTML = "代理：开";
    setInformation("代理已开启", 3);
    proxySetting.disabled = false;
  } else {
    proxySwitch.innerHTML = "代理：关";
    setInformation("代理已关闭", 3);
    proxySetting.disabled = true;
  }
}

proxySwitchText();

function setInformation(info, seconds = 3) {
  clearTimeout(timer);
  information.innerHTML = info;
  if (seconds !== null) {
    timer = setTimeout(function () {
      information.innerHTML = "";
    }, seconds * 1000);
  }
}

//#region ipc events

ipcRenderer.on("hide-devtool", function (event, args) {
  openDevtool.style.display = "none";
});

ipcRenderer.on("config-changed", function (event, args) {
  config = JSON.parse(args);
  const newProxy = config["proxy"] || "";
  const disabled = config["disabled"] ?? true;
  proxyOn = !disabled;
  oldProxySetting = newProxy;
  proxySetting.value = newProxy;
  proxySwitchText(proxyOn);
  ipcRenderer.send("set-proxy", {
    proxy: proxySetting.value,
    disabled: disabled,
  });
});

ipcRenderer.on("config-response", function (event, args) {
  console.log("event in main script js", event);
  console.log("config-response in main renderer main-script.js and got datas: ", args);
  webview.send("config-response", args);
});

//#endregion

//#region handles

async function setUrlHandle() {
  await openUrlHandle(urlSetting.value);
}

async function openUrlHandle(url) {
  if (oldUrlSetting === url) {
    return;
  }
  if (!url.startsWith("http") || !url.startsWith("https")) {
    url = `https://${url}`;
  }
  await webview.loadURL(url);
  // urlSetting.value = url;
  // oldUrlSetting = url;
  setInformation(`加载：${url}`);
}

function toggleProxyHandle() {
  proxyOn = !proxyOn;
  proxySwitchText();
  if (!proxyOn) {
    // 关闭代理
    oldProxySetting = null;
    proxySetting.disabled = true;
    ipcRenderer.send("set-proxy", { disabled: true });
  } else {
    // 开启代理
    oldProxySetting = proxySetting.value;
    proxySetting.disabled = false;
    ipcRenderer.send("set-proxy", {
      proxy: proxySetting.value,
      disabled: false,
    });
  }
}

function refreshHandle() {
  webview.reloadIgnoringCache();
  setInformation("刷新成功");
}

function clearCacheHandle() {
  ipcRenderer.send("clear-cache", null);
}

function setProxyHandle() {
  let newProxy = proxySetting.value;
  oldProxySetting = newProxy;
  ipcRenderer.send("set-proxy", { proxy: newProxy, disabled: !proxyOn });
  proxySwitchText();
  setInformation("代理更新成功");
}

function openDevtoolHandle() {
  webview.openDevTools();
  ipcRenderer.send("open-devtool", null);
}

function goBackHandle() {
  if (webview.canGoBack()) {
    webview.goBack();
  } else {
    setInformation("已经到第一页", 3);
  }
}

//#endregion

//#region webview events

webview.addEventListener("load-commit", function (e) { });

webview.addEventListener("did-start-loading", function (e) { });

webview.addEventListener("did-finish-load", function (e) {
  setInformation("页面加载完成", 3);
  const url = webview.getURL() || "";
  if (url.startsWith("http:") || url.startsWith("https:")) {
    urlSetting.value = webview.getURL();
    oldUrlSetting = urlSetting.value;
  }
});

//#endregion
