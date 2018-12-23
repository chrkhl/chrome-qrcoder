var tabs = {};

function toggle(tab){
  if(!tabs[tab.id])
    addTab(tab);
  else
    deactivateTab(tab.id);
}

function addTab(tab){
  tabs[tab.id] = Object.create(qrcoder);
  tabs[tab.id].activate(tab);
}

function deactivateTab(id){
  tabs[id].deactivate();
}

function removeTab(id){
  for(var tabId in tabs){
    if(tabId == id)
      delete tabs[tabId];
  }
}

var lastBrowserAction = null;

chrome.browserAction.onClicked.addListener(tab => {
  if(lastBrowserAction && Date.now() - lastBrowserAction < 10){
    // fix bug in Chrome Version 49.0.2623.87
    // that triggers browserAction.onClicked twice 
    // when called from shortcut _execute_browser_action
    return;
  }
  toggle(tab);
  lastBrowserAction = Date.now();
});

chrome.runtime.onConnect.addListener(port => {
  tabs[ port.sender.tab.id ].initialize(port);
});

chrome.runtime.onSuspend.addListener(() => {
  for(let tabId in tabs){
    tabs[tabId].deactivate();
  }
});

chrome.tabs.onUpdated.addListener(tabId => {
  tabs[tabId].deactivate();
});

var qrcoder = {
  alive: true,

  activate: function(tab) {
    this.tab = tab;

    this.onBrowserDisconnectClosure = this.onBrowserDisconnect.bind(this);
    
    chrome.tabs.insertCSS(this.tab.id, { file: '/assets/style.css' });
    chrome.tabs.executeScript(this.tab.id, { file: '/scripts/qrcode.min.js' });
    chrome.tabs.executeScript(this.tab.id, { file: '/scripts/content.js' });
    
    chrome.browserAction.setIcon({ 
      tabId: this.tab.id,
      path: '/assets/icon-active.png'
    });
    
    if (!this.port) return;
    
    this.port.postMessage({ 
      type: 'init'
    });
  },

  deactivate: function(){
    if(!this.port){
      // not yet initialized
      this.alive = false;
      return;
    }

    try {
      this.port.postMessage({ type: 'destroy' });
      this.port.onDisconnect.removeListener(this.onBrowserDisconnectClosure);
    } catch(error) {
      console.error('error', error);
    }

    chrome.browserAction.setIcon({  
      tabId: this.tab.id,
      path: '/assets/icon.png'
    });
    
    window.removeTab(this.tab.id);
  },

  onBrowserDisconnect: function(){
    this.deactivate(true);
  },

  initialize: function(port){
    this.port = port;

    if(!this.alive){
      // was deactivated whilest still booting up
      this.deactivate();
      return;
    }

    this.port.onMessage.addListener(this.receiveBrowserMessageClosure);
    this.port.onDisconnect.addListener(this.onBrowserDisconnectClosure);
    this.port.postMessage({ type: 'init' });
  }
};