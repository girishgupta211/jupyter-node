// This is a custom.js file for Jupyter notebook

// This code will be executed when the notebook is loaded
$(document).ready(function () {
    // Log a message to the console
    console.log("Jupyter notebook has loaded custom.js");

    // Add a hidden textarea to the notebook container
    $("#notebook-container").append('<textarea style="display: none" id="custom-textarea" />');

    // Disable pointer events for the notebook name and the IPython notebook
    $("#notebook_name, #ipython_notebook").css("pointer-events", "none");

    // var inactivityTimer;
    // // var longRunningTimer;
    // var inactivityAlertTime = 60000; // Time in milliseconds, 60000ms = 1 minute
    // // var longRunningAlertTime = 200000; // Time in milliseconds, 200000ms = 2 minutes

    // // Reset the timers whenever there's activity in the notebook
    // $(document).on('mousemove keypress', function () {
    //     clearTimeout(inactivityTimer);
    //     lastActivityTime = Date.now();
    //     inactivityTimer = setTimeout(function () {
    //         // Check if a code cell is executing
    //         if (Jupyter.notebook.kernel_busy) {
    //             console.log("Code cell is executing");
    //             return;
    //         }

    //         // Calculate the idle time
    //         var idleTime = Date.now() - lastActivityTime;

    //         // Alert the user
    //         alert("No activity detected in the Jupyter notebook for " + (idleTime / 1000) + " seconds");

    //         // Log a message to the console
    //         console.log("No activity in Jupyter notebook");

    //         // Send a message to the parent window
    //         if (window.parent) {
    //             window.parent.postMessage("No activity in Jupyter notebook for " + (idleTime / 1000) + " seconds", "*");
    //         }
    //     }, inactivityAlertTime);

    //     // longRunningTimer = setTimeout(function () {
    //     //     // Alert the user
    //     //     alert("A code cell has been running for 2 minutes");

    //     //     // Log a message to the console
    //     //     console.log("Long running code cell in Jupyter notebook");

    //     //     // Send a message to the parent window
    //     //     if (window.parent) {
    //     //         window.parent.postMessage("Long running code cell in Jupyter notebook", "*");
    //     //     }
    //     // }, longRunningAlertTime);

    // });
    var inactivityTimer;
    var lastActivityTime = Date.now();
    var inactivityAlertTime = 60000; // Time in milliseconds, 60000ms = 1 minute

    // Reset the timer and update the last activity time whenever there's activity in the notebook
    $(document).on('mousemove keypress', function () {
        clearTimeout(inactivityTimer);
        lastActivityTime = Date.now();
        inactivityTimer = setTimeout(function () {
            // Check if a code cell is executing
            if (Jupyter.notebook.kernel_busy) {
                console.log("Code cell is executing");
                return;
            }

            // Calculate the idle time
            var idleTime = Date.now() - lastActivityTime;

            // Alert the user
            alert("No activity detected in the Jupyter notebook for " + (idleTime / 1000) + " seconds");

            // Log a message to the console
            console.log("No activity in Jupyter notebook");

            // Send a message to the parent window
            if (window.parent) {
                window.parent.postMessage("No activity in Jupyter notebook for " + (idleTime / 1000) + " seconds", "*");
            }
        }, inactivityAlertTime);

        // Send the last activity time to the parent window
        if (window.parent) {
            window.parent.postMessage("Last activity time: " + lastActivityTime, "*");
        }
    });

});
