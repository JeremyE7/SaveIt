const $loadingOverlay = document.getElementById('loading-overlay');

export const showLoading = () => {
  $loadingOverlay?.classList.remove('hidden');
};

export const hideLoading = () => {
  $loadingOverlay?.classList.add('hidden');
};
