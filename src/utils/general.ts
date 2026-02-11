export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};
