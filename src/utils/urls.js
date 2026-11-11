const URL_PATTERN = /https?:\/\/[^\s<>]+/gi;

const TRACKING_PARAMETERS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'mc_cid',
  'mc_eid',
]);

function removeTrailingPunctuation(value) {
  return value.replace(/[),.!?;:'"\]}]+$/g, '');
}

export function normalizeUrl(value) {
  try {
    const url = new URL(value);

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    for (const parameter of [...url.searchParams.keys()]) {
      if (
        parameter.toLowerCase().startsWith('utm_') ||
        TRACKING_PARAMETERS.has(parameter.toLowerCase())
      ) {
        url.searchParams.delete(parameter);
      }
    }

    url.searchParams.sort();

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function extractUrls(content) {
  const matches = content.match(URL_PATTERN) ?? [];

  const normalizedUrls = matches
    .map(removeTrailingPunctuation)
    .map(normalizeUrl)
    .filter(Boolean);
  // Prevent one message containing the same URL twice from
  // processing that URL twice.
  return [...new Set(normalizedUrls)];
}
