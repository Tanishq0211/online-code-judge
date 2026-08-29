import { render } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import CodeEditor from './CodeEditor';

// jsdom can't drive a real CodeMirror surface — stub it; we only test persistence.
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value }: { value: string }) => <div data-testid="cm">{value}</div>,
}));

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
