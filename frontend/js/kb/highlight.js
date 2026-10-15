/* ---------- syntax-kleuring voor codeblokken ----------
   Klein en veilig: de code wordt in stukken geknipt, elk stuk wordt ge-escaped en krijgt
   hooguit een <span class="tk-…">. Er komt nooit ruwe HTML uit de data in de pagina. */

const PY_KEYWORDS = 'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case';
const PY_BUILTINS = 'print len range type int float str bool list dict set tuple input open enumerate zip sorted reversed sum min max abs round isinstance super map filter any all next iter repr id hash format getattr setattr hasattr object Exception ValueError TypeError KeyError IndexError ZeroDivisionError FileNotFoundError NameError AttributeError StopIteration RuntimeError self cls';
const SQL_KEYWORDS = 'select from where and or not in is null as join inner left right full outer cross on using group by having order asc desc limit offset insert into values update set delete create table drop alter add column primary key foreign references unique check default constraint index distinct count sum avg min max case when then else end union all exists between like ilike returning with recursive over partition rank row_number dense_rank coalesce cascade restrict serial integer int bigint text varchar numeric boolean timestamp timestamptz date jsonb begin commit rollback true false enum type if';

const words = list => new Set(list.split(' '));
const SETS = {
  pyKw: words(PY_KEYWORDS),
  pyBi: words(PY_BUILTINS),
  sqlKw: words(SQL_KEYWORDS),
};

/** Per taal: een lijst [klasse, regex]. De eerste regel die op een positie past, wint. */
const RULES = {
  python: [
    ['com', /#[^\n]*/y],
    ['str', /(?:[rbfRBF]{1,2})?(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y],
    ['dec', /@[\w.]+/y],
    ['num', /\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b/y],
    ['word', /[A-Za-z_]\w*/y],
  ],
  sql: [
    ['com', /--[^\n]*/y],
    ['str', /'(?:''|[^'])*'/y],
    ['num', /\b\d+(?:\.\d+)?\b/y],
    ['word', /[A-Za-z_]\w*/y],
  ],
  bash: [
    ['com', /(?:^|(?<=\s))#[^\n]*/my],
    ['prompt', /^\$ /my],
    ['str', /"(?:\\.|[^"\\])*"|'[^']*'/y],
    ['flag', /(?<=\s)--?[A-Za-z][\w-]*/y],
    ['var', /\$\{?\w+\}?/y],
  ],
  json: [
    ['key', /"(?:\\.|[^"\\])*"(?=\s*:)/y],
    ['str', /"(?:\\.|[^"\\])*"/y],
    ['num', /-?\b\d+(?:\.\d+)?\b/y],
    ['kw', /\b(?:true|false|null)\b/y],
  ],
  yaml: [
    ['com', /#[^\n]*/y],
    ['key', /^[ \t-]*[\w.-]+(?=:)/my],
    ['str', /"(?:\\.|[^"\\])*"|'[^']*'/y],
    ['num', /\b\d+(?:\.\d+)?\b/y],
  ],
  dockerfile: [
    ['com', /#[^\n]*/y],
    ['kw', /^\s*(?:FROM|RUN|COPY|ADD|WORKDIR|ENV|EXPOSE|CMD|ENTRYPOINT|USER|ARG|HEALTHCHECK|LABEL|AS)\b/imy],
    ['str', /"(?:\\.|[^"\\])*"/y],
  ],
  http: [
    ['kw', /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/my],
    ['key', /^[\w-]+(?=:)/my],
    ['num', /\b[1-5]\d\d\b/y],
    ['str', /"(?:\\.|[^"\\])*"/y],
  ],
};
RULES.toml = RULES.yaml;
RULES.ini = RULES.yaml;
RULES.shell = RULES.bash;
RULES.sh = RULES.bash;

/** Woorden krijgen pas hun kleur als we weten in welke taal ze staan. */
function wordClass(lang, word, rest) {
  if (lang === 'python') {
    if (SETS.pyKw.has(word)) return 'kw';
    if (SETS.pyBi.has(word)) return 'bi';
    if (rest.startsWith('(')) return 'fn';
    if (/^[A-Z][a-zA-Z0-9]+$/.test(word)) return 'cls';
    return '';
  }
  if (lang === 'sql') return SETS.sqlKw.has(word.toLowerCase()) ? 'kw' : '';
  return '';
}

/**
 * Geeft veilige HTML met gekleurde stukken terug.
 * @param {string} code
 * @param {string} lang
 */
function highlightCode(code, lang) {
  const rules = RULES[lang];
  if (!rules) return esc(code);
  let out = '';
  let plain = '';
  let i = 0;
  const flush = () => { if (plain) { out += esc(plain); plain = ''; } };

  outer: while (i < code.length) {
    for (const [cls, re] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (!m || m.index !== i || !m[0]) continue;
      const text = m[0];
      const kind = cls === 'word' ? wordClass(lang, text, code.slice(i + text.length).trimStart()) : cls;
      flush();
      out += kind ? `<span class="tk-${kind}">${esc(text)}</span>` : esc(text);
      i += text.length;
      continue outer;
    }
    plain += code[i];
    i++;
  }
  flush();
  return out;
}
