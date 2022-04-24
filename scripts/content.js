var port = chrome.runtime.connect({ name: 'qrcoder' });

var qrCoder = (() => {
  const registeredListeners = [];
  const qrCodeOverlay = document.createElement('div');
  const qrContainer = document.createElement('div');
  const qrCode = document.createElement('div');
  const toolbarContainer = document.createElement('div');
  const infobar = document.createElement('div');
  const currentCode = { type: null, text: null, title: null };
  const positionMap = {
    Digit1: { posX: 'left', posY: 'top'},
    Digit2: { posX: 'center', posY: 'top'},
    Digit3: { posX: 'right', posY: 'top'},
    Digit4: { posX: 'left', posY: 'center'},
    Digit5: { posX: 'center', posY: 'center'},
    Digit6: { posX: 'right', posY: 'center'},
    Digit7: { posX: 'left', posY: 'bottom'},
    Digit8: { posX: 'center', posY: 'bottom'},
    Digit9: { posX: 'right', posY: 'bottom'}
  };
  let fullsize = false;
  let currentSettings = null;
  let toolbar;

  qrCode.setAttribute('class', 'qrcode');
  qrContainer.setAttribute('class', 'qrcoder qrcode-container');
  qrCodeOverlay.setAttribute('class', 'qrcoder qrcode-overlay');
  toolbarContainer.setAttribute('class', 'qrcoder-toolbar');
  infobar.setAttribute('class', 'qrcoder-infobar');
  qrContainer.appendChild(toolbarContainer);
  qrContainer.appendChild(qrCode);
  qrContainer.appendChild(infobar);

  const setQRCodePosition = () => {
    let positionStyle = 'display:inline-block;';
    const leftCenter = (window.innerWidth - qrContainer.clientWidth) / 2;
    const topCenter = (window.innerHeight - qrContainer.clientHeight) / 2;

    if (fullsize) {
      positionStyle += `left:${leftCenter}px;`;
      positionStyle += `top:${topCenter}px;`;
    }
    else {
      if (currentSettings.posX === 'left') {
        positionStyle += 'left:20px;';
      } else if (currentSettings.posX === 'center') {
        positionStyle += `left:${leftCenter}px;`;
      } else {
        positionStyle += `left:${window.innerWidth - qrContainer.clientWidth - 20}px;`;
      }

      if (currentSettings.posY === 'bottom') {
        positionStyle += `top:${window.innerHeight - qrContainer.clientHeight - 20}px;`;
      } else if (currentSettings.posY === 'center') {
        positionStyle += `top:${topCenter}px;`;
      } else {
        positionStyle += 'top:20px;';
      }
    }

    qrContainer.setAttribute('style', positionStyle);
  };

  const updateSettings = (key, value) => {
    currentSettings[key] = value;
    chrome.storage.sync.set({'qrcoder.settings': JSON.stringify(currentSettings)});
  }

  const renderInfoBar = () => {
    if (!currentCode.type) {
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

  const getQRCodeSize = () => {
    const length = fullsize ?
      (Math.min(window.innerWidth, window.innerHeight) - 180) :
      300;

    return { width: length, height: length };
  }

  const showQRCodeForText = (type, text, title) => {
    if (!text) {
      clearQRCode();
      return;
    }

    const size = getQRCodeSize();
    qrContainer.style.display = 'inline-block';
    qrCode.innerHTML = '';
    qrCode.setAttribute('title', '');
    currentCode.type = null;
    currentCode.text = null;
    infobar.setAttribute('style', `max-width:${size.width}px;`);

    try {
      new QRCode(qrCode, {
        ...size,
        text
      });
      qrCode.setAttribute('title', title || text);
      currentCode.type = type;
      currentCode.text = text;
      currentCode.title = title;
      renderInfoBar();
    } catch(error) {
      qrCode.innerHTML = `
        <img src="${chrome.runtime.getURL('assets/icon-active.png')}" class="qrcoder-error" />
        <br />
        <span class="qrcoder-error">Sorry, could not generate QR Code!</span>`;
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
    if (!currentSettings.linkActive || currentSettings.lockActive) return;

    showQRCodeForText('link', link.href, link.innerText);
  }

  const showQRCodeForTextSelection = () => {
    if (!currentSettings.textSelectionActive || currentSettings.lockActive) return;

    const selectedText = window.getSelection().toString();

    if (!selectedText) {
      return showQRCodeForPage();
    }
    showQRCodeForText('text-selection', selectedText);
  }

  const handleWindowResize = () => {
    showQRCodeForText(currentCode.type, currentCode.text, currentCode.title);
    setQRCodePosition();
  }

  const toggleFullsize = newValue => {
    fullsize = newValue;
    qrCodeOverlay.style.display = fullsize ? 'block' : 'none';
    showQRCodeForText(currentCode.type, currentCode.text, currentCode.title);
    setQRCodePosition();
    toolbar.update();
  }

  const createToolbar = () => {
    const info = document.createElement('div');
    const homeButton = document.createElement('button');
    const lockButton = document.createElement('button');
    const textSelectionButton = document.createElement('button');
    const linkButton = document.createElement('button');
    const fullsizeButton = document.createElement('button');

    const setButtonImages = () => {
      homeButton.innerHTML = `<img src="${chrome.runtime.getURL('assets/home.png')}" />`;
      lockButton.innerHTML = `<img src="${chrome.runtime.getURL(currentSettings.lockActive ? 'assets/lock-closed.png' : 'assets/lock-open.png')}" />`;
      textSelectionButton.innerHTML = `<img src="${chrome.runtime.getURL(currentSettings.textSelectionActive ? 'assets/text-selection-active.png' : 'assets/text-selection.png')}" />`;
      linkButton.innerHTML = `<img src="${chrome.runtime.getURL(currentSettings.linkActive ? 'assets/link-active.png' : 'assets/link.png')}" />`;
      fullsizeButton.innerHTML = `<img src="${chrome.runtime.getURL(fullsize ? 'assets/fullsize-active.png' : 'assets/fullsize.png')}" />`;
    }

    const setButtonTitles = () => {
      homeButton.setAttribute('title', 'Generate QR Code for the current page URL.\nShortcut: [ALT] + [H]');
      lockButton.setAttribute('title', `${currentSettings['lockActive'] ? 'Unlock' : 'Lock'} current QR Code.\nShortcut: [ALT] + [L]`);
      textSelectionButton.setAttribute('title', `${currentSettings['textSelectionActive'] ? 'Deactivate' : 'Activate'} QR Code generation for text selection changes.\nShortcut: [ALT] + [T]`);
      linkButton.setAttribute('title', `${currentSettings['linkActive'] ? 'Deactivate' : 'Activate'} QR Code generation for link hovering.\nShortcut: [ALT] + [U]`);
      fullsizeButton.setAttribute('title', `${fullsize ? 'Deactivate' : 'Activate'} fullsize QR Code.\nShortcut: [ALT] + [F]`);
    }

    const update = () => {
      setButtonImages();
      setButtonTitles();
    }

    const toggleLockActive = () => {
      updateSettings('lockActive', !currentSettings.lockActive);
      update();
    };

    const toggleTextSelectionActive = () => {
      updateSettings('textSelectionActive', !currentSettings.textSelectionActive);
      update();
    };

    const toggleLinkActive = () => {
      updateSettings('linkActive', !currentSettings.linkActive);
      update();
    };

    const toolbarToggleFullsize = () => {
      toggleFullsize(!fullsize);
    }

    const initialize = () => {
      info.setAttribute('class', 'qrcoder-info');
      info.innerHTML = `<a href="https://github.com/chrkhl/chrome-qrcoder/blob/master/readme.md" class="qrcoder-link" target="_blank"><img class="qrcoder-logo" src="${chrome.runtime.getURL('assets/icon-active.png')}" /> QRCoder</a>`;

      toolbarContainer.appendChild(info);
      toolbarContainer.appendChild(homeButton);
      toolbarContainer.appendChild(textSelectionButton);
      toolbarContainer.appendChild(linkButton);
      toolbarContainer.appendChild(lockButton);
      toolbarContainer.appendChild(fullsizeButton);

      homeButton.setAttribute('class', 'qrcoder-button');
      lockButton.setAttribute('class', 'qrcoder-button');
      textSelectionButton.setAttribute('class', 'qrcoder-button');
      linkButton.setAttribute('class', 'qrcoder-button');
      fullsizeButton.setAttribute('class', 'qrcoder-button');

      homeButton.addEventListener('click', showQRCodeForPage);
      lockButton.addEventListener('click', toggleLockActive);
      textSelectionButton.addEventListener('click', toggleTextSelectionActive);
      linkButton.addEventListener('click', toggleLinkActive);
      fullsizeButton.addEventListener('click', toolbarToggleFullsize);

      window.addEventListener('resize', handleWindowResize);
      update();
    }

    const destroy = () => {
      homeButton.removeEventListener('click', showQRCodeForPage);
      lockButton.removeEventListener('click', toggleLockActive);
      textSelectionButton.removeEventListener('click', toggleTextSelectionActive);
      linkButton.removeEventListener('click', toggleLinkActive);
      fullsizeButton.removeEventListener('click', toolbarToggleFullsize);
      window.removeEventListener('resize', handleWindowResize);
      toolbarContainer.innerHTML = '';
    }

    return {
      initialize,
      toggleLockActive,
      toggleTextSelectionActive,
      toggleLinkActive,
      update,
      destroy
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

  const handleKeyDown = event => {
    if (event.shiftKey) {
      const currentPosY = currentSettings['posY'];
      const currentPosX = currentSettings['posX'];

      switch (event.code) {
        case 'ArrowUp':
          updateSettings('posY', currentPosY === 'bottom' ? 'center' : 'top');
          return setQRCodePosition();
        case 'ArrowDown':
          updateSettings('posY', currentPosY === 'top' ? 'center' : 'bottom');
          return setQRCodePosition();
        case 'ArrowLeft':
          updateSettings('posX', currentPosX === 'right' ? 'center' : 'left');
          return setQRCodePosition();
        case 'ArrowRight':
          updateSettings('posX', currentPosX === 'left' ? 'center' : 'right');
          return setQRCodePosition();
      }
    }

    if (event.altKey) {
      if (event.code === 'KeyH') {
        return showQRCodeForPage();
      }

      if (event.code === 'KeyL') {
        return toolbar.toggleLockActive();
      }

      if (event.code === 'KeyT') {
        return toolbar.toggleTextSelectionActive();
      }

      if (event.code === 'KeyU') {
        return toolbar.toggleLinkActive();
      }

      if (event.code === 'KeyF') {
        return toggleFullsize(!fullsize);
      }


      if (!fullsize && positionMap[event.code]) {
        const mappedPosition = positionMap[event.code];
        updateSettings('posX', mappedPosition.posX);
        updateSettings('posY', mappedPosition.posY);
        return setQRCodePosition();
      }
    }

    if (event.code === 'Escape' && fullsize) {
      return toggleFullsize(false);
    }
  }

  const init = () => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectionchange', showQRCodeForTextSelection);
    document.querySelectorAll('a').forEach(addMouseOverListeners);
    document.body.appendChild(qrCodeOverlay);
    document.body.appendChild(qrContainer);

    chrome.storage.sync.get(['qrcoder.settings'], result => {
      const settingsFromStorage = result && result['qrcoder.settings'] && JSON.parse(result['qrcoder.settings']);
      currentSettings = settingsFromStorage ||
        {
          lockActive: false,
          textSelectionActive: false,
          linkActive: false,
          posX: 'right',
          posY: 'top'
        };
      toolbar = createToolbar();
      //toolbar.initialize();
      showQRCodeForPage();
      setQRCodePosition();
    });
  };

  const destroy = () => {
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('selectionchange', showQRCodeForTextSelection);

    registeredListeners.forEach(listener => {
      listener.link.removeEventListener('mouseover', listener.mouseover);
    })

    toolbar.destroy();
    document.body.removeChild(qrCodeOverlay);
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
