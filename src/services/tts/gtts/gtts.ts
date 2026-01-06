/**
 * Original author: Long Nguyen <olragon@gmail.com>
 *
 * This code is a modified version of gtts, converted to TypeScript and updated to remove deprecated dependencies.
 * gtts NPM link: https://www.npmjs.com/package/gtts
 *
 * MIT License
 *
 * Copyright (c) YEAR Original Author
 *
 * This file is based on the gtts project under MIT license.
 * Full license: https://opensource.org/licenses/MIT
 *
 **/

import fs from 'fs';
import { Readable } from 'stream';
import MultiStream from 'multistream';
import escapeStringRegexp from 'escape-string-regexp';
import gToken from './gToken.js';

type LanguageMap = Record<string, string>;

export default class gTTS {
  private GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';
  private MAX_CHARS = 100;
  private LANGUAGES: LanguageMap = {
    af: 'Afrikaans',
    sq: 'Albanian',
    ar: 'Arabic',
    hy: 'Armenian',
    ca: 'Catalan',
    zh: 'Chinese',
    'zh-cn': 'Chinese (Mandarin/China)',
    'zh-tw': 'Chinese (Mandarin/Taiwan)',
    'zh-yue': 'Chinese (Cantonese)',
    hr: 'Croatian',
    cs: 'Czech',
    da: 'Danish',
    nl: 'Dutch',
    en: 'English',
    'en-au': 'English (Australia)',
    'en-uk': 'English (United Kingdom)',
    'en-us': 'English (United States)',
    eo: 'Esperanto',
    fi: 'Finnish',
    fr: 'French',
    de: 'German',
    el: 'Greek',
    ht: 'Haitian Creole',
    hi: 'Hindi',
    hu: 'Hungarian',
    is: 'Icelandic',
    id: 'Indonesian',
    it: 'Italian',
    ja: 'Japanese',
    ko: 'Korean',
    la: 'Latin',
    lv: 'Latvian',
    mk: 'Macedonian',
    no: 'Norwegian',
    pl: 'Polish',
    pt: 'Portuguese',
    'pt-br': 'Portuguese (Brazil)',
    ro: 'Romanian',
    ru: 'Russian',
    sr: 'Serbian',
    sk: 'Slovak',
    es: 'Spanish',
    'es-es': 'Spanish (Spain)',
    'es-us': 'Spanish (United States)',
    sw: 'Swahili',
    sv: 'Swedish',
    ta: 'Tamil',
    th: 'Thai',
    tr: 'Turkish',
    vi: 'Vietnamese',
    cy: 'Welsh',
  };

  private lang: string;
  private text: string;
  private textParts: string[];
  private debug: boolean;

  constructor(text: string, lang = 'en', debug = false) {
    if (!this.LANGUAGES[lang.toLowerCase()]) {
      throw new Error(`Language not supported: ${lang}`);
    }

    if (!text) {
      throw new Error('No text to speak');
    }

    this.lang = lang.toLowerCase();
    this.text = text;
    this.debug = debug;

    this.textParts =
      text.length <= this.MAX_CHARS
        ? [this.text]
        : this.tokenize(text, this.MAX_CHARS);

    this.textParts = this.textParts
      .map((p) => p.replace(/\n/g, '').trim())
      .filter(Boolean);
  }

  private getHeaders(): HeadersInit {
    return {
      Referer: 'https://translate.google.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    };
  }

  private getPayload(part: string, idx: number): URLSearchParams {
    return new URLSearchParams({
      ie: 'UTF-8',
      q: part,
      tl: this.lang,
      total: this.textParts.length.toString(),
      idx: idx.toString(),
      client: 'tw-ob',
      textlen: part.length.toString(),
      tk: gToken(part),
    });
  }

  private async fetchAudio(part: string, idx: number): Promise<Readable> {
    const payload = this.getPayload(part, idx);
    const url = `${this.GOOGLE_TTS_URL}?${payload.toString()}`;

    if (this.debug) {
      console.log(payload.toString());
    }

    const res = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!res.ok || !res.body) {
      throw new Error(`TTS request failed: ${res.status}`);
    }

    return Readable.fromWeb(res.body as any);
  }

  async stream(): Promise<Readable> {
    const streams = await Promise.all(
      this.textParts.map((part, idx) => this.fetchAudio(part, idx)),
    );

    return new MultiStream(streams);
  }

  async save(file: string): Promise<void> {
    for (let i = 0; i < this.textParts.length; i++) {
      const stream = await this.fetchAudio(this.textParts[i], i);
      const writeStream = fs.createWriteStream(file, {
        flags: i === 0 ? 'w' : 'a',
      });

      await new Promise<void>((resolve, reject) => {
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }
  }

  private tokenize(text: string, maxSize: number): string[] {
    const punc = '¡!()[]¿?.,;:—«»\n';
    const pattern = punc.split('').map(escapeStringRegexp).join('|');

    const parts = text.split(new RegExp(pattern));
    return parts.flatMap((p) => this.minimize(p, ' ', maxSize));
  }

  private minimize(str: string, delim: string, maxSize: number): string[] {
    if (str.length <= maxSize) return [str];

    const idx = str.lastIndexOf(delim, maxSize);
    if (idx === -1) return [str];

    return [
      str.slice(0, idx),
      ...this.minimize(str.slice(idx + 1), delim, maxSize),
    ];
  }
}
