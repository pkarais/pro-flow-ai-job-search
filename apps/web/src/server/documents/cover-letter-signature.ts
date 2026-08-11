const placeholderPattern = /^\s*[\[\{(]?\s*your\s+name\s*[\]\})]?\s*$/i;

export function isCoverLetterNamePlaceholder(value: string): boolean {
  return placeholderPattern.test(value);
}

export function personalizeCoverLetterName(letter: string, fullName: string): string {
  return letter.split("\n")
    .map((line) => isCoverLetterNamePlaceholder(line) ? fullName : line)
    .join("\n");
}
