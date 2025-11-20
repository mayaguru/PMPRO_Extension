/**
 * Render active sequence using preset/output from flow_config.json
 * - renderPreset: path to .epr
 * - renderOutput: folder path
 * Output file name: <sequence name>.mp4 (or .mov if preset matches)
 */
(function(){
    function loadConfig(){
        try{
            var scriptFile = new File($.fileName); // .../jsx/custom/10_RenderSelected.jsx
            var panelRoot = scriptFile.parent.parent.parent; // .../AmazePanel
            if(!panelRoot) return null;
            var cfg = new File(panelRoot.fullName + "/flow_config.json");
            if(cfg.exists){
                cfg.encoding = "UTF-8";
                if(cfg.open("r")){
                    var txt = cfg.read();
                    cfg.close();
                    try { return JSON.parse(txt); } catch(eJSON){ return null; }
                }
            }
        }catch(e){ }
        return null;
    }

    try{
        if(!app.project || !app.project.activeSequence){
            alert("No active sequence.");
            return;
        }
        var cfg = loadConfig();
        if(!cfg || !cfg.renderPreset){
            alert("Render preset not set. Pick .epr in panel Render section.");
            return;
        }
        if(!cfg.renderOutput){
            alert("Render output folder not set. Pick output folder in panel Render section.");
            return;
        }
        var presetPath = cfg.renderPreset;
        var outDir = cfg.renderOutput;

        var presetFile = new File(presetPath);
        if(!presetFile.exists){
            alert("Preset does not exist:\n" + presetPath);
            return;
        }
        var outFolder = new Folder(outDir);
        if(!outFolder.exists){
            alert("Output folder does not exist:\n" + outDir);
            return;
        }

        var seq = app.project.activeSequence;
        var baseName = seq.name || "sequence";
        var ext = ".mp4";
        if(/mov/i.test(presetPath)) ext = ".mov";
        var outFile = new File(outFolder.fsName + "/" + baseName + ext);
        var outPath = outFile.fsName; // normalize separators

        if(!app.encoder){
            alert("Encoder object not available.");
            return;
        }
        app.encoder.launchEncoder();
        // use workarea; remove from queue upon success
        var removeFromQueueUponSuccess = 1;
        var jobID = app.encoder.encodeSequence(seq, outPath, presetFile.fsName, app.encoder.ENCODE_WORKAREA, removeFromQueueUponSuccess);
        $.writeln("Render job queued: " + jobID + " -> " + outPath);
        alert("Queued render in AME:\n" + outPath + "\nPreset:\n" + presetPath);
    }catch(e){
        alert("Render failed: " + e + "\nLine: " + (e.line||"?"));
    }
})();
