/**
 * src/core/piyasa.js
 * Duay Global Trade Company — Property OS
 * Anayasa: K10
 * v1.0 / 2026-03-28
 */

const CACHE_KEY = 'pos_piyasa_cache';
const CACHE_TTL = 5 * 60 * 1000;

export async function getPiyasaData() {
  const cached = _getCache();
  if (cached) return cached;

  try {
    const [fxRes, btcRes] = await Promise.all([
      fetch('https://api.exchangerate-api.com/v4/latest/USD'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd'),
    ]);
    const fx  = await fxRes.json();
    const btc = await btcRes.json();

    const usdTry = fx.rates?.TRY || 38.5;
    const eurTry = (fx.rates?.TRY / fx.rates?.EUR) || 41.8;

    const data = {
      usd:     usdTry,
      eur:     eurTry,
      altinGr: usdTry * 97.5,
      gumus:   usdTry * 1.14,
      btc:     btc.bitcoin?.usd  * usdTry || 3800000,
      eth:     btc.ethereum?.usd * usdTry || 196000,
      ts:      Date.now(),
    };

    _setCache(data);
    return data;
  } catch {
    return _fallback();
  }
}

function _getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > CACHE_TTL) return null;
    return obj;
  } catch { return null; }
}

function _setCache(data) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
}

function _fallback() {
  return { usd: 38.5, eur: 41.8, altinGr: 4200, gumus: 52, btc: 3800000, eth: 196000, ts: Date.now() };
}

export function formatTL(n) {
  return new Intl.NumberFormat('tr-TR', { style:'currency', currency:'TRY', maximumFractionDigits: 0 }).format(n);
}

export function formatPct(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function calcAltinKarsilastirma(alisFiyat, alisTarih, suankiDeger, piyasa) {
  const alisYili  = new Date(alisTarih).getFullYear();
  const gecenYil  = new Date().getFullYear() - alisYili;
  const altinTahminiAlis = piyasa.altinGr / Math.pow(1.18, gecenYil);
  const altinMiktar      = alisFiyat / altinTahminiAlis;
  const altinBugunkuDeger = altinMiktar * piyasa.altinGr;

  const mulkPct  = ((suankiDeger  - alisFiyat) / alisFiyat) * 100;
  const altinPct = ((altinBugunkuDeger - alisFiyat) / alisFiyat) * 100;
  const fark     = mulkPct - altinPct;

  return { mulkPct, altinPct, fark, altinBugunkuDeger, altinMiktar };
}

export function calcUsdKarsilastirma(alisFiyat, alisTarih, suankiDeger, piyasa) {
  const alisYili   = new Date(alisTarih).getFullYear();
  const gecenYil   = new Date().getFullYear() - alisYili;
  const usdTahminiAlis = piyasa.usd / Math.pow(1.32, gecenYil);
  const usdMiktar      = alisFiyat / usdTahminiAlis;
  const usdBugunkuDeger = usdMiktar * piyasa.usd;

  const mulkPct = ((suankiDeger      - alisFiyat) / alisFiyat) * 100;
  const usdPct  = ((usdBugunkuDeger  - alisFiyat) / alisFiyat) * 100;
  const fark    = mulkPct - usdPct;

  return { mulkPct, usdPct, fark, usdBugunkuDeger };
}
