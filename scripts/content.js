var port = chrome.runtime.connect({ name: 'qrcoder' });

var qrCoder = (() => {
  const registeredListeners = [];
  const qrContainer = document.createElement('div');
  const qrCode = document.createElement('div');
  const toolbarContainer = document.createElement('div');
  const infobar = document.createElement('div');
  const currentCode = { type: null, text: null };
  let toolbar;
  
  qrCode.setAttribute('class', 'qrcode');
  qrContainer.setAttribute('class', 'qrcoder qrcode-container');
  toolbarContainer.setAttribute('class', 'toolbar');
  infobar.setAttribute('class', 'infobar');
  qrContainer.appendChild(toolbarContainer);
  qrContainer.appendChild(qrCode);
  qrContainer.appendChild(infobar);
  
  const renderInfoBar = () => {
    if (!toolbar.state.infoActive || !currentCode.type) {
      infobar.innerHTML = '';
      return;
    }

    infobar.innerHTML = `
      <img src="${chrome.runtime.getURL(`assets/${currentCode.type}.png`)}" />
      <span title="${currentCode.text}">${currentCode.text}</span>`
  }
  
  const clearQRCode = () => {
    qrCode.innerHTML = '';
    qrCode.setAttribute('title', '');
    currentCode.type = null;
    currentCode.text = null;
    renderInfoBar();
  }
  
  const showQRCodeForText = (type, text, title) => {
    if (!text) {
      clearQRCode();
      return;
    }

    qrContainer.style.display = 'inline-block';
    qrCode.innerHTML = '';
    qrCode.setAttribute('title', '');
    currentCode.type = null;
    currentCode.text = null;
    
    try {
      new QRCode(qrCode, {
        text,
        height: 260,
        width: 260
      });
      qrCode.setAttribute('title', title || text);
      currentCode.type = type;
      currentCode.text = text;
      renderInfoBar();
    } catch(error) {
      qrCode.innerHTML = `
        <img src="${chrome.runtime.getURL('assets/icon-active.png')}" class="error" />
        <br />
        Sorry, could not generate QR Code!`;
      renderInfoBar();
    }
  };
  
  const hideQRCode = () => {
    qrContainer.style.display = 'none';
  };
  
  const showQRCodeForPage = () => {
    showQRCodeForText('home', location.href);
  }

  const showQRCodeForLink = link => {
    if (!toolbar.state.linkActive || toolbar.state.lockActive) return;

    showQRCodeForText('link', link.href, link.innerText);
  }
  
  const showQRCodeForTextSelection = () => {
    if (!toolbar.state.textSelectionActive || toolbar.state.lockActive) return;
    
    const selectedText = window.getSelection().toString();
    showQRCodeForText('text-selection', selectedText);
  }
  
  const createToolbar = () => {
    const toolbarState = {
      lockActive: false,
      textSelectionActive: true,
      linkActive: true,
      infoActive: true
    };
    
    const homeButton = document.createElement('button');
    const lockButton = document.createElement('button');
    const textSelectionButton = document.createElement('button');
    const linkButton = document.createElement('button');
    const infoButton = document.createElement('button');
    
    const update = () => {
      homeButton.innerHTML = `<img src="${chrome.runtime.getURL('assets/home.png')}" />`;
      lockButton.innerHTML = `<img src="${chrome.runtime.getURL(toolbarState.lockActive ? 'assets/lock-closed.png' : 'assets/lock-open.png')}" />`;
      textSelectionButton.innerHTML = `<img src="${chrome.runtime.getURL(toolbarState.textSelectionActive ? 'assets/text-selection-active.png' : 'assets/text-selection.png')}" />`;
      linkButton.innerHTML = `<img src="${chrome.runtime.getURL(toolbarState.linkActive ? 'assets/link-active.png' : 'assets/link.png')}" />`;
      infoButton.innerHTML = `<img src="${chrome.runtime.getURL(toolbarState.infoActive ? 'assets/info-active.png' : 'assets/info.png')}" />`;
    }

    const toggleLockActive = () => {
      toolbarState.lockActive = !toolbarState.lockActive;
      update();
    };

    const toggleTextSelectionActive = () => {
      toolbarState.textSelectionActive = !toolbarState.textSelectionActive;
      update();
    };

    const toggleLinkActive = () => {
      toolbarState.linkActive = !toolbarState.linkActive;
      update();
    };

    const toggleInfoActive = () => {
      toolbarState.infoActive = !toolbarState.infoActive;
      update();
      renderInfoBar();
    };

    const initialize = () => {
      toolbarContainer.appendChild(homeButton);
      toolbarContainer.appendChild(lockButton);
      toolbarContainer.appendChild(textSelectionButton);
      toolbarContainer.appendChild(linkButton);
      toolbarContainer.appendChild(infoButton);
      homeButton.addEventListener('click', showQRCodeForPage);
      lockButton.addEventListener('click', toggleLockActive);
      textSelectionButton.addEventListener('click', toggleTextSelectionActive);
      linkButton.addEventListener('click', toggleLinkActive);
      infoButton.addEventListener('click', toggleInfoActive);
      update();
    }

    const destroy = () => {
      homeButton.removeEventListener('click', showQRCodeForPage);
      lockButton.removeEventListener('click', toggleLockActive);
      textSelectionButton.removeEventListener('click', toggleTextSelectionActive);
      linkButton.removeEventListener('click', toggleLinkActive);
      infoButton.removeEventListener('click', toggleInfoActive);
      toolbarContainer.innerHTML = '';
    }
    
    return {
      initialize,
      destroy,
      state: toolbarState
    };
  }

  const addMouseOverListeners = link => {
    const listener = () => showQRCodeForLink(link);

    link.addEventListener('mouseover', listener);
    
    registeredListeners.push({
      link,
      mouseover: listener
    });
  };
  
  const init = () => {
    document.addEventListener('selectionchange', showQRCodeForTextSelection);
    document.querySelectorAll('a').forEach(addMouseOverListeners);
    document.body.appendChild(qrContainer);
    
    toolbar = createToolbar();
    toolbar.initialize();
    
    showQRCodeForPage();
  };
  
  const destroy = () => {
    document.removeEventListener('selectionchange', showQRCodeForTextSelection);
    
    registeredListeners.forEach(listener => {
      listener.link.removeEventListener('mouseover', listener.mouseover);
    })
    
    toolbar.destroy();
    document.body.removeChild(qrContainer);
  };

  return {
    init, destroy
  };
})();

port.onMessage.addListener(function(event){
  switch(event.type) {
    case 'init': {
      qrCoder.init();
      break;
    }
    case 'destroy':
      qrCoder.destroy();
      break;
    }
  }
);