import http from 'http';

function doRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve({ statusCode: res.statusCode, headers: res.headers, body: data }); });
    });
    req.on('error', (e) => { reject(e); });
    if (postData) req.write(postData);
    req.end();
  });
}

(async () => {
  // Login
  const loginRes = await doRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ email: "test2@columbia.edu", password: "password123" }));
  
  const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];

  // Generate Cover Letter
  const generateRes = await doRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/cover-letters/generate',
    method: 'POST',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  }, JSON.stringify({ company: "Google", role: "Software Engineer", tone: "technical" }));
  
  console.log("Generate Status:", generateRes.statusCode);
  console.log("Generate Body:", generateRes.body);

})();
