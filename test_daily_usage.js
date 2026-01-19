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
    const token = JSON.parse(body).access_token;

    const analyticsOptions = {
      hostname: 'localhost', port: 3001, path: '/api/analytics?period_days=7',
      method: 'GET', headers: { 'Authorization': 'Bearer ' + token }
    };

    const analyticsReq = http.request(analyticsOptions, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        const data = JSON.parse(body2);
        console.log('daily_usage:');
        data.daily_usage.forEach(d => {
          console.log(`  ${d.date}: ${d.bags_used} bags, ${d.kg_used} kg`);
        });
      });
    });
    analyticsReq.end();
  });
});

loginReq.write(loginData);
loginReq.end();
