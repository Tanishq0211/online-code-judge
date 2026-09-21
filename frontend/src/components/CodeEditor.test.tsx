import { render } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import CodeEditor from './CodeEditor';

// jsdom can't drive a real CodeMirror surface — stub it; we test persistence
// and configuration. The component's real imports come from @codemirror/*
// packages, so the mock must provide every symbol it destructures.
const { themeSpecs } = vi.hoisted(() => ({ themeSpecs: [] as Array<Record<string, unknown>> }));
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value }: { value: string }) => <div data-testid="cm">{value}</div>,
  EditorView: {
    contentAttributes: { of: () => [] },
    theme: (spec: Record<string, unknown>) => {
      themeSpecs.push(spec);
      return spec;
    },
  },
}));
vi.mock('@codemirror/state', () => ({ EditorState: { tabSize: { of: () => [] } } }));
vi.mock('@codemirror/view', () => ({ keymap: { of: () => [] } }));
vi.mock('@codemirror/commands', () => ({
  indentWithTab: { run: () => true },
  indentLess: () => true,
}));
vi.mock('@codemirror/language', () => ({
  HighlightStyle: { define: (specs: unknown[]) => ({ specs }) },
  syntaxHighlighting: (style: unknown) => ({ style }),
  bracketMatching: () => [],
  indentUnit: { of: () => [] },
}));
vi.mock('@lezer/highlight', () => ({
  tags: new Proxy({}, {
    get: (_t, prop) =>
      prop === 'special'
        ? (tag: unknown) => ({ tag: `special(${String((tag as { tag?: string })?.tag ?? tag)})` })
        : { tag: String(prop) },
  }),
}));
vi.mock('@codemirror/lang-cpp', () => ({ cpp: () => [] }));
vi.mock('@codemirror/lang-python', () => ({ python: () => [] }));
vi.mock('@codemirror/lang-java', () => ({ java: () => [] }));

beforeEach(() => localStorage.clear());

test('persists source and language to localStorage', () => {
  render(<CodeEditor slug="two-sum" languageId="3" languageName="C++" value="int main(){}" onChange={() => {}} />);
  expect(localStorage.getItem('problem:two-sum:source')).toBe('int main(){}');
  expect(localStorage.getItem('problem:two-sum:language')).toBe('3');
});

test('restores both keys on mount via onRestore', () => {
  localStorage.setItem('problem:two-sum:source', 'saved');
  localStorage.setItem('problem:two-sum:language', '7');
  const onRestore = vi.fn();
  render(<CodeEditor slug="two-sum" languageId="" languageName="" value="" onChange={() => {}} onRestore={onRestore} />);
  expect(onRestore).toHaveBeenCalledWith('saved', '7');
});

test('an emptied draft REMOVES the saved key instead of resurrecting it (ISSUE-008)', () => {
  // a saved draft exists; the user has cleared the editor (value="")
  localStorage.setItem('problem:two-sum:source', 'old draft');
  const { rerender } = render(
    <CodeEditor slug="two-sum" languageId="1" languageName="C++" value="old draft" onChange={() => {}} />,
  );
  expect(localStorage.getItem('problem:two-sum:source')).toBe('old draft');
  // value cleared -> key must be gone, so a reload cannot restore the old text
  rerender(
    <CodeEditor slug="two-sum" languageId="1" languageName="C++" value="" onChange={() => {}} />,
  );
  expect(localStorage.getItem('problem:two-sum:source')).toBeNull();
});

test('drafts are scoped per problem slug', () => {
  render(<CodeEditor slug="two-sum" languageId="2" languageName="Python" value="print(1)" onChange={() => {}} />);
  expect(localStorage.getItem('problem:factorial:source')).toBeNull();
  expect(localStorage.getItem('problem:factorial:language')).toBeNull();
});

test('editor theme references theme-aware CSS variables, not literal colors (Stage 8)', () => {
  render(<CodeEditor slug="two-sum" languageId="1" languageName="C++" value="int main(){}" onChange={() => {}} />);
  const spec = themeSpecs.at(-1) as Record<string, Record<string, string>>;
  // every color must flow through the --cm-* variables so the editor follows
  // the .dark class — no literal rgb() values may remain
  const serialized = JSON.stringify(spec);
  expect(serialized).toContain('rgb(var(--cm-bg))');
  expect(serialized).toContain('rgb(var(--cm-fg))');
  expect(serialized).not.toMatch(/rgb\(\d/);
});
