declare module 'react-ios-pwa-prompt' {
  import { Component } from 'react'

  class PWAPrompt extends Component<{
    timesToShow?: number
    promptOnVisit?: number
    delay?: number
    onClose?: () => void
    copyTitle?: string
    copyBody?: string
    copyShareButtonLabel?: string
    copyAddHomeButtonLabel?: string
    copyClosePrompt?: string
    permanentlyHideOnDismiss?: boolean
    debug?: boolean
  }> { }

  export default PWAPrompt
}
