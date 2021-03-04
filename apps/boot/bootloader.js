// This runs after a 'fresh' boot. Everything allocated in this file is
// persistent by default, so be mindful!
const holder = {};
holder.evaluateCurrentClockApp = () => {
  const allClockApps = () => (
    require("Storage").list(/\.info$/)
      .map((file) => {
        const app = require("Storage").readJSON(file,1);
        if (app && app.type == "clock") {
          return app;
        }
      })
      .filter((x) => x)
  );
  const clockNotFound = `
    E.showMessage("No Clock Found");
    setWatch(() => {
      Bangle.showLauncher();
    }, BTN2, {repeat:false,edge:"falling"});)
  `;
  const currentClockApp = () => {
    const {clock: clockApp} = require("Storage").readJSON("setting.json",1) || {};
    if (" random" === clockApp) {
      const apps = allClockApps();
      return apps.length > 0
        ? require("Storage").read(apps[Math.floor(Math.random() * apps.length)].src)
        : clockNotFound;
    } else if (clockApp) {
      return require("Storage").read(clockApp);
    }
    // Fallback: first clock app we discover on the system
    const [discoveredApp] = allClockApps().sort((a, b) => a.sortorder - b.sortorder);
    return discoveredApp
      ? require("Storage").read(discoveredApp.src)
      // Fallback: not found
      : `E.showMessage("No Clock Found");
        setWatch(() => {
          Bangle.showLauncher();
        }, BTN2, {repeat:false,edge:"falling"});)
      `;
  };
  delete holder.evaluateCurrentClockApp;
  eval(currentClockApp());
};
// Check to see if our clock is wrong - if it is use GPS time
if ((new Date()).getFullYear()<2000) {
  E.showMessage("Searching for\nGPS time");
  Bangle.on("GPS",function cb(g) {
    Bangle.setGPSPower(0);
    Bangle.removeListener("GPS",cb);
    if (!g.time || (g.time.getFullYear()<2000) ||
       (g.time.getFullYear()>2200)) {
      // GPS receiver's time not set - just boot clock anyway
      holder.evaluateCurrentClockApp();
      return;
    }
    // We have a GPS time. Set time and reboot (to load alarms properly)
    setTime(g.time.getTime()/1000);
    load();
  });
  Bangle.setGPSPower(1);
} else {
  holder.evaluateCurrentClockApp();
}
