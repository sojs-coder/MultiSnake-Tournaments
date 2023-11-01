// Fetches the payment intent status after payment submission
try {
    const stripe = Stripe("pk_test_51NgCKlD26sImJXmki57nywOZ4grWg3jp29GgJlH2U4iClxnjLNi2ESyZSCYsQ1QKauN127qgvETzEqGi9DdiaKw700LI6BC8ML");

    async function checkStatus() {
        const clientSecret = new URLSearchParams(window.location.search).get(
            "payment_intent_client_secret"
        );

        if (!clientSecret) {
            return false;
        }

        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

        switch (paymentIntent.status) {
            case "succeeded":
                return "Payment succeeded!";
                break;
            case "processing":
                return "Your payment is processing.";
                break;
            case "requires_payment_method":
                return "Your payment was not successful, please try again.";
                break;
            default:
                return "Something went wrong.";
                break;
        }
    }
    checkStatus().then(data=>{
        if(data) displayNotif(data);
    });
} catch (err) {
    alert(err)
}