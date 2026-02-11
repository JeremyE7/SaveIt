import { $, $modal, $button } from "../dom/htmlElements";
import { withTransition } from "../utils/viewTransitions";

export const openModal = () => {
  withTransition(() => {
    $button.style.display = "none";
    $button.classList.remove("trans-hero");
    $modal.showModal();
  });
};

export const closeModal = () => {
  withTransition(() => {
    $button.style.display = "block";
    const $modalOpen = $<HTMLDialogElement>("dialog[open]");
    $modalOpen.close();
    $button.classList.add("trans-hero");
  });
};
