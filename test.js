const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('https://script.google.com/macros/s/AKfycbzErkVjCuNiLOyTt8JMe0EecsBA-ukzS47n01U5w18C8NwHVN45njADa52G1brHXv0P/exec', {
      method: "POST"
    });
    console.log(res.status, await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
