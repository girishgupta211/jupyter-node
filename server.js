const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const app = express();
const { exec } = require('child_process');
const { spawn } = require('child_process');

const port = 3015;

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Write an API to get notebook file and dataset file from request and run the notebook server using the dataset file and notebook file
app.post('/run-notebook', upload.any(), (req, res) => {
    let notebookFile;
    let datasetFile;

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].fieldname === 'notebookFile') {
            notebookFile = req.files[i];
        } else if (req.files[i].fieldname === 'datasetFile') {
            datasetFile = req.files[i];
        }
    }

    console.log('Notebook File:', notebookFile);
    console.log('Dataset File:', datasetFile);

    // console.log('Running the Jupyter notebook server...');

    console.log('Running the Jupyter notebook server...');
    const notebookServer = spawn('jupyter', ['notebook', '--port=8888', `--NotebookApp.notebook_dir='/'`, `--NotebookApp.default_url=/notebooks/${notebookFile.path}`]);

    notebookServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    notebookServer.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    notebookServer.on('error', (error) => {
        console.error(`Failed to start Jupyter notebook server: ${error.message}`);
        res.status(500).json({ status: 'Error', message: error.message });
    });

    notebookServer.on('close', (code) => {
        console.log(`Jupyter notebook server exited with code ${code}`);
    });

    // try {
    //     // Launch a jupyter notebook server
    //     exec(`jupyter notebook --port=8888 --NotebookApp.notebook_dir='/' --NotebookApp.default_url=/notebooks/${notebookFile.path}`, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Failed to start Jupyter notebook server: ${error.message}`);
    //             res.status(500).json({ status: 'Error', message: error.message });
    //             return;
    //         }
    //         if (stderr) {
    //             console.log(`stderr: ${stderr}`);
    //             return;
    //         }
    //         console.log(`stdout: ${stdout}`);


    //         // Print the URL to access the Jupyter notebook
    //         console.log(`URL to access the Jupyter notebook: http://localhost:8888/notebooks/${notebookFile.path}`);

    //         res.json({ status: 'OK' });
    //     });
    // }
    // catch (error) {
    //     console.error(`Failed to start Jupyter notebook server: ${error.message}`);
    //     res.status(500).json({ status: 'Error', message: error.message });
    //     return;
    // }


});


app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
