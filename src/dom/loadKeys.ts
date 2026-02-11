import { closeModal } from "../features/modal";

const escCloseModal = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeModal();
  }
};

export const loadKeys = () => {
  document.addEventListener("keydown", escCloseModal);
};
