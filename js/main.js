
var globble = {

  // currently known data
  data:[],

  // select the pages
  transitionSelector:function () {
    var p = document.querySelector('core-animated-pages');
    p.selected = (1+p.selected)  % 2;
  },

  // clear the log database
  clearLog:function (e) {
    var p = document.querySelector('dogger-data');
    p.clear();
  },

  storageGetKey : function  () {
    return 'doggersettings';
  },

  // use local storage to save settings
  storageSave: function() {
    localStorage.setItem(this.storageGetKey(), JSON.stringify(this.settings));
    return this.settings;
  },

  // remove from local storage
  storageRemove: function() {
    localStorage.removeItem(this.storageGetKey());
  },

  // load from local storage
  storageGet: function () {
    var result = localStorage.getItem(this.storageGetKey());
    return result ? JSON.parse(result) : null;
  },

  getDefaultSettings: function () {
    return  {
      webAppId:"AKfycbwdHfkSv0TexxnkRy-WrU3Li1i7HIHUMBilLvseUF0DOLJ2m4nH",
      siloId:"doggerlogger",
      dbId:"mcphercom",
      cacheCommunity:"jesuischarlie",
      appsScriptUrl:"https://script.google.com/macros/s",
      enableDev:false,
      schedule:8618,
      enableToast:true,
      thread:"",
      demoMode:true,
      demoUrl:"https://script.google.com/macros/s/AKfycbzXMv7T_C-d9DnvxHlwlOHRFs1zfO3Rwhp9GXpgj0VDq-ikrQU/exec",
      devAppId:"AKfycbyt2tjcfpec13_KSXPpHN51SL2s1pYQSf0LymO9N5SB"

    }
  },

  makeSettings: function () {
    this.settings = this.storageGet() || this.getDefaultSettings();

    // maybe there's a reset first
    var p = this.getUrlParams();
    if (p.reset) {
      this.settings = this.getDefaultSettings();
      this.storageSave();
    }

    // get the known or default settings
    this.settings = this.storageGet() || this.getDefaultSettings();

    // modify with any url params
    if(this.updateSettingsFromUrl()) this.storageSave();

    return this.settings;
  },

  getUrlParams: function () {
    return window.location.search.substring(1).split("&").reduce (function(p,c) {
      var x = c.split("=");
      p[x[0].toLowerCase()] = x.length > 1 ? x[1] : '';
      return p;
    },{});
  },

  updateSettingsFromUrl: function () {
    var p = this.getUrlParams();
    var settings = this.settings;
    var changed = false;
    Object.keys(settings).forEach(function(k) {
      var uKey = k.toLowerCase();
      if (p.hasOwnProperty(uKey)) {
        changed = true;
        // convert type
        if (typeof settings[k] === "number") {
          settings[k] = new Number (p[uKey])
        }
        else if (typeof settings[k] === "boolean") {
          settings[k] =  p[uKey] && p[uKey] != 'false' && p[uKey] != '0';
        }
        else if (typeof settings[k] === "string" ) {
          settings[k] = p[uKey].toString();
        }
        else {
          // deal with objects? - just ignore
        }
      }
    });
    return changed;
  },

  // when this client started
  started: new Date().getTime(),

  // last time the thread was changed
  threadChangedAt : 0,

  // the settings
  settings:null,

  // set the nuew url
  getUrl: function () {

    var settings = this.settings;
    return settings ?
      settings.appsScriptUrl + "/" +
        (settings.enableDev ? settings.devAppId : settings.webAppId) + "/" +
        (settings.enableDev ? "dev" : "exec") +
        "?cachecommunity=" + encodeURIComponent(settings.cacheCommunity) +
        "&siloid=" + encodeURIComponent(settings.siloId) +
        "&dbid=" + encodeURIComponent(settings.dbId)  +
        "&thread=" + encodeURIComponent(settings.thread) : "";
  },

  // schedule a new retrieval
  schedule : function (doitnow)  {
    var p = document.querySelector('dogger-data');
    p.schedule(globble.data.length,doitnow);
  },

    // schedule a demo
  scheduleDemo : function ()  {
    var p = document.querySelector('dogger-data');
    p.scheduleDemo();
  },

  // when the results need resetting
  changeThread: function () {
    globble.threadChangedAt = new Date().getTime();
    globble.data = [];
    globble.rebind();
  },

  // do a rebind
  rebind: function () {
    var p = document.querySelector('dogger-logger');
    p.updateData(globble.data);
  },

  // do a toast
  toast: function (message) {
    document.querySelector('error-report').show(message);
  },

  urlParam: function (param) {

    return window.location.search.substring(1).split("&").reduce (function(p,c) {
      var x = c.split("=");
      if (x[0].toLowerCase() === param.toLowerCase()) {
        p = x[1];
      }
      return p;
    },null );

  },

  dataLoaded: function(e) {

    // this is the jsonp result
    var result = e.detail[1][0];

    // we expect 4 kinds of results completion
    // a straight clear action=clear
    // a clear asking for a demo to start action=clear&demo=start
    // a query action=query
    // demo is done action=demo
    var url = e.detail[0].url;

    // if this failed
    if (result.handleError < 0) {
      this.toast('jsonp error:' + result.handleError + ":url:" + url );
      throw ('jsonp error:' + JSON.stringify(result) + ":url:" + url);
    }
    else {

      // if this is a clear
      if (result.params.action==="clear") {

        this.toast('cleared log file with ' + url);

        // this could be a pre  demo clear
        if (result.params.demo) {

          // schedule a demo
          this.scheduleDemo();

          // and also start collecting data shortly
          this.schedule();

          this.toast('demo has been asked to start creating log data');
        }
        else {
          // we can get some data now - it was a noral claar
          this.schedule(true);
        }

      }

      // this is a demo has finished - nothing to do except report
      else if (result.params.action === "demo") {
        this.toast('demo has finished generating log data');

      }

      // its a data get that has finished
      else if (result.params.action === "query") {

        // we'll discard anything that was provoked before a thread chang
        var provoke = /provoke=(\d*)/.exec(url);
        if (provoke && provoke.length > 1 && provoke[1] &&
          this.threadChangedAt > new Number(provoke[1])) {
            this.toast ('thread changed - data discarded from '  + url);

        }
        else {

          this.toast(
            'received ' + result.data.length + ' data items ' + ' from ' + url);

          // it was good
          if (result.data.length) {
            this.data.push.apply(globble.data, result.data);
            this.data.sort( function(a,b) {
              return a.dogger.timeStamp - b.dogger.timeStamp;
            });
            this.rebind();
          }

        }

        // schedule another
        this.schedule();

      }
      else {
        this.toast("unknown response type from " + url);
        throw JSON.stringify(result) + "::unknown response type from " + url;
      }

    }

  }


};


globble.makeSettings();
