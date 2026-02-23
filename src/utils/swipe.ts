import type { Expense } from "../types/Expense";

const SWIPE_THRESHOLD = 75;

export const initSwipeExpense = (
  element: HTMLElement,
  expense: Expense,
  onEdit: (expense: Expense) => void,
  onDelete: (id: string) => void
) => {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const handleTouchStart = (e: TouchEvent | MouseEvent) => {
    startX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    currentX = startX;
    isDragging = true;
    element.style.transition = 'none';
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    
    currentX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const diff = currentX - startX;
    
    if (diff > 0) {
      element.style.transform = `translateX(${diff}px)`;
      element.style.setProperty('--swipe-action', 'edit');
    } else if (diff < 0) {
      element.style.transform = `translateX(${diff}px)`;
      element.style.setProperty('--swipe-action', 'delete');
    }

    updateSwipeIndicator(element, diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    
    const diff = currentX - startX;
    element.style.transition = 'transform 0.3s ease';
    element.style.transform = '';
    element.style.removeProperty('--swipe-action');
    hideSwipeIndicator(element);

    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0) {
        onEdit(expense);
      } else {
        onDelete(expense.id);
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: true });
  element.addEventListener('touchend', handleTouchEnd);
  
  element.addEventListener('mousedown', handleTouchStart);
  document.addEventListener('mousemove', handleTouchMove as EventListener);
  document.addEventListener('mouseup', handleTouchEnd);
};

const updateSwipeIndicator = (element: HTMLElement, diff: number) => {
  let indicator = element.querySelector('.swipe-indicator') as HTMLElement;
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    element.appendChild(indicator);
  }

  if (diff > 0) {
    indicator.className = 'swipe-indicator swipe-indicator-edit';
    indicator.innerHTML = `
      <span class="material-symbols-outlined">edit</span>
      <span>Editar</span>
    `;
  } else if (diff < 0) {
    indicator.className = 'swipe-indicator swipe-indicator-delete';
    indicator.innerHTML = `
      <span class="material-symbols-outlined">delete</span>
      <span>Eliminar</span>
    `;
  }
};

const hideSwipeIndicator = (element: HTMLElement) => {
  const indicator = element.querySelector('.swipe-indicator');
  if (indicator) {
    indicator.remove();
  }
};

export const openEditModal = (expense: Expense) => {
  const modal = document.getElementById('bottom-sheet-overlay');
  if (!modal) return;

  modal.classList.add('active');
  
  const amountInput = document.getElementById('expense-amount') as HTMLInputElement;
  const detailInput = document.getElementById('expense-detail') as HTMLTextAreaElement;
  const categorySelect = document.getElementById('expense-category') as HTMLSelectElement;
  const dateInput = document.getElementById('expense-date') as HTMLInputElement;
  const titleEl = document.querySelector('.bottom-sheet-title');

  if (titleEl) {
    titleEl.textContent = 'Editar Gasto';
  }

  if (amountInput) amountInput.value = expense.amount.toString();
  if (detailInput) detailInput.value = expense.detail || '';
  if (categorySelect) categorySelect.value = expense.category;
  if (dateInput) dateInput.value = new Date(expense.date).toISOString().split('T')[0];

  (window as any).__editingExpenseId__ = expense.id;
};
