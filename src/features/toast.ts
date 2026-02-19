type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

const toastContainer = document.getElementById('toast-container');

const createToastElement = (options: ToastOptions) => {
  const { message, type = 'info', duration = 3000 } = options;
  
  const toast = document.createElement('div');
  toast.className = `
    px-4 py-3 rounded-xl shadow-lg text-sm font-semibold
    transform transition-all duration-300 ease-in-out
    translate-x-full opacity-0
    ${type === 'success' ? 'bg-green-600 text-white' : ''}
    ${type === 'error' ? 'bg-red-600 text-white' : ''}
    ${type === 'info' ? 'bg-blue-600 text-white' : ''}
    ${type === 'warning' ? 'bg-yellow-600 text-black' : ''}
  `;
  toast.textContent = message;
  
  toastContainer?.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });
  
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  return toast;
};

export const showToast = (options: ToastOptions) => {
  createToastElement(options);
};

export const showSuccess = (message: string) => {
  showToast({ message, type: 'success' });
};

export const showError = (message: string) => {
  showToast({ message, type: 'error', duration: 4000 });
};

export const showInfo = (message: string) => {
  showToast({ message, type: 'info' });
};

export const showWarning = (message: string) => {
  showToast({ message, type: 'warning', duration: 4000 });
};
