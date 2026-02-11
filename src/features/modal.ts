import { $, $modal, $button } from "../dom/htmlElements";
import { withTransition } from "../utils/viewTransitions";

export const openModal = () => {
  withTransition(() => {
    $button.classList.remove("trans-hero");
    $modal.showModal();
  });
};

export const closeModal = () => {
  withTransition(() => {
    const $modalOpen = $<HTMLDialogElement>("dialog[open]");
    $modalOpen.close();
    $button.classList.add("trans-hero");
  });
};
