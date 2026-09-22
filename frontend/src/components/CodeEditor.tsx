import { useEffect } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { EditorState } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab, indentLess } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting, bracketMatching, indentUnit } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';

// language extension picker (by language NAME, not seed id — ids aren't hardcoded)
const extFor = (name: string) =>
  /c\+\+/i.test(name) ? [cpp()] : /python/i.test(name) ? [python()] : /java/i.test(name) ? [java()] : [];

// CodeMirror renders a role="textbox" region with no accessible name of its own.
const ariaLabelExt = EditorView.contentAttributes.of({ 'aria-label': 'Source code editor' });

/* Theme maps the editor onto the app's design system. CodeMirror's theme API
   takes literal CSS strings, but those strings may reference custom
   properties — so every color below is `rgb(var(--cm-*))`, with the actual
   triplets defined per theme in index.css (:root light, .dark dark).
   Stage 8 replaced Stage 6's literal token copies with these variables. */
const verdictTheme = EditorView.theme({
  '&': { backgroundColor: 'rgb(var(--cm-bg))', color: 'rgb(var(--cm-fg))' },
  '.cm-content': {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: '13px',
    lineHeight: '1.6',
    caretColor: 'rgb(var(--cm-accent))',
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'rgb(var(--cm-accent))', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, &.cm-focused ::selection':
    { backgroundColor: 'rgb(var(--cm-accent) / 0.22)' },
  '.cm-activeLine': { backgroundColor: 'rgb(var(--cm-active-line))' },
  '.cm-gutters': {
    backgroundColor: 'rgb(var(--cm-bg))',
    color: 'rgb(var(--cm-gutter-fg))',
    border: 'none',
    borderRight: '1px solid rgb(var(--cm-border))',
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: '12px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'rgb(var(--cm-active-line))', color: 'rgb(var(--cm-gutter-active-fg))' },
  '.cm-selectionMatch': { backgroundColor: 'rgb(var(--cm-accent) / 0.14)' },
  '.cm-matchingBracket': {
    backgroundColor: 'rgb(var(--cm-accent) / 0.2)',
    outline: '1px solid rgb(var(--cm-accent) / 0.45)',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 6px 0 10px' },
}, { dark: false });

/* Restrained four-class syntax palette, theme-aware via the same variables:
   keywords in accent, strings cool, numbers warm, comments muted italic. */
const verdictHighlight = HighlightStyle.define([
  { tag: tags.comment, color: 'rgb(var(--cm-comment))', fontStyle: 'italic' },
  { tag: [tags.keyword, tags.moduleKeyword, tags.controlKeyword], color: 'rgb(var(--cm-keyword))' },
  { tag: [tags.string, tags.special(tags.string)], color: 'rgb(var(--cm-string))' },
  { tag: [tags.number, tags.bool], color: 'rgb(var(--cm-number))' },
]);

/* Two-space indent: matches the existing code style and makes Tab,
   Enter auto-indent and Shift+Tab agree with each other. */
const indentExt = [indentUnit.of('  '), EditorState.tabSize.of(2)];

/* Keyboard contract (Stage 6 brief):
   - Tab / Shift+Tab — indent / dedent the line or selection
   - Escape — a single press moves focus out of the editor, so the editor is
     never a keyboard trap. CodeMirror itself only uses Escape to close
     dialogs/completion; those are disabled in this configuration, so the
     escape hatch is unambiguous. */
const escapeEditor = (view: EditorView) => { view.contentDOM.blur(); return true; };
const keymapExt = keymap.of([
  { key: 'Tab', run: indentWithTab.run, shift: indentLess },
  { key: 'Escape', run: escapeEditor },
]);

const srcKey = (slug: string) => `problem:${slug}:source`;
const langKey = (slug: string) => `problem:${slug}:language`;

export default function CodeEditor({ slug, languageId, languageName, value, onChange, onRestore }: {
  slug: string; languageId: string; languageName: string;
  value: string; onChange: (v: string) => void;
  onRestore?: (source: string | null, languageId: string | null) => void;
}) {
  // restore both keys on mount
  useEffect(() => {
    onRestore?.(localStorage.getItem(srcKey(slug)), localStorage.getItem(langKey(slug)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Empty drafts must overwrite saved ones (ISSUE-008): a cleared editor
  // removes its key instead of being silently resurrected on reload.
  useEffect(() => {
    if (value) localStorage.setItem(srcKey(slug), value);
    else localStorage.removeItem(srcKey(slug));
  }, [slug, value]);
  useEffect(() => { if (languageId) localStorage.setItem(langKey(slug), languageId); }, [slug, languageId]);

  return (
    <CodeMirror
      value={value}
      height="360px"
      extensions={[
        ...extFor(languageName),
        ariaLabelExt,
        verdictTheme,
        ...indentExt,
        keymapExt,
        syntaxHighlighting(verdictHighlight, { fallback: true }),
        bracketMatching(),
      ]}
      onChange={onChange}
      /* Stage 8: without this, @uiw/react-codemirror injects its own light
         theme with a hardcoded white background that out-specifies the
         var()-based verdictTheme in dark mode. 'none' hands full control to
         the token-driven theme below. */
      theme="none"
      /* Scoped basicSetup: line numbers, undo history, bracket closing,
         active-line + selection-match highlighting. IDE-scale extras
         (autocomplete, search panel, folding, lint) stay off — this is a
         submission editor, not an IDE. */
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        history: true,
        drawSelection: true,
        indentOnInput: true,
        bracketMatching: false, // provided explicitly above, theme-aware
        closeBrackets: true,
        autocompletion: false,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        searchKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
        foldKeymap: false,
        allowMultipleSelections: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightSpecialChars: true,
        dropCursor: true,
      }}
      aria-label="Source code editor"
    />
  );
}
