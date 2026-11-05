import MarkdownIt from 'markdown-it';

// Allow Markdown links and autolink existing URLs/email addresses. Raw HTML is
// escaped, and markdown-it rejects unsafe link protocols before rendering.
const markdown = new MarkdownIt({ html: false, linkify: true });
export function renderFaqAnswer(answer = '') {
  return markdown.render(answer);
}
