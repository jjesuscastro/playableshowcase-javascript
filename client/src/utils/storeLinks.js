export function storeLinksFromHtml(html) {
  const decodedHtml = html.replaceAll('\\/', '/').replace(/&amp;|\\u0026/gi, '&');
  const urls = [...decodedHtml.matchAll(/https?:\/\/(?:www\.)?(?:apps\.apple\.com|play\.google\.com)[^\s"'<>\\]*/gi)]
    .map(([raw]) => raw);
  const links = { ios_url: '', android_url: '' };
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (url.hostname.endsWith('apps.apple.com') && !links.ios_url) links.ios_url = url.href;
      if (url.hostname.endsWith('play.google.com') && !links.android_url) links.android_url = url.href;
    } catch {}
  }
  return links;
}

function storeKey(value, platform) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return platform === 'ios'
      ? url.pathname.match(/\bid(\d+)/i)?.[1] || ''
      : url.searchParams.get('id') || '';
  } catch { return ''; }
}

export function matchAppFromStoreLinks(links, apps) {
  const iosKey = storeKey(links.ios_url, 'ios');
  const androidKey = storeKey(links.android_url, 'android');
  if (!iosKey && !androidKey) return null;
  return apps.find(app =>
    (iosKey && storeKey(app.ios_url, 'ios') === iosKey) ||
    (androidKey && storeKey(app.android_url, 'android') === androidKey)
  ) || null;
}
