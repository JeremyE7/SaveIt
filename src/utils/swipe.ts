import type { Expense } from "../types/Expense";
import type { Income } from "../types/Income";
import type { Subscription } from "../types/Subscription";
import { toInputDateValue } from "./general";

const SWIPE_THRESHOLD = 75;
const SWIPE_DELETE_THRESHOLD = 120;
const SWIPE_DIRECTION_LOCK_THRESHOLD = 12;

const SHEET_CLOSE_DISTANCE_THRESHOLD = 120;
const SHEET_CLOSE_VELOCITY_THRESHOLD = 0.55;
const SHEET_CLOSE_DURATION_MS = 220;
const SHEET_SNAP_DURATION_MS = 250;

type GestureDirectionLock = 'horizontal' | 'vertical' | null;
type GestureEvent = TouchEvent | MouseEvent;

interface HorizontalSwipeHandlers {
  onHorizontalMove: (diffX: number) => void;
  onHorizontalEnd: (diffX: number) => void;
  onGestureCancel?: () => void;
}

interface BottomSheetDragToCloseOptions {
  overlay: HTMLElement;
  onClose: () => void;
  handleSelector?: string;
  sheetSelector?: string;
}

const getGesturePoint = (event: GestureEvent): { x: number; y: number } | null => {
  if ('touches' in event) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }

  return { x: event.clientX, y: event.clientY };
};

const isPrimaryMouseButton = (event: GestureEvent): boolean => {
  if ('touches' in event) return true;
  return event.button === 0;
};

const setupHorizontalSwipeGesture = (
  element: HTMLElement,
  handlers: HorizontalSwipeHandlers
) => {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let directionLock: GestureDirectionLock = null;

  const handleStart = (event: GestureEvent) => {
    if (!isPrimaryMouseButton(event)) return;

    const point = getGesturePoint(event);
    if (!point) return;

    startX = point.x;
    startY = point.y;
    currentX = point.x;
    currentY = point.y;
    isDragging = true;
    directionLock = null;
    element.style.transition = 'none';
  };

  const handleMove = (event: GestureEvent) => {
    if (!isDragging) return;

    const point = getGesturePoint(event);
    if (!point) return;

    currentX = point.x;
    currentY = point.y;

    const diffX = currentX - startX;
    const diffY = currentY - startY;

    if (!directionLock) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX >= SWIPE_DIRECTION_LOCK_THRESHOLD || absY >= SWIPE_DIRECTION_LOCK_THRESHOLD) {
        directionLock = absX >= absY ? 'horizontal' : 'vertical';
      }
    }

    if (directionLock === 'vertical') {
      handlers.onGestureCancel?.();
      return;
    }

    if (directionLock !== 'horizontal') {
      return;
    }

    if ('touches' in event) {
      event.preventDefault();
    }

    handlers.onHorizontalMove(diffX);
  };

  const handleEnd = () => {
    if (!isDragging) return;

    isDragging = false;
    const diffX = currentX - startX;

    if (directionLock === 'horizontal') {
      handlers.onHorizontalEnd(diffX);
    } else {
      handlers.onGestureCancel?.();
    }

    directionLock = null;
  };

  element.addEventListener('touchstart', handleStart, { passive: true });
  element.addEventListener('touchmove', handleMove, { passive: false });
  element.addEventListener('touchend', handleEnd);
  element.addEventListener('touchcancel', handleEnd);

  element.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', handleMove as EventListener);
  document.addEventListener('mouseup', handleEnd);
};

const finalizeSwipeGesture = (element: HTMLElement) => {
  element.style.transition = 'transform 0.3s ease';
  element.style.transform = '';
  element.style.removeProperty('--swipe-action');
  hideSwipeIndicator(element);
};

const clearSwipeGestureState = (element: HTMLElement) => {
  element.style.transform = '';
  element.style.removeProperty('--swipe-action');
  hideSwipeIndicator(element);
};

const applySwipeVisualState = (
  element: HTMLElement,
  diff: number,
  action: 'edit' | 'delete' | null
) => {
  if (!action) {
    element.style.transform = '';
    element.style.removeProperty('--swipe-action');
    return;
  }

  element.style.transform = `translateX(${diff}px)`;
  element.style.setProperty('--swipe-action', action);
};

export const initSwipeExpense = (
  element: HTMLElement,
  expense: Expense,
  onEdit: (expense: Expense) => void,
  onDelete: (id: string) => void
) => {
  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
      } else if (diff < 0) {
        applySwipeVisualState(element, diff, 'delete');
      } else {
        applySwipeVisualState(element, diff, null);
      }

      updateSwipeIndicator(element, diff);
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) {
          onEdit(expense);
        } else {
          onDelete(expense.id);
        }
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

export const initSwipeIncome = (
  element: HTMLElement,
  income: Income,
  onEdit: (income: Income) => void,
  onDelete: (id: string) => void
) => {
  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
      } else if (diff < 0) {
        applySwipeVisualState(element, diff, 'delete');
      } else {
        applySwipeVisualState(element, diff, null);
      }

      updateSwipeIndicator(element, diff);
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) {
          onEdit(income);
        } else {
          onDelete(income.id);
        }
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

