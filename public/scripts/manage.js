var newButton = document.getElementById("newTourney");
var createRound = document.getElementById("createRound");
if(newButton){
    //(entry_fee, start_at, max_games_per_day, game_hour_diff, friendlyName)
    newButton.addEventListener("click", async () => {
        var entry_fee = parseInt(prompt("Entry Fee", 5));
        var start_at = parseInt(prompt("Starts at (timestamp) https://www.unixtimestamp.com/"))
        var max_games_per_day = parseInt(prompt("Max games per day", 3));
        var game_hour_diff = parseFloat(prompt("Spacing between games (In hours)", 0.3));
        var friendlyName = prompt("Name of this tourney");
        var res = await fetch("/newTourney", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ entry_fee, start_at, max_games_per_day, game_hour_diff, friendlyName })
        });
        try {
            var data = await res.json();
            handleCreateTourney(data);
        } catch (err) {
            displayNotif(err.message, "red")
            console.error('Error:', err);
        }

    });
}
if(createRound){
    createRound.addEventListener("click", async () => {
        var uid = window.tourneyUID;
        var start_at = parseInt(prompt("Starts at (timestamp) https://www.unixtimestamp.com/"));

        var res = await fetch("/newRound", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uid, start_at})
        });
        try {
            var data = await res.json();
            handleCreateRound(data);
        } catch (err) {
            displayNotif(err.message, "red")
            console.error('Error:', err);
        }
    })
}
function handleCreateRound(data) {
    console.log(data);
    if (data.error) return displayNotif(data.message, "red");
    var uid = data.data.uid
    displayNotif("Round " + uid + " created", "green")
}
function handleCreateTourney(data) {
    // { error: true, message: error.message }

    // { data, uid: tourney.uid }
    if (data.error) return displayNotif(data.message, "red");
    displayNotif("Tourney " + data.uid + " created", "green")
}

