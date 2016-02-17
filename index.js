var express = require("express"),
    app = require("express")(),
    http = require("http").createServer(app),
    io = require("socket.io").listen(http),
    randomColor = require("randomcolor"),
    uid = require("uid");

var port = process.env.PORT || 8000,
    color = randomColor(),
    markers = {};

app.use(express.static(__dirname + "/static"));

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/views/index.html");
});

// A client connected
io.on("connect", function(socket) {
    var id = uid(10);

    io.emit("color", color);

    socket.emit("id", id);

    // A client asks for markers
    socket.on("get_markers", function() {
        socket.emit("markers", markers);
    });

    // A client sent coordinates
    socket.on("coords", function(data) {
        if (typeof data === "object" && data.lat && data.lng) {
            io.emit("set_marker", {id: id, lat: data.lat, lng: data.lng});
            markers[id] = {lat: data.lat, lng: data.lng};
            socket.emit("markers", markers);
        }
    });

    // A client has disconnected
    socket.on("disconnect", function() {
        if (markers.hasOwnProperty(id)) {
            io.emit("remove_marker", id);
            delete markers[id];
        }
    });
});

// Emit a color every 3 seconds
setInterval(function() {
    color = randomColor();
    io.emit("color", color);
}, 3000);

// Start server
http.listen(port, function() {
    console.log("listening on *:" + port);
});
