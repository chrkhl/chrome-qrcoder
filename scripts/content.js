var port = chrome.runtime.connect({ name: 'qrcoder' });

var qrCoder = (() => {
  const registeredListeners = [];
  const qrContainer = document.createElement('div');
  const qrCode = document.createElement('div');
  let locked = false;
  qrContainer.setAttribute('class', 'qrcode-container');
  qrContainer.appendChild(qrCode);
  
  const showQRCodeForText = text => {
    if (!text || locked) return;

    qrContainer.style.display = 'inline-block';
    qrCode.innerHTML = '';
    
    try {
      new QRCode(qrCode, {
        text,
        height: 260,
        width: 260
      });
    } catch(error) {
      qrCode.innerText = 'QR Code error';
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
    const logThisLink = () => showQRCodeForText(link.href);
    link.addEventListener('mouseover', logThisLink);
    
    registeredListeners.push({
      link,
      mouseover: logThisLink
    });
  };
  
  const init = () => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('keydown', handleKeyDown);
    document.querySelectorAll('a').forEach(addMouseOverListener);
    
    hideQRCode();
    
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