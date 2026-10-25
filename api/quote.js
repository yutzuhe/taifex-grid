// 檔案路徑：api/quote.js (放置於 GitHub 專案的 api 資料夾下，Vercel 會自動部署為後端 API)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const from60m = nowSec - 20 * 86400; // 過去 20 天所有 60分K
    const from1d  = nowSec - 65 * 86400; // 過去 65 天日K

    // 直接從 Vercel 伺服器抓取台指近全 (FUTURES:TXF1:FUTURES) 真實 60分K 與 日K (含日盤+夜盤)
    const url60m = `https://ws.api.cnyes.com/ws/api/v1/charting/history?symbol=FUTURES:TXF1:FUTURES&resolution=60&from=${from60m}&to=${nowSec}`;
    const url1d  = `https://ws.api.cnyes.com/ws/api/v1/charting/history?symbol=FUTURES:TXF1:FUTURES&resolution=D&from=${from1d}&to=${nowSec}`;

    const [r60, r1d] = await Promise.all([fetch(url60m), fetch(url1d)]);
    const j60 = await r60.json();
    const j1d = await r1d.json();

    if (j60?.data?.c?.length > 5) {
      const { o, h, l, c, t } = j60.data;
      const klines60m = c.map((val, i) => ({
        time: t ? t[i] : i,
        open: Math.round(o[i]),
        high: Math.round(h[i]),
        low: Math.round(l[i]),
        close: Math.round(val)
      })).filter(k => k.close > 5000).sort((a, b) => a.time - b.time);

      const klines1d = (j1d?.data?.c || []).map((val, i) => ({
        time: j1d.data.t ? j1d.data.t[i] : i,
        open: Math.round(j1d.data.o[i]),
        high: Math.round(j1d.data.h[i]),
        low: Math.round(j1d.data.l[i]),
        close: Math.round(val)
      })).filter(k => k.close > 5000).sort((a, b) => a.time - b.time);

      const latest = klines60m[klines60m.length - 1];
      const recent19 = klines60m.slice(-19);
      const dayHigh = Math.max(...recent19.map(k => k.high));
      const dayLow  = Math.min(...recent19.map(k => k.low));
      const prevClose = klines1d.length >= 2 ? klines1d[klines1d.length - 2].close : klines60m[0].close;

      return res.status(200).json({
        ok: true,
        source: 'Vercel 後端直連 (WTXP& 真實60分K+日K)',
        updatedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
        lastPrice: latest.close,
        prevClose,
        dayHigh,
        dayLow,
        klines60m: klines60m.slice(-32),
        klines1d: klines1d.slice(-28)
      });
    }
    throw new Error('Empty cnyes data');
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
