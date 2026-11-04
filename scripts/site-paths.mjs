// Source URLs stay root-relative for local development. Prefix them for project hosting.
export function normalizeBasePath(value = '') {
  const path = value.trim().replace(/^\/+|\/+$/g, '');
  if (!path) return '';
  if (!/^[a-zA-Z0-9_./-]+$/.test(path) || path.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('BASE_PATH must be a URL path such as /three-paw-forge.');
  }
  return `/${path}`;
}

export function applyBasePath(html, basePath) {
  if (!basePath) return html;
  const prefix = value => value.startsWith('/') && !value.startsWith('//') ? basePath + value : value;
  return html.replace(/\b(href|src|srcset)="([^"]*)"/g, (_, attribute, value) => {
    const rewritten = attribute === 'srcset'
      ? value.replace(/(^|,\s*)(\/(?!\/)[^\s,]*)/g, (_, separator, url) => separator + prefix(url))
      : prefix(value);
    return `${attribute}="${rewritten}"`;
  });
}
