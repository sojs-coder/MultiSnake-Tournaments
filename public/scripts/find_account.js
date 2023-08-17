function handleSubmit(){
    var emailInput = document.querySelector(".username");
    if(emailInput.value.trim().length <= 0) {displayNotif("Email is required to connect your multisnake account"); return;}
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
      <div class="result-elo">${user.elo | "400"}</div>
      <div class="result-age">Born in ${user.yearBorn}</div>
      <button class="connect-button">
          <div class="connect-account">Connect Account</div>
      </button>`
    }
    document.querySelector(".results").innerHTML = template;
    document.querySelector(".connect-account").addEventListener("click",()=>{
      var emailInput = document.querySelector(".username");
      if(emailInput.value.trim().length <= 0) {displayNotif("Email is required to connect your multisnake account"); return;}

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
        .then((data)=>{
          handleRes({ ...data, redirect: "/login"})
        })
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