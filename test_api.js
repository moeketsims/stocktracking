const http = require('http');

const loginData = JSON.stringify({ email: 'admin@test.com', password: 'Test123!' });
const loginOptions = {
  hostname: 'localhost', port: 3001, path: '/api/auth/login',
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
};

const loginReq = http.request(loginOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const loginResp = JSON.parse(body);
    const token = loginResp.access_token;
    console.log('Token obtained:', token ? 'yes' : 'no');

    const analyticsOptions = {
      hostname: 'localhost', port: 3001, path: '/api/analytics?period_days=30',
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    };

    const analyticsReq = http.request(analyticsOptions, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        const data = JSON.parse(body2);
        const tb = data.transaction_breakdown || [];
        console.log('transaction_breakdown length:', tb.length);
        if (tb.length > 0) {
          console.log('First item:', JSON.stringify(tb[0]));
          console.log('Last item:', JSON.stringify(tb[tb.length-1]));
          const hasData = tb.some(d => d.received_kg > 0 || d.issued_kg > 0 || d.wasted_kg > 0);
          console.log('Has non-zero data:', hasData);
        } else {
          console.log('Keys in response:', Object.keys(data));
          if (data.detail) console.log('Error detail:', data.detail);
        }
      });
    });
    analyticsReq.end();
  });
});

loginReq.write(loginData);
loginReq.end();
