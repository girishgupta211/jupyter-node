const express = require('express');
const multer = require('multer');
const upload = multer({ dest: '/home/gl_jupyter/test1/' });
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

// app.get('/notebook', (req, res) => {
//     res.send(`
//       <iframe src="http://localhost:8888/notebooks/notebook.ipynb" width="100%" height="500px"></iframe>
//     `);
//   });


app.get('/notebook', (req, res) => {
    // gljpc/notebooks/notebook.ipynb
    const token = req.query.token;
    res.send(`
      <iframe src="http://localhost:8888/gljpc/notebooks/notebook.ipynb?token=${token}" width="100%" height="500px"></iframe>
    `);
});

// Write an API to get notebook file and dataset file from request and run the notebook server using the dataset file and notebook file
app.post('/run-notebook', upload.any(), (req, res) => {
    let notebookFile;
    let datasetFile;

    console.log('Running the ls command using spawn ..');
    const ls = spawn('ls');

    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        console.log(`stderr ls: ${data}`);
    });

    ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    for (let i = 0; i < req.files.length; i++) {
        if (req.files[i].fieldname === 'notebookFile') {
            notebookFile = req.files[i];
        } else if (req.files[i].fieldname === 'datasetFile') {
            datasetFile = req.files[i];
        }
    }

    console.log('Notebook File path:', notebookFile.path);
    console.log('Dataset File path:', datasetFile.path);

    // Copy the dataset file to the /home/gl_jupyter/test1 directory with filename as dataset.csv



    // console.log('Running the Jupyter notebook server...');

    console.log('Running the Jupyter notebook server...');
    // now pass the notebook file path to the jupyter notebook server from /home/gl_jupyter/test1 directory
    // pass the dataset file path to the jupyter notebook server from /home/gl_jupyter/test1 directory



    exec('adduser --disabled-password --gecos "" gl_jupyter', (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);

        exec('cd /home/gl_jupyter/ && mkdir test1 && chown -R gl_jupyter:gl_jupyter test1', (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });
    });


    console.log('Copying the dataset file to /home/gl_jupyter/test1 directory...');
    exec(`cp ${datasetFile.path} /home/gl_jupyter/test1/dataset.csv`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Failed to copy dataset file: ${error.message}`);
            res.status(500).json({ status: 'Error', message: error.message });
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

    // copy the notebook file to /home/gl_jupyter/test1 directory as notebook.ipynb
    console.log('Copying the notebook file to /home/gl_jupyter/test1 directory...');
    exec(`cp ${notebookFile.path} /home/gl_jupyter/test1/notebook.ipynb`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Failed to copy notebook file: ${error.message}`);
            res.status(500).json({ status: 'Error', message: error.message });
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });


    const notebookServer = spawn('jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/home/gl_jupyter/test1'`, `--NotebookApp.default_url=/notebooks/notebook.ipynb`]);

    notebookServerPid = notebookServer.pid;
    console.log(`Jupyter notebook server PID: ${notebookServerPid}`);

    // const notebookServer = spawn('jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/home/gl_jupyter/test1'`, `--NotebookApp.default_url=/notebooks/notebook.ipynb`, `--NotebookApp.tornado_settings='{"headers": {"Content-Security-Policy": "frame-ancestors *"}}'`]);
    // const notebookServer = spawn('jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/home/gl_jupyter/test1'`, `--NotebookApp.default_url=/notebooks/notebook.ipynb`, `--NotebookApp.tornado_settings='{"headers": {"Content-Security-Policy": "frame-ancestors http://localhost:3015"}}'`]);

    // const notebookServer = spawn('jupyter', ['notebook', '--ip=*', '--allow-root', '--port=8888', `--NotebookApp.notebook_dir='/uploads'`, `--NotebookApp.default_url=/notebooks/${notebookFile.path}`]);
    notebookServer.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    notebookServer.stderr.on('data', (data) => {
        console.error(`stderr notebook: ${data}`);
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


app.post('/stop-notebook', (req, res) => {
    if (notebookServer) {
        notebookServer.kill('SIGTERM');
        res.json({ status: 'OK', message: 'Jupyter notebook server stopped' });
    } else {
        res.status(500).json({ status: 'Error', message: 'Jupyter notebook server is not running' });
    }
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
