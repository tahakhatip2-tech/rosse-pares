// Pure GS1 EAN-13 Barcode generator, validator, and vector bit-pattern encoder

const L_CODES = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];

const G_CODES = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];

const R_CODES = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];

const PARITY_MAP = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

/**
 * Compute GS1 EAN-13 check digit from the first 12 numeric digits.
 */
export function computeEan13CheckDigit(twelveDigits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(twelveDigits[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Generate a valid 13-digit in-store EAN-13 barcode (prefix "200" for internal retail).
 */
export function generateEan13Code(offset = 0): string {
  const tsPart = String(Date.now() + offset).slice(-6);
  const randPart = String(Math.floor(100 + Math.random() * 900));
  const payload12 = `200${tsPart}${randPart}`;
  const check = computeEan13CheckDigit(payload12);
  return `${payload12}${check}`;
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return computeEan13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

export interface Ean13BarRun {
  x: number;
  width: number;
  tall: boolean;
}

/**
 * Encode a 13-digit EAN-13 barcode into exact SVG bar runs (95 modules + 11 quiet zone on left).
 * If the input isn't a valid 13-digit EAN-13, generates a deterministic visual fallback so UI never crashes.
 */
export function encodeEan13Runs(rawCode: string): {
  bars: Ean13BarRun[];
  totalWidth: number;
  digits: string;
  isStandardEan13: boolean;
} {
  const clean = rawCode.trim();
  const isStd = isValidEan13(clean);

  // If valid 13 digits, encode genuine scannable EAN-13 bits
  if (isStd) {
    const firstDigit = Number(clean[0]);
    const parity = PARITY_MAP[firstDigit];
    let bits = "101"; // Start guard

    for (let i = 1; i <= 6; i++) {
      const d = Number(clean[i]);
      bits += parity[i - 1] === "L" ? L_CODES[d] : G_CODES[d];
    }

    bits += "01010"; // Center guard

    for (let i = 7; i <= 12; i++) {
      const d = Number(clean[i]);
      bits += R_CODES[d];
    }

    bits += "101"; // End guard

    const quietLeft = 11;
    const quietRight = 7;
    const bars: Ean13BarRun[] = [];

    let i = 0;
    while (i < bits.length) {
      if (bits[i] === "1") {
        const start = i;
        while (i < bits.length && bits[i] === "1") {
          i++;
        }
        const isGuard =
          start < 3 ||
          (start >= 45 && start < 50) ||
          start >= 92;
        bars.push({
          x: quietLeft + start,
          width: i - start,
          tall: isGuard,
        });
      } else {
        i++;
      }
    }

    return {
      bars,
      totalWidth: quietLeft + bits.length + quietRight,
      digits: clean,
      isStandardEan13: true,
    };
  }

  // Deterministic visual fallback for legacy short codes / non-EAN SKUs
  const fallbackBits: string[] = ["1010"];
  for (let idx = 0; idx < clean.length; idx++) {
    const c = clean.charCodeAt(idx);
    fallbackBits.push(((c >> 4) & 15).toString(2).padStart(4, "0").replace(/00/g, "01"));
    fallbackBits.push((c & 15).toString(2).padStart(4, "0").replace(/00/g, "10"));
  }
  fallbackBits.push("101");
  const joined = fallbackBits.join("");
  const bars: Ean13BarRun[] = [];
  let i = 0;
  while (i < joined.length) {
    if (joined[i] === "1") {
      const start = i;
      while (i < joined.length && joined[i] === "1") i++;
      bars.push({ x: 8 + start, width: i - start, tall: false });
    } else {
      i++;
    }
  }
  return {
    bars,
    totalWidth: 16 + joined.length,
    digits: clean,
    isStandardEan13: false,
  };
}

