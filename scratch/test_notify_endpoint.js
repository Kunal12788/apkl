async function testNotify() {
  try {
    const res = await fetch('https://apkl.vercel.app/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'login',
        userId: 'test-user-id-uuid-1234',
        userEmail: 'ssrcreations41@gmail.com',
        userName: 'Kunal Test',
        userRole: 'Staff',
        timestamp: new Date().toISOString()
      })
    });
    
    console.log("Status code:", res.status);
    const data = await res.json();
    console.log("API Response:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

testNotify();
