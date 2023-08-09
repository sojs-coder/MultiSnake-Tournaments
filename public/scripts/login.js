function hashPassword(password) {
    password = CryptoJS.SHA256(password);
    return password.toString();
}

function handleLogin() {
  
    const emailInput = document.querySelector('input.username');
    const passwordInput = document.querySelector('input.password');

    // Get the values from the inputs
    const email = emailInput.value;
    const password = hashPassword(passwordInput.value);
    // Create the request body
    const requestBody = JSON.stringify({
      email: email,
      password: password
    });
  
    // Send a POST request to the login endpoint
    fetch('/login', {
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
  }
  document.addEventListener("keydown",(e)=>{
    if(e.which == 13){
      handleLogin();
    }
  })
  document.querySelector('.login-button').addEventListener('click',handleLogin)