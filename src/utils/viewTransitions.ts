export const withTransition = (cb: () => void) => {
  if (document.startViewTransition) {
    document.startViewTransition(cb);
  } else {
    cb();
  }
};
