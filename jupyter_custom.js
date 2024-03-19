$(document).ready(function () {
  console.log("ready123");

  $("#notebook-container").append(
    '<textarea style="display: none" id="cut-clipboard" />'
  );
  $("#notebook_name, #ipython_notebook").css("pointer-events", "none");

  var proctorCounter = 0;

  window.onblur = function () {
    var myMessage;
    myMessage = { message: "child-blur", counter: proctorCounter };
    window.parent.postMessage(myMessage, "*");
  };

  $("body").on("contextmenu", function (e) {
    noRightClick = { message: "no-right-click" };
    window.parent.postMessage(noRightClick, "*");
    return false;
  });

  $("#notebook-container").bind('cut copy', function(e) {
    cutCopyData = window.getSelection().toString();
    console.log('cut/copy', cutCopyData);

    localStorage.setItem('cutCopyClipboardData', cutCopyData);
  });

  $(window).bind("keydown", function (e) {
    if ((e.keyCode == 90) && (e.metaKey || e.ctrlKey)) {
      cutCopyData = localStorage.getItem('cutCopyClipboardData');
      illegalPasteData = localStorage.getItem('illegalPasteItem');

      cell = Jupyter.notebook.get_selected_cell();
      current_cell_text = cell.get_text();

      if (current_cell_text.includes(illegalPasteData)) {
        illegalPaste = { message: 'illegal-paste' };
        old_text = current_cell_text.replace(illegalPasteData, '');
        cell.set_text(old_text);

        console.log(illegalPaste);
        window.parent.postMessage(illegalPaste, '*');
      }
    }
  });

  $("#notebook-container").bind("paste", function (e) {
    var pasteData = e.originalEvent.clipboardData.getData('text')

    cell = Jupyter.notebook.get_selected_cell();
    current_cell_text = cell.get_text();
    pasteData = pasteData.replace(/\r/g, '');
    old_text = current_cell_text.replace(pasteData, '');
    cell.set_text(old_text);

    jupyter_text = Jupyter.notebook.get_cells().map(function(each_cell) {
      return each_cell.get_text()
    }).join('');

    cutCopyData = localStorage.getItem('cutCopyClipboardData');

    if (jupyter_text.includes(pasteData) || pasteData == cutCopyData) {
      cell.set_text(current_cell_text) }
    else {
      illegalPaste = { message: 'illegal-paste' }
      console.log(illegalPaste)
      localStorage.setItem('illegalPasteItem', pasteData);
      window.parent.postMessage(illegalPaste, '*');
    }
  });

  $("#noteqwebook-container").bind("paste", function (e) {
    var pasteData = e.originalEvent.clipboardData.getData("text");

    cell = Jupyter.notebook.get_selected_cell();
    current_cell_text = cell.get_text();
    pasteData = pasteData.replace(/\r/g, "");
    old_text = current_cell_text.replace(pasteData, "");
    cell.set_text(old_text);

    jupyter_text = Jupyter.notebook
      .get_cells()
      .map(function (each_cell) {
        return each_cell.get_text();
      })
      .join("");

    cutData = $("#cut-clipboard").val();

    if (jupyter_text.includes(pasteData) || pasteData == cutData) {
      cell.set_text(current_cell_text);
    } else {
      illegalPaste = { message: "illegal-paste" };
      window.parent.postMessage(illegalPaste, "*");
    }
  });

  function displayMessage(evt) {
    var message;

    if (evt.data.message == "parent-blur") {
      if (!document.hasFocus()) {
        proctorCounter = evt.data.counter;
        proctorCounter = proctorCounter + 1;
        updateCounterMessage = {
          message: "update-parent-counter",
          counter: proctorCounter,
        };
        window.parent.postMessage(updateCounterMessage, "*");
      }
    } else if (evt.data.message == "update-child-counter") {
      proctorCounter = evt.data.counter;

    } else if (evt.data.message == "manual-save-triggered") {
      console.log("manual-save-triggered !");
      const timeoutPromiseManualSave = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject("timed out manual save");
        }, 120000);
      });

      const resultManualSave = Promise.race([
        Jupyter.notebook.save_notebook(),
        timeoutPromiseManualSave,
      ]);
      resultManualSave
        .then(function () {
          console.log("manually notebook was saved !");
        })
        .catch(function (error) {
          console.log("manually notebook not saved error!", error);
        });

    } else if (evt.data.message == "submit-btn-clicked") {
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject("timed out");
        }, 120000);
      });

      const result = Promise.race([
        Jupyter.notebook.save_notebook(),
        timeoutPromise,
      ]);
      result
        .then(function () {
          notebookSaved = { message: "notebook-saved" };
          window.parent.postMessage(notebookSaved, "*");
        })
        .catch(function (error) {
          if (error === "timed out") {
            notebookSaved = { message: "notebook-unsaved" };
          } else {
            notebookSaved = { message: "notebook-unsaved" };
          }
          window.parent.postMessage(notebookSaved, "*");
        });
    }
  }

  function sleepFor(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

//  async function saveNotebookFromClient() {
//    while (true) {
//      await sleepFor(60000);
//      $("#save-notbook button").click();
//    }
//  }

//  saveNotebookFromClient();

  if (window.addEventListener) {
    // For standards-compliant web browsers
    window.addEventListener("message", displayMessage, false);
  } else {
    window.attachEvent("onmessage", displayMessage);
  }
});

define(["base/js/namespace", "base/js/promises"], function (Jupyter, promises) {
  promises.notebook_loaded.then(function () {
    console.log("Called...");
    Jupyter.notebook.set_autosave_interval(10000);
  });
});
