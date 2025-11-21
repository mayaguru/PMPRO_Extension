var ServerManager = (function () {
    var serverPid = null;

    function getPythonServerDir() {
        var csInterface = new CSInterface();
        var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        return extPath + "/python_server";
    }

    function startServer() {
        if (serverPid) {
            alert("Server process is tracked as running (PID: " + serverPid + ")");
            return;
        }

        var csInterface = new CSInterface();
        var osInfo = csInterface.getOSInformation();
        var isWindows = osInfo.indexOf("Windows") >= 0;
        var serverDir = getPythonServerDir();

        console.log("Starting server from:", serverDir);

        if (isWindows) {
            // Last try: Run batch file directly with start /b (background)
            var batPath = serverDir.replace(/\//g, "\\") + "\\start_server.bat";
            console.log("Executing batch file:", batPath);

            // Try: cmd.exe /c start /b "" "path\to\batch.bat"
            var res = window.cep.process.createProcess("cmd.exe", "/c", "start", "/b", '""', '"' + batPath + '"');

            if (res.err === 0) {
                serverPid = res.data;
                console.log("Server process initiated");
                alert("Server start command sent!\nCheck if server is running at http://localhost:5000\n\n(Note: May still require manual start if batch file has issues)");
            } else {
                console.error("Failed to start. Error:", res.err);
                alert("Failed to start server. Error code: " + res.err + "\n\nPlease use 'Open Server Folder' button and run start_server.bat manually.");
            }
        } else {
            // Mac: direct execution
            var res = window.cep.process.createProcess("/bin/sh", "-c", "cd '" + serverDir + "' && uv run vr_server.py &");

            if (res.err === 0) {
                serverPid = res.data;
                console.log("Server started with PID: " + serverPid);
                alert("Server started! Check http://localhost:5000");
            } else {
                alert("Failed to start server. Error code: " + res.err);
            }
        }
    }

    function stopServer() {
        if (serverPid) {
            window.cep.process.terminate(serverPid);
            serverPid = null;
            console.log("Server stopped.");
        }
    }

    function openServerFolder() {
        var csInterface = new CSInterface();
        var serverDir = getPythonServerDir();
        var isWindows = csInterface.getOSInformation().indexOf("Windows") >= 0;

        if (isWindows) {
            serverDir = serverDir.replace(/\//g, "\\");
        }

        console.log("Opening folder:", serverDir);

        // Use ExtendScript to open folder
        var jsx = "(function(){" +
            "var folder = new Folder(decodeURIComponent('" + encodeURIComponent(serverDir) + "'));" +
            "if(!folder.exists){return 'missing';}" +
            "try{folder.execute();return 'ok';}catch(e){return e.toString();}" +
            "})();";

        csInterface.evalScript(jsx, function (res) {
            if (res !== "ok") {
                alert("Unable to open folder: " + res);
            }
        });
    }

    return {
        startServer: startServer,
        stopServer: stopServer,
        openServerFolder: openServerFolder,
        isRunning: function () { return !!serverPid; }
    };
})();
