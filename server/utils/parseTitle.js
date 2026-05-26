function parseTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

module.exports = { parseTitle };
