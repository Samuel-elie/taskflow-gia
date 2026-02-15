export function extractMentionUserIds(content: string): string[] {
  // format: @[label](user_id)
  const re = /@\[[^\]]+\]\(([^)]+)\)/g;
  const ids = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const id = (m[1] ?? '').trim();
    if (id) ids.add(id);
  }

  return [...ids];
}
