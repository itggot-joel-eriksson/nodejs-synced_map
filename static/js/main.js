var socket = io({secure: true}),
    map,
    lat,
    lng,
    id,
    geoloc,
    watching = false,
    initialized = false,
    markers = {};

// Watch current geolocation
function getGeoLoc() {
    if (navigator.geolocation) {
        geoloc = navigator.geolocation.watchPosition(function(pos) {
            watching = true;
        	lat = pos.coords.latitude;
        	lng = pos.coords.longitude;

            socket.emit("coords", {lat: lat, lng: lng});

            initialize(lat, lng);
        }, function(error) {
            console.warn("Error (" + error.code + "): " + error.message + "");
        }, {
            enableHighAccuracy: true
        });
    } else {
        initialize(0, 0, 3);
        socket.emit("get_markers");
    }
}

// Add a marker to the map
function addMarker(marker_id, lat, lng) {
    markers[marker_id] ={};

    var location = new google.maps.LatLng(lat, lng);

    if (marker_id === id) {
        markers[marker_id] = new google.maps.Marker({
            position: location,
            animation: google.maps.Animation.BOUNCE
        });
    } else {
        markers[marker_id] = new google.maps.Marker({
            position: location,
            animation: google.maps.Animation.DROP
        });
    }

    markers[marker_id].setMap(map);
}

// Remove a marker from the map
function removeMarker(marker_id) {
    markers[marker_id].setMap(null);
}

// Move a marker that is on the map
function moveMarker(marker_id, lat, lng) {
    if (lat !== markers[marker_id].getPosition().lat() && lng !== markers[marker_id].getPosition().lng()) {
        var location = new google.maps.LatLng(lat, lng);

        if (marker_id === id) {
            markers[marker_id].setAnimation(google.maps.Animation.BOUNCE);
            map.setCenter(location);
        } else {
            markers[marker_id].setAnimation(google.maps.Animation.DROP);
        }
        markers[marker_id].setPosition(location);
    }
}

// Initialize the map
function initialize(lat_alt, lng_alt, zoom) {
    if (initialized) return;

    initialized = true;

    var mapCenter = new google.maps.LatLng(lat_alt || lat, lng_alt || lng),
        mapProp = {
            center: mapCenter,
            zoom: zoom || 15,
            minZoom: 3,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false
        };

	map = new google.maps.Map($("#map").get(0), mapProp);
}

$(document).ready(function() {
    // Make sure that the height of the map is maxed out
    $("#map").height($(window).height() - 25);
    $(window).resize(function(event) {
        $("#map").height($(window).height() - 25);
    });

    // When connect event is received initialize map and start watching for geolocation
    socket.on("connect", function() {
        getGeoLoc();
    });

    // When reconnect event is received start watching for geolocation
    socket.on("reconnect", function(data) {
        getGeoLoc();
    });

    // When disconnect event is received remove all markers and stop watching for geolocation
    socket.on("disconnect", function() {
        if (watching) {
            navigator.geolocation.clearWatch(geoloc);
        }

        $.each(markers, function(current, marker) {
            removeMarker(current);
            delete markers[current];
        });
    });

    // When color event is received change background-color of #color
    socket.on("color", function(data) {
        $("#color").css("background-color", data);
    });

    // When set_marker event is received add a marker or move an existing one
    socket.on("set_marker", function(data) {
        if (markers.hasOwnProperty(data.id)) {
            moveMarker(data.id, data.lat, data.lng);
        } else {
            addMarker(data.id, data.lat, data.lng);
        }
    });

    // When remove_marker event is received remove a marker
    socket.on("remove_marker", function(data) {
        removeMarker(data);
        delete markers[data];
    });

    // When markers event is received add markers to the map that were there before you joined
    socket.on("markers", function(data) {
        $.each(data, function(current, marker) {
            if (typeof markers[current] !== "object") {
                // markers[current] = {};
                addMarker(current, marker.lat, marker.lng);
            }
        });
    });

    // When id event is received you will get to kow your UID which is used for your marker
    socket.on("id", function(data) {
        id = data;
    });
});
