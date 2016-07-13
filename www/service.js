var g_winlose = document.getElementById("winlose");
var g_taunt = document.getElementById("taunt");
var g_rage = document.getElementById("rage");

var worker = new Worker("./poll.js");

worker.addEventListener("message", didReceiveMessage);
worker.postMessage({ type: "reset" });

function didReceiveMessage(e) {
	if (typeof e.data !== "object") return;
	switch (e.data.type) {
		case "update": doUpdate(e.data); break;
	}
}

function doUpdate(m) {
	requestAnimationFrame(function() {
		if (m.data.didUpdate) {
			g_winlose.textContent = String(m.data.win) + " / " + String(m.data.lose);
			g_taunt.textContent = String(m.data.taunt);
			g_rage.textContent = String(m.data.rage);
		}
		worker.postMessage({ type: "didUpdate" });
	});
}
