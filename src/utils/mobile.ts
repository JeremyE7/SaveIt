export async function solicitarPermiso() {
  const permiso = await Notification.requestPermission();
  if (permiso === "granted") {
    console.log("¡Tenemos permiso para notificar!");
  } else {
    console.error("El usuario rechazó las notificaciones");
  }
}

export const enviarNotificacion = () => {
  if (Notification.permission === "granted") {
    new Notification("¡Gasto Registrado!", {
      body: 'Has gastado $15 en "Café y Donuts".',
      icon: "/ios/16.png",
    });
  }
};
