// Generate a random name by combining a random start word with a random end word and a random number
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
function mdy(time){
    var date = new Date(time);
    var string = `${date.getMonth()}.${date.getDate()}.${date.getFullYear()}`
    return string
}
function hm(timestamp){
    var time = new Date(timestamp);
    return time.getHours() + ":" + time.getMinutes();
}
function timebetween(t1,t2){
    var difference = t2-t1;
    var day = 1000*60*60*24;
    var hour = day/24;
    var minute = hour/60;
    var second = minute/60;
    var millisecond = second/1000;

    var days = Math.floor(difference/day);
    difference -= days * day;
    var hours = Math.floor(difference/hour);
    difference -= hours * hour;
    var minutes = Math.floor(difference/minute);
    difference -= minutes * minute;
    var seconds = Math.floor(difference/second);
    difference -= seconds * second;

    return [days, hours, minutes, seconds]
}
// Pick a random color from a predefined array
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

// Return true with a given probability (percentage)
function oddsOf(percent) {
    let odd = percent / 100;
    return (Math.random() < odd)
}

// Convert a JSON object to an array of objects with added keys
function json2array(json) {
    var result = [];
    var keys = Object.keys(json);
    keys.forEach(function (key) {
        var endJSON = json[key];
        endJSON.key = key;
        result.push(endJSON);
    });
    return result;
}

// Sum arrays element-wise
function sumArrays(...arrays) {
    const n = arrays.reduce((max, xs) => Math.max(max, xs.length), 0);
    const result = Array.from({ length: n });
    return result.map((_, i) => arrays.map(xs => xs[i] || 0).reduce((sum, x) => sum + x, 0));
}

// Calculate Manhattan distance between two points
function manhattanDistance(point1, point2) {
    return Math.abs(point1[0] - point2[0]) + Math.abs(point1[1] - point2[1]);
}

// Get a direction vector based on a direction string
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

// Generate a random API key
function generateAPIKey() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = '';

    for (let i = 0; i < 32; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        apiKey += characters.charAt(randomIndex);
    }

    return apiKey;
}

// Generate a random number with a given number of digits
function rand(digits) {
    return Math.floor(Math.random() * parseInt('8' + '9'.repeat(digits - 1)) + parseInt('1' + '0'.repeat(digits - 1)));
}

// Check if an object is empty
function isEmptyObject(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// Shuffle an array using the Fisher-Yates shuffle algorithm
function shuffle(array) {
    var m = array.length, t, i;

    while (m) {
        i = Math.floor(Math.random() * m--);
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

// Calculate the Elo rating for a match
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

// Handle a response object by redirecting or displaying a notification
function handleRes(response) {
    if (response.redirect) {
        redirect(response.redirect);
    }
    displayNotif(response.message, response.color);
}

// Redirect to a given URL after a delay
function redirect(to) {
    setTimeout(() => {
        window.location.replace(to)
    }, 750);
}

// Convert a UNIX timestamp to a human-readable date string
function convertToHuman(timestamp) {
    var dateObj = new Date(timestamp);
    var format = "MM/DD/YY @ HH:MM";

    var month = dateObj.getMonth() + 1;
    var day = dateObj.getDate();
    var year = dateObj.getFullYear();
    var hours = dateObj.getHours();
    var minutes = dateObj.getMinutes();

    if (hours > 12) {
        hours -= 12;
    }
    if (minutes < 10) {
        minutes = '0' + minutes;
    }

    var dateString = format
        .replace("MM", month)
        .replace("DD", day)
        .replace("YY", year)
        .replace("HH", hours)
        .replace("MM", minutes);

    return dateString;
}
function getTimeDifference(timestamp) {
  const now = Date.now();
  const difference = timestamp - now;

  if (difference <= 0) {
    return "Date passed";
  }

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months >= 1) {
    return `In ${months} months`;
  } else if (weeks >= 1) {
    return `In ${weeks} weeks`;
  } else if (days >= 1) {
    return `In ${days} days`;
  } else if (hours >= 1) {
    return `In ${hours} hours`;
  } else if (minutes >= 1) {
    return `In ${minutes} minutes`;
  } else {
    return `In ${seconds} seconds`;
  }
}


// Display a notification message with optional color
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

    setTimeout(function () {
        document.getElementById("notif-box").removeChild(notification);
    }, 3000);
}
