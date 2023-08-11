function generateName() {
    var start = [
        'flying',
        'blue',
        'pink',
        'jumping',
        'invisible',
        'red',
        'dancing',
        'running',
        'yellow'
    ];
    var end = [
        'Tangerine',
        'Orange',
        'Helicopter',
        'Snake',
        'Toad',
        'Ninja',
        'Goose',
        'Banana',
        'Duck'
    ];
    var ending = start[Math.floor(Math.random() * start.length)] + end[Math.floor(Math.random() * end.length)] + Math.round(Math.random() * 100);
    return ending;
}
function pickColor() {
    var colors = [
        "red",
        "orange",
        "green",
        "blue",
        "purple",
        "white",
        "lightgreen",
        "yellow",
        "pink",
        "coral",
        "lightblue",
        "deepskyblue",
        "greenyellow",
        "darkorange"
    ]
    return colors[Math.floor(Math.random() * colors.length)];
}
function oddsOf(percent) {
    let odd = percent / 100;
    return (Math.random() < odd)
}
function json2array(json) {
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function (key) {
        var endJSON = json[key];
        endJSON.key = key
        result.push(endJSON);
    });
    return result;
}
function sumArrays(...arrays) {
    const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
    const result = Array.from({ length: n });
    return result.map((_, i) => arrays.map(xs => xs[i] || 0).reduce((sum, x) => sum + x, 0));
}
function manhattanDistance(point1, point2) {
    return Math.abs(point1[0] - point2[0]) + Math.abs(point1[1] - point2[1]);
}


function directionVector(direction) {
    switch (direction) {
        case "up":
            return [0, -1];
        case "down":
            return [0, 1];
        case "left":
            return [-1, 0];
        case "right":
            return [1, 0];
        default:
            throw new Error(`Invalid direction: ${direction}`);
    }
}
function generateAPIKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = '';

    for (let i = 0; i < 32; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        apiKey += characters.charAt(randomIndex);
    }

    return apiKey;
}
function rand(digits) {
    return Math.floor(Math.random() * parseInt('8' + '9'.repeat(digits - 1)) + parseInt('1' + '0'.repeat(digits - 1)));
}
function isEmptyObject(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// thanks https://bost.ocks.org/mike/shuffle/
function shuffle(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}
function calculateDirectionVector(p1, p2) {
    // Calculate the components of the direction vector
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];

    // Return the direction vector as an array [dx, dy]
    return [dx, dy];
}
const elo = ([...ratings], kFactor = 32, selfRating) => {
    const [a, b] = ratings;
    const expectedScore = (self, opponent) => 1 / (1 + 10 ** ((opponent - self) / 400));
    const newRating = (rating, i) =>
        (selfRating || rating) + kFactor * (i - expectedScore(i ? a : b, i ? b : a));
    if (ratings.length === 2) {
        return [newRating(a, 1), newRating(b, 0)];
    }
    for (let i = 0, len = ratings.length; i < len; i++) {
        let j = i;
        while (j < len - 1) {
            j++;
            [ratings[i], ratings[j]] = elo([ratings[i], ratings[j]], kFactor);
        }
    }
    return ratings;
};
function handleRes(response) {
    if (response.redirect) {
        redirect(response.redirect);
    }
    displayNotif(response.message, response.color);
}
function redirect(to) {
    setTimeout(() => {
        window.location.replace(to) 
    }, 750);
}
function displayNotif(notifText, color) {
    const notification = document.createElement("div");
    notification.innerHTML = notifText || "Something happened...";
    notification.classList.add("notification");
    notification.style.backgroundColor = color || "white";
    notification.style.color = (color) ? "#fff" : "#000";
    if (!color) {
        notification.style.border = "1px solid white; "
    }
    document.getElementById("notif-box").appendChild(notification);

    // Automatically remove the notification after 3 seconds
    setTimeout(function () {
        document.getElementById("notif-box").removeChild(notification);
    }, 3000);
}