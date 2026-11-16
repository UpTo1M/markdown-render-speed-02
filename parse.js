// Default-GFM renderer with syntax-directed tokenizer dispatch.
// The compatibility grammar is Marked 18.1.3, MIT (vendor/marked/LICENSE).
import { Lexer, Parser, Tokenizer } from './vendor/marked/marked.esm.js';

// These checks only prove that a grammar rule cannot match. All ambiguous
// syntax continues through the reference implementation.
const inlineSyntax = /[\\<!\[`*_~@\n]|https?:\/\/|ftp:\/\/|www\.|mailto:|xmpp:/i;
const numericEntity = /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));/;
const numericOrAmp = /&#(?:(\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g;

function decodeText(text) {
  if (!numericEntity.test(text)) return text;
  return text.replace(numericOrAmp, (whole, decimal, hex) => {
    if (decimal === undefined && hex === undefined) return '&amp;';
    const value = decimal === undefined ? Number.parseInt(hex, 16) : Number.parseInt(decimal, 10);
    if (!value || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return '\ufffd';
    return value === 38 ? '&amp;' : String.fromCodePoint(value);
  });
}

// The GFM text rule's email lookaheads repeatedly scan a word for '@'.
// When the entire remaining inline source lacks '@', both branches are
// provably impossible and a smaller equivalent expression avoids that work.
const emailLocalClass = "[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]";
const originalTextRule = Lexer.rules.inline.gfm.text;
const noEmailText = new RegExp(originalTextRule.source
  .replace('|(?=' + emailLocalClass + '+@)', '')
  .replace('|[^' + emailLocalClass.slice(1) + '(?=' + emailLocalClass + '+@)', ''), originalTextRule.flags);

class DispatchTokenizer extends Tokenizer {
  inlineText(src) {
    if (src.indexOf('@') >= 0) return super.inlineText(src);
    const match = noEmailText.exec(src);
    if (!match) return;
    const raw = match[0];
    const escaped = this.lexer.state.inRawBlock;
    return { type: 'text', raw, text: escaped ? raw : decodeText(raw), escaped };
  }
  escape(src) {
    if (src.charCodeAt(0) === 92) return super.escape(src);
  }
  tag(src) {
    if (src.charCodeAt(0) === 60) return super.tag(src);
  }
  link(src) {
    const ch = src.charCodeAt(0);
    if (ch === 91 || (ch === 33 && src.charCodeAt(1) === 91)) return super.link(src);
  }
  reflink(src, links) {
    const ch = src.charCodeAt(0);
    if (ch === 91 || (ch === 33 && src.charCodeAt(1) === 91)) return super.reflink(src, links);
  }
  codespan(src) {
    if (src.charCodeAt(0) === 96) return super.codespan(src);
  }
  br(src) {
    const ch = src.charCodeAt(0);
    if (ch === 32 || ch === 92) return super.br(src);
  }
  autolink(src) {
    if (src.charCodeAt(0) === 60) return super.autolink(src);
  }
  heading(src) {
    const ch = src.charCodeAt(0);
    if (ch === 35 || ch === 32) return super.heading(src);
  }
  fences(src) {
    const ch = src.charCodeAt(0);
    if (ch === 96 || ch === 126 || ch === 32) return super.fences(src);
  }
  blockquote(src) {
    const ch = src.charCodeAt(0);
    if (ch === 62 || ch === 32) return super.blockquote(src);
  }
  html(src) {
    const ch = src.charCodeAt(0);
    if (ch === 60 || ch === 32) return super.html(src);
  }
  def(src) {
    const ch = src.charCodeAt(0);
    if (ch === 91 || ch === 32) return super.def(src);
  }
  code(src) {
    const ch = src.charCodeAt(0);
    if (ch === 32 || ch === 9) return super.code(src);
  }
}

class TextLexer extends Lexer {
  inlineTokens(src, tokens = []) {
    // No markup or autolink introducer: one text token has identical rendering.
    // Preserve raw-block escaping and adjacent text-token behavior.
    if (src && !inlineSyntax.test(src)) {
      const escaped = this.state.inRawBlock;
      const text = escaped ? src : decodeText(src);
      const previous = tokens[tokens.length - 1];
      if (previous?.type === 'text') {
        previous.raw += src;
        previous.text += text;
      } else {
        tokens.push({ type: 'text', raw: src, text, escaped });
      }
      return tokens;
    }
    return super.inlineTokens(src, tokens);
  }
}

export function parse(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('parse expects a Markdown string');
  // Every call owns its options, lexer, links and token arrays. No case cache.
  const options = { gfm: true, breaks: false, pedantic: false, async: false, tokenizer: new DispatchTokenizer() };
  const lexer = new TextLexer(options);
  return new Parser(options).parse(lexer.lex(markdown));
}
