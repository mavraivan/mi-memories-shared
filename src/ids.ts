export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

const RECORD_ID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Record ids belong in citation chips, never in the sentence the couple reads. */
export function replyWithoutRecordIds(text: string): string {
  return text
    .replace(RECORD_ID, '')
    .replace(/\[\s*(?:,\s*)*\]/g, '')
    .replace(/\(\s*(?:,\s*)*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
