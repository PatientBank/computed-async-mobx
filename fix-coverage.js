var fs = require("fs"),
    path = "built/computedAsync.js",
    prefix = "var __decorate =";

// tell istanbul to ignore TS-generated decorator code 
var src = fs.readFileSync(path, "utf8");
src = src.replace(prefix, "/* istanbul ignore next */\n" + prefix);
fs.writeFileSync(path, src);
