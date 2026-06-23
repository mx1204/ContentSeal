const baseUrl =
  process.env.CONTENTSEAL_BASE_URL ?? process.env.ORIGINSEAL_BASE_URL ?? "http://127.0.0.1:3101";

const response = await fetch(baseUrl);
if (!response.ok) {
  throw new Error(`Expected ${baseUrl} to return 200, got ${response.status}`);
}

const html = await response.text();
for (const expected of ["ContentSeal", "Create", "Verify", "Create Proof"]) {
  if (!html.includes(expected)) {
    throw new Error(`Expected rendered UI to contain "${expected}"`);
  }
}

console.log(`ContentSeal UI smoke passed at ${baseUrl}`);
