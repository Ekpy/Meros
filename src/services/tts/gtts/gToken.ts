/**
 * Original author: Long Nguyen <olragon@gmail.com>
 *
 * This code is a modified version of gtts, converted to TypeScript and updated to remove deprecated dependencies.
 * gtts NPM link: https://www.npmjs.com/package/gtts
 *
 * /**
 * MIT License
 *
 * Copyright (c) YEAR Original Author
 *
 * This file is based on the gtts project under MIT license.
 * Full license: https://opensource.org/licenses/MIT
 *
 **/

let cachedTokenKey: number | null = null;

export default function gToken(text: string): string {
  const SALT_1 = '+-a^+6';
  const SALT_2 = '+-3^+b+-f';

  const timestamp = Date.now();
  const hours = Math.floor(timestamp / 3600);
  const tokenKey = hours;

  const of = '=';
  const t = 'a';
  const Tb = '+';
  const dd = '.';

  const cM =
    <T>(a: T) =>
    () =>
      a;

  const dM = (a: number, b: string): number => {
    for (let c = 0; c < b.length - 2; c += 3) {
      let d: number | string = b.charAt(c + 2);
      d = d >= t ? d.charCodeAt(0) - 87 : Number(d);
      d = b.charAt(c + 1) === Tb ? a >>> d : a << d;
      a = b.charAt(c) === Tb ? (a + d) & 0xffffffff : a ^ d;
    }
    return a;
  };

  if (cachedTokenKey === null) {
    cachedTokenKey = Number(tokenKey) || 0;
  }

  const b = cachedTokenKey;

  // Convert string to UTF-8 byte array
  const bytes: number[] = [];
  for (let f = 0; f < text.length; f++) {
    let g = text.charCodeAt(f);

    if (g < 128) {
      bytes.push(g);
    }
 else if (g < 2048) {
      bytes.push((g >> 6) | 192);
      bytes.push((g & 63) | 128);
    }
 else if (
      (g & 0xfc00) === 0xd800 &&
      f + 1 < text.length &&
      (text.charCodeAt(f + 1) & 0xfc00) === 0xdc00
    ) {
      g = 0x10000 + ((g & 0x3ff) << 10) + (text.charCodeAt(++f) & 0x3ff);
      bytes.push((g >> 18) | 240);
      bytes.push(((g >> 12) & 63) | 128);
      bytes.push(((g >> 6) & 63) | 128);
      bytes.push((g & 63) | 128);
    }
 else {
      bytes.push((g >> 12) | 224);
      bytes.push(((g >> 6) & 63) | 128);
      bytes.push((g & 63) | 128);
    }
  }

  let a = b;
  for (let i = 0; i < bytes.length; i++) {
    a += bytes[i];
    a = dM(a, SALT_1);
  }

  a = dM(a, SALT_2);
  if (a < 0) {
    a = (a & 0x7fffffff) + 0x80000000;
  }

  a %= 1e6;
  return `${a}${dd}${a ^ b}`;
}
