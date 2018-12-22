var port = chrome.runtime.connect({ name: 'qrcoder' });

var qrCoder = (() => {
  const registeredListeners = [];
  const qrContainer = document.createElement('div');
  const qrCode = document.createElement('div');
  const toolbar = document.createElement('div');
  let locked = false;
  qrCode.setAttribute('class', 'qrcode');
  qrContainer.setAttribute('class', 'qrcoder qrcode-container');
  toolbar.setAttribute('class', 'toolbar');
  qrContainer.appendChild(toolbar);
  qrContainer.appendChild(qrCode);
  
  const showQRCodeForText = (text, title) => {
    if (!text || locked) return;

    qrContainer.style.display = 'inline-block';
    qrCode.innerHTML = '';
    qrCode.setAttribute('title', title || text);
    
    try {
      new QRCode(qrCode, {
        text,
        height: 260,
        width: 260
      });
    } catch(error) {
      qrCode.innerHTML = `
        <img src="${chrome.runtime.getURL('assets/icon-active.png')}" class="error" />
        <br />
        Sorry, could not generate QR Code!`;
    }
  };
  
  const handleSelectionChange = () => {
    if (locked) return;
    
    const selectedText = window.getSelection().toString();
    showQRCodeForText(selectedText);
  }
  
  const hideQRCode = () => {
    qrContainer.style.display = 'none';
  };
  
  const handleKeyDown = event => {
    if (event.key === 'l') {
      locked = !locked;
    }
  };
  
  qrContainer.addEventListener('click', hideQRCode);
  
  const addMouseOverListener = link => {
    const logThisLink = () => showQRCodeForText(link.href, link.innerText);
    link.addEventListener('mouseover', logThisLink);
    
    registeredListeners.push({
      link,
      mouseover: logThisLink
    });
  };
  
  const initToolbar = () => {
    toolbar.innerHTML = `
      <img src="${chrome.runtime.getURL('assets/home.png')}" />
      <img src="${chrome.runtime.getURL('assets/lock-closed.png')}" />
      <img src="${chrome.runtime.getURL('assets/lock-open.png')}" />
      <img src="${chrome.runtime.getURL('assets/text-selection.png')}" />
      <img src="${chrome.runtime.getURL('assets/text-selection-active.png')}" />
      <img src="${chrome.runtime.getURL('assets/link.png')}" />
      <img src="${chrome.runtime.getURL('assets/link-active.png')}" />
    `;
  }
  
  const init = () => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown);
    document.querySelectorAll('a').forEach(addMouseOverListener);
    
    showQRCodeForText(location.href);
    initToolbar();    
    
    document.body.appendChild(qrContainer);
  };
  
  const destroy = () => {
    document.removeEventListener('selectionchange', handleSelectionChange);
    document.removeEventListener('keydown', handleKeyDown);
    
    registeredListeners.forEach(listener => {
      listener.link.removeEventListener('mouseover', listener.mouseover);
    })
    
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