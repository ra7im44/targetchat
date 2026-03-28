(function (window, document) {
    'use strict';

    const API_URL = 'http://localhost:3001'; // TODO: Make this configurable or auto-detect
    const FRONTEND_URL = 'http://localhost:3000';

    class TargetChatWidget {
        constructor() {
            this.config = null;
            this.isOpen = false;
            this.container = null;
            this.iframe = null;
            this.launcher = null;
        }

        init(options) {
            this.slug = options.widget;
            if (!this.slug) {
                console.error('TargetChat: Widget slug is required');
                return;
            }

            this.fetchConfig();
        }

        async fetchConfig() {
            try {
                const response = await fetch(`${API_URL}/widget/public/${this.slug}/config`);
                if (!response.ok) throw new Error('Failed to load config');
                this.config = await response.json();
                this.render();
            } catch (error) {
                console.error('TargetChat: Error loading widget config', error);
            }
        }

        render() {
            // Create container
            this.container = document.createElement('div');
            this.container.id = 'targetchat-container';
            this.container.style.position = 'fixed';
            this.container.style.zIndex = '999999';
            this.container.style.bottom = '20px';
            this.container.style.right = '20px'; // Default, will override with config

            // Apply position from config
            const position = this.config.theme?.position || 'bottom-right';
            if (position === 'bottom-left') {
                this.container.style.right = 'auto';
                this.container.style.left = '20px';
            }

            // Create Shadow DOM
            const shadow = this.container.attachShadow({ mode: 'open' });

            // Styles
            const style = document.createElement('style');
            style.textContent = `
                .launcher {
                    width: ${this.config.theme?.launcherSize || 60}px;
                    height: ${this.config.theme?.launcherSize || 60}px;
                    background-color: ${this.config.theme?.primaryColor || '#2563eb'};
                    border-radius: 50%;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                }
                .launcher:hover {
                    transform: scale(1.05);
                }
                .launcher svg {
                    width: 30px;
                    height: 30px;
                    fill: white;
                }
                .iframe-container {
                    position: fixed;
                    bottom: 100px;
                    right: 20px;
                    width: 380px;
                    height: 600px;
                    max-height: calc(100vh - 120px);
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    overflow: hidden;
                    opacity: 0;
                    pointer-events: none;
                    transform: translateY(20px);
                    transition: all 0.3s ease;
                }
                .iframe-container.open {
                    opacity: 1;
                    pointer-events: all;
                    transform: translateY(0);
                }
                iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                @media (max-width: 480px) {
                    .iframe-container {
                        width: 100%;
                        height: 100%;
                        bottom: 0;
                        right: 0;
                        border-radius: 0;
                        max-height: 100vh;
                    }
                }
            `;

            if (position === 'bottom-left') {
                style.textContent += `
                    .iframe-container {
                        right: auto;
                        left: 20px;
                    }
                `;
            }

            shadow.appendChild(style);

            // Iframe Container
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'iframe-container';

            this.iframe = document.createElement('iframe');
            this.iframe.src = `${FRONTEND_URL}/embed/${this.slug}`;
            iframeContainer.appendChild(this.iframe);

            shadow.appendChild(iframeContainer);

            // Launcher Button
            this.launcher = document.createElement('div');
            this.launcher.className = 'launcher';

            if (this.config.theme?.launcherIcon) {
                this.launcher.innerHTML = `<img src="${this.config.theme.launcherIcon}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
            } else {
                this.launcher.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                `;
            }
            this.launcher.onclick = () => this.toggle();

            shadow.appendChild(this.launcher);

            document.body.appendChild(this.container);
        }

        toggle() {
            this.isOpen = !this.isOpen;
            const iframeContainer = this.container.shadowRoot.querySelector('.iframe-container');

            if (this.isOpen) {
                iframeContainer.classList.add('open');
                this.launcher.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                `;
            } else {
                iframeContainer.classList.remove('open');
                this.launcher.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                `;
            }
        }
    }

    // Expose to window
    window.TargetChatWidget = new TargetChatWidget();

})(window, document);