export const initSwipeSubscription = (
  element: HTMLElement,
  subscription: Subscription,
  onEdit: (subscription: Subscription) => void,
  onToggle: (id: string) => void,
  onDelete: (id: string) => void
) => {
  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
      } else if (diff < 0) {
        applySwipeVisualState(element, diff, 'delete');
      } else {
        applySwipeVisualState(element, diff, null);
      }

      updateSubscriptionSwipeIndicator(element, diff, subscription.status);
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (diff >= SWIPE_THRESHOLD) {
        onEdit(subscription);
        return;
      }

      if (diff <= -SWIPE_DELETE_THRESHOLD) {
        onDelete(subscription.id);
        return;
      }

      if (diff <= -SWIPE_THRESHOLD) {
        onToggle(subscription.id);
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

const updateSubscriptionSwipeIndicator = (
  element: HTMLElement,
  diff: number,
  status: Subscription['status']
) => {
  if (Math.abs(diff) < SWIPE_THRESHOLD) {
    hideSwipeIndicator(element);
    return;
  }

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
    return;
  }

  if (diff <= -SWIPE_DELETE_THRESHOLD) {
    indicator.className = 'swipe-indicator swipe-indicator-delete';
    indicator.innerHTML = `
      <span class="material-symbols-outlined">delete</span>
      <span>Eliminar</span>
    `;
    return;
  }

  indicator.className = 'swipe-indicator swipe-indicator-toggle';
  indicator.innerHTML = `
    <span class="material-symbols-outlined">${status === 'active' ? 'pause_circle' : 'play_circle'}</span>
    <span>${status === 'active' ? 'Cancelar' : 'Reactivar'}</span>
  `;
};

const updateSwipeIndicator = (element: HTMLElement, diff: number) => {
  if (Math.abs(diff) < SWIPE_THRESHOLD) {
    hideSwipeIndicator(element);
    return;
  }

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
  if (dateInput) dateInput.value = toInputDateValue(expense.date);

  (window as any).__editingExpenseId__ = expense.id;
};

export const openEditIncomeModal = (income: Income) => {
  const modal = document.getElementById('income-sheet-overlay');
  if (!modal) return;

  modal.classList.add('active');

  const amountInput = document.getElementById('income-amount') as HTMLInputElement;
  const detailInput = document.getElementById('income-detail') as HTMLTextAreaElement;
  const categorySelect = document.getElementById('income-category') as HTMLSelectElement;
  const dateInput = document.getElementById('income-date') as HTMLInputElement;
  const titleEl = modal.querySelector('.bottom-sheet-title');

  if (titleEl) {
    titleEl.textContent = 'Editar Ingreso';
  }

  if (amountInput) amountInput.value = income.amount.toString();
  if (detailInput) detailInput.value = income.detail || '';
  if (categorySelect) categorySelect.value = income.category;
  if (dateInput) dateInput.value = toInputDateValue(income.date);

  (window as any).__editingIncomeId__ = income.id;
};

export interface Budget {
  category: string;
  amount: number;
  period: 'monthly' | 'weekly';
}

export const initSwipeBudget = (
  element: HTMLElement,
  budget: Budget,
  onEdit: (budget: Budget) => void,
  onDelete: (category: string) => void
) => {
  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
      } else if (diff < 0) {
        applySwipeVisualState(element, diff, 'delete');
      } else {
        applySwipeVisualState(element, diff, null);
      }

      updateSwipeIndicator(element, diff);
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) {
          onEdit(budget);
        } else {
          onDelete(budget.category);
        }
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

export const initSwipeBudgetEditOnly = (
  element: HTMLElement,
  budget: Budget,
  onEdit: (budget: Budget) => void
) => {
  const showEditIndicator = () => {
    let indicator = element.querySelector('.swipe-indicator') as HTMLElement;
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'swipe-indicator';
      element.appendChild(indicator);
    }

    indicator.className = 'swipe-indicator swipe-indicator-edit';
    indicator.innerHTML = `
      <span class="material-symbols-outlined">edit</span>
      <span>Editar</span>
    `;
  };

  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
        if (Math.abs(diff) >= SWIPE_THRESHOLD) {
          showEditIndicator();
        } else {
          hideSwipeIndicator(element);
        }
      } else {
        clearSwipeGestureState(element);
      }
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (diff >= SWIPE_THRESHOLD) {
        onEdit(budget);
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

export const openEditBudgetModal = (budget: Budget) => {
  const modal = document.getElementById('budget-sheet-overlay');
  if (!modal) return;

  modal.classList.add('active');

  const amountInput = document.getElementById('budget-amount') as HTMLInputElement;
  const categorySelect = document.getElementById('budget-category') as HTMLSelectElement;

  if (amountInput) amountInput.value = budget.amount.toString();
  if (categorySelect) categorySelect.value = budget.category;

  (window as any).__editingBudgetCategory__ = budget.category;
};

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
}

