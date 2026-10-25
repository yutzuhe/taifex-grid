// 檔案路徑：api/quote.js (部署於 Vercel 免費 Serverless Function)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.query.token || process.env.FINMIND_TOKEN || '';

  try {
    // 1. 先抓取鉅亨網台指期近全 (含夜盤 WTXP&) 60分K連續資料
    const cnyesRes = await fetch(
      'https://ws.api.cnyes.com/ws/api/v1/charting/history?symbol=FUTURES:TXF1:FUTURES&resolution=60'
    );
    const cnyesJson = await cnyesRes.json();

    // 2. 同時抓取 FinMind 台灣期交所台指期 (TX) 日夜盤歷史日K資料
    const startDate = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    const fmUrl = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanFuturesDaily&data_id=TX&start_date=${startDate}${token ? `&token=${token}` : ''}`;
    const fmRes = await fetch(fmUrl);
    const fmJson = await fmRes.json();

    return res.status(200).json({
      ok: true,
      source: 'Vercel Serverless (WTXP& 60m + FinMind TX 1D)',
      cnyes60m: cnyesJson?.data || null,
      finmindDaily: fmJson?.data || null
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
