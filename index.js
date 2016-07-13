var express = require("express");
var readline = require('readline');
var fs = require('fs');
var path = require('path');
var bodyParser = require("body-parser");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

var g_commandRegexp;
var g_clients = { __proto__: null };
var g_mode;
var g_commands;
var g_commandNames;
function didUpdate(client) {
	return !!g_clients[client] && !!g_clients[client].didUpdate;
}

function didReset(json) {
	return json && Boolean(json.reset);
}

function now() { return Date.now(); }

function updateClient(client, data) {
	if (!g_clients[client]) {
		console.log("> New client " + client);
		g_clients[client] = { __proto__: null };
	}

	var c = g_clients[client];
	c.lastTouched = now();
	var keys = Object.keys(data);
	for (var i = 0; i < keys.length; ++i) {
		var key = keys[i];
		c[key] = data[key];
	}
}

function updateClients(data) {
	var clients = Object.keys(g_clients);
	var keys = Object.keys(data);
	for (var ci = 0; ci < clients.length; ++ci) {
		var clientName = clients[ci];
		var client = g_clients[clientName];
		if (client.lastTouched < now() - 100000) {
			// Prune dead client
			console.log("> Prune dead client");
			delete g_clients[client];
		}
		client.lastTouched = now();
		for (var i = 0; i < keys.length; ++i) {
			var key = keys[i];
			client[key] = data[key];
		}
	}
}

var g_state;
var g_commandCache = { __proto__: null };
var g_commandCacheCount = 0;
var g_commands = { __proto__: null };
var g_history = [];
var g_currentMode = '';

function toCommandString(type) {
	if (type && typeof type === 'string') {
		if (g_commandCache[type] !== 'string') {
			if (++g_commandCacheCount > 100) {
				g_commandCache = { __proto__: null };
				g_commandCacheCount = 1;
			}

			g_commandCache[type] =
				type.
					toLowerCase().
					replace(/[-_\.]([a-z])/g, function(ch) { return ch.toUpperCase(); });
		}
		return g_commandCache[type];
	}
	return '';
}

function getCommand(input) {
	if (!g_commandRegexp)
		g_commandRegexp = RegExp('^/([a-zA-Z\._-]+)(?:\s+(.+))?$');
	var match = g_commandRegexp.exec(input);
	if (!match)
		return { type: 'say', arguments: input };

	var type = match[1];
	if (type === void 0) type = '';
	type = toCommandString(type);

	var arguments = match[2];
	if (arguments === void 0) arguments = '';

	return { type: type, arguments: arguments };
}

rl.on('line', function onLine(input) {
	var cmd = getCommand(input);
	switch (cmd.type) {
		case 'mode': mode(cmd.type, cmd.arguments); break;
		case 'undo': undo(cmd.arguments); break;
		case 'quit': quit(cmd.arguments); break;
		case 'say': break;
		case 'refresh': refresh(); break;
		case 'stats': stats(cmd.arguments); break;
		case 'reset': reset(); break;
		case 'clients': clients(); break;
		default:
			if (cmd.type && g_commands[cmd.type]) {
				switch (g_commands[cmd.type].type) {
				case 'bump':
					// Stat commands increment statistics in the global state
					pushState(cmd.type, 1);
					return;

				default:
					break;
				}
			}
			console.error('> Unknown command `' + cmd.type + '`'); break;
	}
});

function copyState(state) {
  var copiedState = { __proto__: null };
  var keys = Object.keys(state);
  for (var i = 0; i < keys.length; ++i) {
  	var key = keys[i];
  	copiedState[key] = state[key];
  }
  return copiedState;
}

function render(copy) {
	updateClients({ didUpdate: true });
}

function pushState(cmd, count) {
	g_history.push({ cmd: cmd, count: count });
	g_state[cmd] += count;
	if (g_history.length === 10)
		g_history.shift();
	return render(g_state);
}

function stats() {
	var lines = [];
	g_commandNames.forEach(function(name) {
		var command = g_commands[name];
		switch (command.type) {
			case 'bump':
				lines.push("> " + padLeft(command.details, 15) + ": " + g_state[name]);
				break;
		}
	});
	console.log(lines.sort().join("\n"));
}

function undo() {
	if (!g_history.length)
		return;
	var state = g_history[g_history.length - 1];
	state.count = -state.count;
	g_state[state.cmd] += state.count;
	render(g_state);
}

function reset() {
	initializeState(g_mode);
	g_history.length = 0;
	render(g_state);
}

function refresh() {
	render(g_state);
}

function quit() {
	process.exit(0);
}

