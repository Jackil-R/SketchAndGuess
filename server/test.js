var timeout = setTimeout(function() {}, 3600 * 1000);

setInterval(function() {
    console.log('Time left: '+getTimeLeft(timeout)+'s');
}, 2000);

function getTimeLeft(timeout) {
    return Math.ceil((timeout._idleStart + timeout._idleTimeout - Date.now()) / 1000);
}

