export function handleize(text: string) {
  return text.toString().toLowerCase().trim() // handles are always lowercase, trims whitespace
              .replaceAll('\'', '')           // removes apostrophes
              .replace(/[^a-z0-9]+/g, '-')    // whitespace and special characters are replaced with a hyphen (if there are multiple consecutive whitespace or special characters, then they're replaced with a single hyphen)
              .replace(/^-+/, '')             // whitespace or special characters at the beginning are removed
              .replace(/-+$/, '');            // whitespace or special characters at the end are removed
};

export function fiberFileSuffix(fiber: string) {
  if (fiber.split(' ').length > 1) {
    return fiber.split(' ').map((word) => word[0]).join('').toLowerCase();
  }
  else {
    return fiber.slice(0, 3).toLowerCase();
  }
};
