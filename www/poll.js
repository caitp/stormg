var g_polling = false;
var g_pollError = 0;
self.addEventListener("message", didReceiveMessage);

setInterval(function() {
	var json = {};
	if (g_didReset) {
		g_didReset = false;
		json.reset = true;
	}
	if (g_polling) {
		if (++g_pollError < 10) return;
		g_pollError = 0;
	}
	g_polling = true;
	var toSend = JSON.stringify(json);
	var req = new XMLHttpRequest();
	req.responseType = 'json';
	req.open("POST", "status.json");
	req.addEventListener("load", update);
	req.addEventListener("error", fail);
	req.setRequestHeader("Content-Type", "application/json");
	req.send(toSend);
}, 1000);

function update(e) {
	self.postMessage({ type: "update", data: e.target.response });
}

function fail(e) {
	g_polling = false;
}

function didUpdate(e) {
	g_polling = false;
}

function reset(e) {
	g_polling = false;
	g_pollError = 0;
	g_didReset = true;
}

function didReceiveMessage(e) {
	if (typeof e.data !== "object") return;
	switch (e.data.type) {
		case "didUpdate": didUpdate(e); break;
		case "reset": reset(e);
	}
}
