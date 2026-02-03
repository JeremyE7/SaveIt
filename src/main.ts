import './style.css'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

async function solicitarPermiso() {
  const permiso = await Notification.requestPermission();
  if (permiso === 'granted') {
    console.log('¡Tenemos permiso para notificar!');
  } else {
    console.error('El usuario rechazó las notificaciones');
  }
}

// function enviarNotificacion() {
//   if (Notification.permission === 'granted') {
//     new Notification('¡Gasto Registrado!', {
//       body: 'Has gastado $15 en "Café y Donuts".',
//       icon: '/ios/16.png'
//     });
//   }
// }

function openModal(modalId: string) {
  console.log('Abriendo modal:', modalId);
  const modal = document.getElementById(modalId) as HTMLDialogElement;
  if (modal) {
    modal.showModal();
  }
  return modal
}


function loadButtons() {
  const button = document.querySelector('#agregar-gasto');
  button?.addEventListener('click', () => {
    // La transición de vista funciona mejor si el cambio de estado es claro
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        button.classList.remove('trans-hero');
        const modal = openModal('addExpenseModal');
        if(modal){
          modal.addEventListener('close', () => {
            button.classList.add('trans-hero');
          });
        }
      });
    } else {
      openModal('addExpenseModal');
    }
  });
}

const initApp = async () => {

  solicitarPermiso();
  loadButtons();
}

initApp();
