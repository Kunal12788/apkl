async function checkLiveCode() {
  try {
    const htmlRes = await fetch('https://apkl.vercel.app/');
    const htmlText = await htmlRes.text();
    console.log("HTML fetched. Searching for script tags...");
    
    // Find the main JS file in the HTML (Vite format: /assets/index-XXXX.js)
    const match = htmlText.match(/src="\/assets\/index-[a-zA-Z0-9_-]+\.js"/);
    if (!match) {
      console.log("Could not find index.js in HTML.");
      return;
    }
    
    const scriptPath = match[0].split('"')[1];
    const scriptUrl = `https://apkl.vercel.app${scriptPath}`;
    console.log("Fetching script from:", scriptUrl);
    
    const jsRes = await fetch(scriptUrl);
    const jsText = await jsRes.text();
    
    console.log("Checking for specific strings in Vercel script...");
    console.log("Contains 'externalUserId.set(string)'?", jsText.includes("externalUserId.set(string)"));
    console.log("Contains 'gonative://onesignal/externalUserId/set'?", jsText.includes("gonative://onesignal/externalUserId/set"));
    console.log("Contains 'OneSignal Info:'?", jsText.includes("OneSignal Info:"));
    
  } catch (err) {
    console.error("Error:", err);
  }
}

checkLiveCode();
