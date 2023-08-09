function handleSubmit(){
    var emailInput = document.querySelector(".username");

    const email = emailInput.value;


    const requestBody = JSON.stringify({
        email
    });

    fetch('/find_account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requestBody
      }).then(response => response.json())
      .then(customHandleRes)
      .catch(error => {
        displayNotif(error.message,"red")
        console.error('Error:', error);
        // Handle error or show error message
      });
}
function customHandleRes(res){
  var template = ""
    if(res.Count <= 0){
      template = `<div class="result-username">No user under that email</div>`
    }else{
      var user = res.Items[0];
      template = `<div class="result-username">${user.username}</div>
      <div class="result-elo">${user.elo}</div>
      <div class="result-age">Born in ${user.yearBorn}</div>
      <button class="connect-button">
          <div class="connect-account">Connect Account</div>
      </button>`
    }
    document.querySelector(".results").innerHTML = template;
    document.querySelector(".connect-account").addEventListener("click",()=>{
      var emailInput = document.querySelector(".username");

      const email = emailInput.value;
  
  
      const requestBody = JSON.stringify({
          email
      });
  
      fetch('/connect_account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requestBody
        }).then(response => response.json())
        .then(handleRes)
        .catch(error => {
          displayNotif(error.message,"red")
          console.error('Error:', error);
          // Handle error or show error message
        });
    })
}
document.addEventListener("keydown",(e)=>{
    if(e.which == 13){
        handleSubmit();
    }
  });
  document.querySelector('.seek-button').addEventListener('click',handleSubmit)