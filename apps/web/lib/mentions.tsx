import React from 'react';

type MentionClick = (userId: string) => void;

export function renderMentions(content: string, onMentionClick?: MentionClick) {
  const re = /@\[(.*?)\]\(([^)]+)\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const [full, label, userId] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }

    parts.push(
      <button
        key={`${userId}-${start}`}
        type="button"
        onClick={() => onMentionClick?.(userId)}
        className="inline-flex items-center rounded-lg bg-gia-orange/10 px-2 py-0.5 text-sm font-semibold text-gia-navy hover:bg-gia-orange/15"
        title={`Voir ${label}`}
      >
        @{label}
      </button>,
    );

    lastIndex = start + full.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}
