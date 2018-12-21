var port = chrome.runtime.connect({ name: 'qrcoder' });

var qrCoder = (() => {
  const registeredListeners = [];
  const qrContainer = document.createElement('div');
  const qrCode = document.createElement('div');
  qrContainer.setAttribute('class', 'qrcode-container');
  qrContainer.appendChild(qrCode);
  
  const showQRCodeForLinkUrl = link => {
    qrContainer.style.display = 'block';
    qrCode.innerHTML = '';
    
    try {
      new QRCode(qrCode, {
        text: link.href,
        height: 240,
        width: 240
      });
    } catch {}
  };
  
  const hideQRCode = () => {
    qrContainer.style.display = 'none';
  };
  
  qrContainer.addEventListener('click', hideQRCode);
  
  const addMouseOverListener = link => {
    const logThisLink = () => showQRCodeForLinkUrl(link);
    link.addEventListener('mouseover', logThisLink);
    
    registeredListeners.push({
      link,
      mouseover: logThisLink
    });
  };
  
  const init = () => {
    document.querySelectorAll('a').forEach(addMouseOverListener);
    hideQRCode();
    document.body.appendChild(qrContainer);
  };
  
  const destroy = () => {
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