function clients() {
	var clients = Object.keys(g_clients);
	console.log("> " + clients.length + " client" +
		       (clients.length === 1 ? "" : "s") + " connected");
	for (var i = 0; i < clients.length; ++i) {
		console.log("> - client <" + clients[i] + ">");
	}
}

function addUnique(array, item) {
	if (array.indexOf(item) < 0) array.push(item);
}

function transformCommands(mode, data) {
	var commands = { __proto__: null };

	if (!Array.isArray(data)) return commands;
	data.forEach(function(command) {
		if (typeof command !== "object") return;
		switch (command.type) {
			case "bump":
				if (Array.isArray(command.name)) {
					command.name.forEach(function(name) { addBumpCommand(name, name); });
				} else if (typeof command.name === "string") {
					addBumpCommand(command.name, command.details);
				} else if (Array.isArray(command.commands)) {
					command.commands.forEach(function(extra) {
						if (typeof extra === "object")
							addBumpCommand(extra.name, extra.details);
					});
				}
				break;
			default:
				throw new Error("Invalid `type` parameter (" + JSON.stringify(command) + ")");
		}
	});

	return commands;

	function addBumpCommand(name, details) {
		if (typeof name !== 'string')
			throw new Error("Invalid `name` parameter");
		if (typeof details !== "string") details = name;
		var command = {
			__proto__: null,
			name: toCommandString(name),
			details: details,
			type: "bump",
			count: 1
		};
		commands[command.name] = command;
		addUnique(mode.commandNames, command.name);
	}
}

function transformMode(name, data) {
	g_state = { __proto__: null };
	g_history.length = 0;
	var mode = { __proto__: null, commandNames: [] };

	// [[Name]]
	if (typeof data.name === 'string') name = data.name;
	mode.name = name;

	// [[Commands]]
	mode.commands = transformCommands(mode, data.commands);

	return mode;
}

function initializeState(mode) {
	g_state = { __proto__: null };
	mode.commandNames.forEach(function(name) {
		var command = mode.commands[name];
		switch (command.type) {
			case 'bump':
				g_state[name] = 0;
				break;
		}
	});
}

function loadMode(name) {
	return new Promise(function(resolve, reject) {
		var filePath = path.resolve(__dirname, "modes", name + ".json");
		console.log("> Loading file: `" + filePath + "`");
		fs.readFile(filePath, function(error, data) {
			if (error) return reject(error);
			var data;
			try {
				data = JSON.parse(data);
				resolve(transformMode(name, data));
			} catch (e) {
				console.log("Error: " + e);
				return reject(e);
			}
		});
	});
}

var g_modeSwitchInProgress = false;
function mode(newMode, args) {
	if (g_modeSwitchInProgress || newMode === g_currentMode) return;
	g_modeSwitchInProgress = true;
	loadMode(newMode).then(function(mode) {
		console.log("> Mode `" + mode.name + "` loaded");
		g_mode = mode;
		g_commands = mode.commands || [];
		g_commandNames = mode.commandNames;
		g_currentMode = newMode;
		g_modeSwitchInProgress = false;
		initializeState(mode);
	}, function(error) {
		console.error("> Mode switch failed: " + String(errror));
		g_modeSwitchInProgress = false;
	});
}

var app = express();
app.use(bodyParser.json());
app.post("/status.json", function(req, res, next) {
	res.status(200);
	if (!didReset(req.body) && !didUpdate(req.ip)) {
		updateClient(req.ip, { lastTouched: now() });
		return res.json({ didUpdate: false });
	}

	updateClient(req.ip, { didUpdate: false, lastTouched: now() });
	return res.json({
		didUpdate: true,
		win: g_state.win,
		lose: g_state.lose,
		rage: g_state.rage,
		taunt: g_state.taunt
	});
});

app.use(express.static("www"));

app.listen(8080);

// TODO(caitp): allow modes to be switched at runtime, in a useful way
mode("sf3");
g_modeSwitchInProgress = true;

function padLeft(str, maxLength, fillString) {
  if (fillString === undefined) fillString = ' ';
  else {
  	fillString = String(fillString);
  	if (!fillString.length) ch = ' ';
  }

  maxLength = maxLength | 0;

  var fillLength = maxLength - str.length;
  var repetitions = (fillLength / fillString.length) | 0;
  var remainingChars = (fillLength - fillString.length * repetitions) | 0;
  var filler = "";
  while (true) {
    if (repetitions & 1) filler += fillString;
    repetitions >>= 1;
    if (repetitions === 0) break;
    fillString += fillString;
  }
  if (remainingChars) filler += fillString.substr(0, remainingChars);

  return filler + str;
}