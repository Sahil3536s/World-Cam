const axios = require('axios');
const h = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Referer': 'https://www.bseindia.com/',
  'Origin': 'https://www.bseindia.com',
  'Accept': 'application/json',
};

(async () => {
  // Try multiple BSE/NSE endpoints
  const urls = [
    'https://api.bseindia.com/BseIndiaAPI/api/IPOCurrentIPO/w?flag=1',
    'https://api.bseindia.com/BseIndiaAPI/api/IPOCurrentIPO/w?flag=0',
    'https://www.nseindia.com/api/ipo-current-allotment',
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, { headers: h, timeout: 10000 });
      console.log('✅', url);
      console.log('  status:', r.status);
      const data = r.data;
      console.log('  type:', typeof data, Array.isArray(data) ? `len=${data.length}` : '');
      console.log('  sample:', JSON.stringify(data).slice(0, 400));
    } catch(e) {
      console.log('❌', url, '-', e.message, e?.response?.status);
    }
    console.log('---');
  }
})();
