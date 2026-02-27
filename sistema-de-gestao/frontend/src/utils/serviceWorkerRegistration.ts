// src/utils/serviceWorkerRegistration.ts
export function register() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = `/sw.js`;

            navigator.serviceWorker
                .register(swUrl)
                .then((registration) => {
                    console.log('[SW] Registered successfully');

                    // Check for updates every 60 seconds
                    setInterval(() => {
                        registration.update();
                    }, 60000);

                    // Listen for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;

                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // New version available
                                    console.log('[SW] New version available!');

                                    // Show notification to user
                                    showUpdateNotification(() => {
                                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                                    });
                                }
                            });
                        }
                    });

                    // Listen for controller change (new SW activated)
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('[SW] Controller changed, reloading...');
                        window.location.reload();
                    });
                })
                .catch((error) => {
                    console.error('[SW] Registration failed:', error);
                });
        });
    }
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}

function showUpdateNotification(onUpdate: () => void) {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
    gap: 16px;
    animation: slideIn 0.3s ease-out;
  `;

    notification.innerHTML = `
    <div style="flex: 1;">
      <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">
        🚀 Nova versão disponível!
      </div>
      <div style="font-size: 12px; opacity: 0.9;">
        Clique para atualizar agora
      </div>
    </div>
    <button id="update-btn" style="
      background: white;
      color: #667eea;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 12px;
      cursor: pointer;
      transition: transform 0.2s;
    ">
      Atualizar
    </button>
  `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Add click handler
    const updateBtn = document.getElementById('update-btn');
    if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            notification.remove();
            onUpdate();
        });
    }

    // Auto-update after 10 seconds if user doesn't click
    setTimeout(() => {
        if (document.getElementById('update-notification')) {
            notification.remove();
            onUpdate();
        }
    }, 10000);
}
