'use client';

import React from 'react';

export default function MentionText({ text }: { text: string }) {
  // match : @[Label](someId)
  const re = /@\[(.+?)\]\((.+?)\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const [full, label] = m;
    const start = m.index;

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    // On affiche un "tag" @Label (sans l'id)
    parts.push(
      <span
        key={`${start}-${label}`}
        className="inline-flex items-center rounded-full bg-gia-orange/10 px-2 py-0.5 text-xs font-extrabold text-gia-navy"
      >
        @{label}
      </span>
    );

    lastIndex = start + full.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className="whitespace-pre-line break-words">{parts}</span>;
}
