import http from "http";

http.get({
	socketPath: "/var/run/docker.sock",
	path:       "/events"
}, (req) => {
	req.on("data", (d) => {
		console.log(JSON.parse(String(d)));
	});
});
