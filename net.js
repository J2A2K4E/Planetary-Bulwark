export async function initNet() {
// telemetry example
try {
await fetch('/api/telemetry', {
method: 'POST',
headers: {'Content-Type':'application/json'},
body: JSON.stringify({ event: 'client_start', ua: navigator.userAgent })
});
} catch (e) {
console.warn('telemetry failed', e);
}

// WebSocket optional
try {
const ws = new WebSocket((location.protocol==='https:'?'wss':'ws')+'://'+location.host);
ws.onopen = ()=> ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
ws.onmessage = (e)=> {
const msg = JSON.parse(e.data);
if (msg.type==='pong') {
// console.log('RTT', Date.now()-msg.t);
}
};
window._ws = ws;
} catch (e) {
console.warn('ws failed', e);
}
}