export const initSwipeCategory = (
  element: HTMLElement,
  category: CustomCategory,
  onEdit: (id: string) => void,
  onDelete: (id: string) => void
) => {
  setupHorizontalSwipeGesture(element, {
    onHorizontalMove: (diff) => {
      if (diff > 0) {
        applySwipeVisualState(element, diff, 'edit');
      } else if (diff < 0) {
        applySwipeVisualState(element, diff, 'delete');
      } else {
        applySwipeVisualState(element, diff, null);
      }

      updateSwipeIndicator(element, diff);
    },
    onHorizontalEnd: (diff) => {
      finalizeSwipeGesture(element);

      if (Math.abs(diff) >= SWIPE_THRESHOLD) {
        if (diff > 0) {
          onEdit(category.id);
        } else {
          onDelete(category.id);
        }
      }
    },
    onGestureCancel: () => clearSwipeGestureState(element),
  });
};

export const initBottomSheetDragToClose = ({
  overlay,
  onClose,
  handleSelector = '.bottom-sheet-handle',
  sheetSelector = '.bottom-sheet',
}: BottomSheetDragToCloseOptions) => {
  const sheet = overlay.querySelector<HTMLElement>(sheetSelector);
  const handle = overlay.querySelector<HTMLElement>(handleSelector);

  if (!sheet || !handle) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let directionLock: GestureDirectionLock = null;
  let lastMoveAt = 0;
  let lastMoveY = 0;
  let velocityY = 0;

  const clearInlineStyles = () => {
    overlay.style.removeProperty('transition');
    overlay.style.removeProperty('opacity');
    sheet.style.removeProperty('transition');
    sheet.style.removeProperty('transform');
  };

  const handleStart = (event: GestureEvent) => {
    if (!overlay.classList.contains('active')) return;
    if (!isPrimaryMouseButton(event)) return;

    const point = getGesturePoint(event);
    if (!point) return;

    startX = point.x;
    startY = point.y;
    currentX = point.x;
    currentY = point.y;
    isDragging = true;
    directionLock = null;
    velocityY = 0;
    lastMoveAt = Date.now();
    lastMoveY = point.y;

    overlay.style.transition = 'none';
    sheet.style.transition = 'none';
  };

  const handleMove = (event: GestureEvent) => {
    if (!isDragging) return;

    const point = getGesturePoint(event);
    if (!point) return;

    currentX = point.x;
    currentY = point.y;

    const diffX = currentX - startX;
    const diffY = currentY - startY;

    if (!directionLock) {
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (absX >= SWIPE_DIRECTION_LOCK_THRESHOLD || absY >= SWIPE_DIRECTION_LOCK_THRESHOLD) {
        directionLock = absY >= absX ? 'vertical' : 'horizontal';
      }
    }

    if (directionLock !== 'vertical') {
      return;
    }

    if ('touches' in event) {
      event.preventDefault();
    }

    const now = Date.now();
    const elapsed = now - lastMoveAt;
    if (elapsed > 0) {
      velocityY = (currentY - lastMoveY) / elapsed;
      lastMoveAt = now;
      lastMoveY = currentY;
    }

    const translateY = Math.max(0, diffY);
    sheet.style.transform = `translateX(-50%) translateY(${translateY}px)`;

    const sheetHeight = sheet.offsetHeight || 1;
    const progress = Math.min(translateY / sheetHeight, 1);
    overlay.style.opacity = String(Math.max(0.2, 1 - progress * 0.8));
  };

  const handleEnd = () => {
    if (!isDragging) return;

    isDragging = false;
    const dragDistance = Math.max(0, currentY - startY);
    const shouldClose = directionLock === 'vertical' && (
      dragDistance >= SHEET_CLOSE_DISTANCE_THRESHOLD
      || (velocityY >= SHEET_CLOSE_VELOCITY_THRESHOLD && dragDistance >= SWIPE_DIRECTION_LOCK_THRESHOLD)
    );

    directionLock = null;
    velocityY = 0;

    if (shouldClose) {
      overlay.style.transition = `opacity ${SHEET_CLOSE_DURATION_MS}ms ease-out`;
      sheet.style.transition = `transform ${SHEET_CLOSE_DURATION_MS}ms ease-out`;
      overlay.style.opacity = '0';
      sheet.style.transform = 'translateX(-50%) translateY(100%)';

      window.setTimeout(() => {
        clearInlineStyles();
        onClose();
      }, SHEET_CLOSE_DURATION_MS);

      return;
    }

    overlay.style.transition = `opacity ${SHEET_SNAP_DURATION_MS}ms ease`;
    sheet.style.transition = `transform ${SHEET_SNAP_DURATION_MS}ms ease`;
    overlay.style.opacity = '1';
    sheet.style.transform = 'translateX(-50%) translateY(0)';

    window.setTimeout(() => {
      clearInlineStyles();
    }, SHEET_SNAP_DURATION_MS);
  };

  handle.addEventListener('touchstart', handleStart, { passive: true });
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('touchend', handleEnd);
  document.addEventListener('touchcancel', handleEnd);

  handle.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', handleMove as EventListener);
  document.addEventListener('mouseup', handleEnd);
};

export const initBottomSheetDragToCloseById = (
  overlayId: string,
  onClose: () => void
) => {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  initBottomSheetDragToClose({
    overlay,
    onClose,
  });
};
