const $body = document.querySelector('body') as HTMLBodyElement
let scrollPosition = 0

const scrollLock = {
  enable() {
    scrollPosition = window.pageYOffset
    $body.style.overflow = 'hidden'
    $body.style.position = 'fixed'
    $body.style.top = `-${scrollPosition}px`
    $body.style.width = '100%'
  },
  disable() {
    $body.style.removeProperty('overflow')
    $body.style.removeProperty('position')
    $body.style.removeProperty('top')
    $body.style.removeProperty('width')
    window.scrollTo(0, scrollPosition)
  },
}

export default scrollLock
