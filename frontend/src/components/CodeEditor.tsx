import { useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';

// language extension picker (by language NAME, not seed id — ids aren't hardcoded)
const extFor = (name: string) =>
  /c\+\+/i.test(name) ? [cpp()] : /python/i.test(name) ? [python()] : /java/i.test(name) ? [java()] : [];

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

  useEffect(() => { localStorage.setItem(srcKey(slug), value); }, [slug, value]);
  useEffect(() => { if (languageId) localStorage.setItem(langKey(slug), languageId); }, [slug, languageId]);

  return (
    <CodeMirror
      value={value}
      height="360px"
      extensions={extFor(languageName)}
      onChange={onChange}
      basicSetup={{ lineNumbers: true }}
    />
  );
}
