// Lets a search ignore accents and case.
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Also forgives doubled letters, as in "azilon" for "Azzilon".
export function foldForSearch(text: string): string {
  return fold(text).replace(/(.)\1+/g, '$1');
}
