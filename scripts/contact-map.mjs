const coordinates = '54.962963,-6.364953';
export const interactiveMapUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates}`;

export function renderContactMap(apiKey = '') {
  if (!apiKey.trim()) {
    return `<a href="${interactiveMapUrl}" class="flex min-h-64 items-center justify-center border border-coal/20 bg-coal/5 p-8 text-center text-lg font-bold">View location on Google Maps →</a>`;
  }
  const params = new URLSearchParams({
    center: coordinates,
    // Regional view: Northern Ireland and the surrounding coast, rather than streets.
    zoom: '7',
    size: '640x320',
    scale: '2',
    maptype: 'roadmap',
    format: 'jpg',
    markers: `color:0x9b4527|${coordinates}`,
    key: apiKey.trim(),
  });
  const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?${params}`.replaceAll('&', '&amp;');
  return `<a href="${interactiveMapUrl}" aria-label="Open the Three Paw Forge location in Google Maps"><img src="${imageUrl}" width="640" height="320" alt="Regional map showing Three Paw Forge in Northern Ireland and the surrounding coast" loading="lazy" decoding="async" class="block h-auto w-full border border-coal/20"></a>`;
}
