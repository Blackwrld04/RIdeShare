function nameTokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleUpperCase("en-NG")
      .split(/[^A-Z]+/)
      .filter((token) => token.length > 1),
  );
}

export function doesAccountNameMatch(
  legalFirstName: string,
  legalLastName: string,
  accountName: string,
): boolean {
  const expected = [
    ...nameTokens(legalFirstName),
    ...nameTokens(legalLastName),
  ];
  const actual = nameTokens(accountName);

  return expected.length >= 2 && expected.every((token) => actual.has(token));
}
