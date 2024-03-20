// This is a custom.js file for Jupyter notebook

// This code will be executed when the notebook is loaded
$(document).ready(function () {
    // Log a message to the console
    console.log("Jupyter notebook has loaded custom.js");

    // Add a hidden textarea to the notebook container
    $("#notebook-container").append('<textarea style="display: none" id="custom-textarea" />');

    // Disable pointer events for the notebook name and the IPython notebook
    $("#notebook_name, #ipython_notebook").css("pointer-events", "none");

    // Set a timer for inactivity
    var inactivityTimer;
    var inactivityAlertTime = 60000; // Time in milliseconds, 60000ms = 1 minute

    // Reset the timer whenever there's activity in the notebook
    $(document).on('mousemove keypress', function () {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(function () {
            // Alert the user
            alert("No activity detected in the Jupyter notebook for 1 minute");

            // Send a message to the parent window
            if (window.parent) {
                window.parent.postMessage("No activity in Jupyter notebook", "*");
            }
        }, inactivityAlertTime);
    });
    
});
