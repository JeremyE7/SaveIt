import './style.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

const $ = <T extends Element>(query: string) =>
  document.querySelector(query) as T 

const $modal = $<HTMLDialogElement>('#addExpenseModal')
const $button = $<HTMLButtonElement>('#agregar-gasto')
const $cancelBtn = $modal?.querySelector('[data-close]') as HTMLButtonElement | null

// function enviarNotificacion() {
//   if (Notification.permission === 'granted') {
//     new Notification('¡Gasto Registrado!', {
//       body: 'Has gastado $15 en "Café y Donuts".',
//       icon: '/ios/16.png'
//     });
//   }
// }

const withTransition = (cb: () => void) => {
  if (document.startViewTransition) {
    document.startViewTransition(cb)
  } else {
    cb()
  }
}

const openModal = () => {
  withTransition(() => {
    $button.classList.remove('trans-hero')
    $modal.showModal()
  })
}

const closeModal = () => {
  withTransition(() => {
    $modal.close()
    $button.classList.add('trans-hero')
  })
}

async function solicitarPermiso() {
  const permiso = await Notification.requestPermission()
  if (permiso === 'granted') {
    console.log('¡Tenemos permiso para notificar!')
  } else {
    console.error('El usuario rechazó las notificaciones')
  }
}

function loadButtons() {
  $button?.addEventListener('click', openModal)
  $cancelBtn?.addEventListener('click', closeModal)
}

async function initApp() {
  solicitarPermiso()
  loadButtons()
}

initApp()
