import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'
import reportWebVitals from './reportWebVitals'
import scrollLock from './scroll-lock'


ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
)

export declare class BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    'SW_UPDATE_WAITING': CustomEvent<() => void>
    'beforeinstallprompt': BeforeInstallPromptEvent
  }
}

serviceWorkerRegistration.register({
  onUpdate: reg => {
    if (reg.waiting) {
      reg.waiting.addEventListener('statechange', e => {
        if (e.target instanceof ServiceWorker && e.target.state === 'activated') {
          window.location.reload()
        }
      })
      const waiting = reg.waiting
      window.dispatchEvent(new CustomEvent('SW_UPDATE_WAITING', {
        detail() {
          waiting.postMessage({ type: 'SKIP_WAITING' })
        },
      }))
    }
  },
})

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

scrollLock.enable()
