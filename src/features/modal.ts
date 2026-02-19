import { $, $expenseList, $modal, removeViewTransitionNameFromVariousElements } from "../dom/htmlElements";
import type { Expense } from "../types/Expense";
import { withTransition } from "../utils/viewTransitions";

let buttonToClose: HTMLElement | undefined;

export const openModal = ($button: HTMLElement, expense?: Expense) => {
  const liItems = $expenseList.querySelectorAll("li") as unknown as HTMLElement[];
  removeViewTransitionNameFromVariousElements(liItems, 0)
  $button.classList.add("trans-hero");
  buttonToClose = $button;
  if (expense) {
    Object.entries(expense).forEach(([key, value]) => {
      const input = document.querySelector(
        `[name="${key}"]`,
      ) as HTMLInputElement;
      if (input) input.value = value;
    });
  }

  withTransition(() => {
    $button.style.display = "none";
    $button.classList.remove("trans-hero");
    $modal.showModal();
  });
};

export const closeModal = () => {
  withTransition(() => {
    if (buttonToClose) {
      buttonToClose.style.display = "flex";
    }
    buttonToClose?.classList.add("trans-hero");
    const $modalOpen = $<HTMLDialogElement>("dialog[open]");
    $modalOpen.close();
  });

  setTimeout(() => {
    buttonToClose = undefined;
    const buttonToClearClass = document.querySelector(".trans-hero");
    buttonToClearClass?.classList.remove("trans-hero");
  }, 500);
};
