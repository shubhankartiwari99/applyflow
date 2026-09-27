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
  
  console.log("Login Status:", loginRes.statusCode);
  const cookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
  console.log("Cookie:", cookie);

  // Get Portals
  const portalsRes = await doRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/portals',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log("Portals GET:", portalsRes.statusCode, portalsRes.body);

  // Update Portal
  const putRes = await doRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/portals',
    method: 'PUT',
    headers: { 'Cookie': cookie, 'Content-Type': 'application/json' }
  }, JSON.stringify({ portal: "handshake", status: "connected" }));
  console.log("Portals PUT:", putRes.statusCode, putRes.body);

})();
