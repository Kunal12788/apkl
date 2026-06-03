async function testAPI() {
  try {
    const res = await fetch('https://apkl.vercel.app/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        userEmail: 'k7574750@gmail.com',
        userName: 'Test User',
        userRole: 'Staff',
        timestamp: new Date().toISOString()
      })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}
testAPI();
